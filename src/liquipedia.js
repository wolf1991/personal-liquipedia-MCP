import * as cheerio from "cheerio";

const BASE_URL = "https://liquipedia.net";
const CACHE_TTL_MS = Number.parseInt(process.env.LIQUIPEDIA_CACHE_TTL_MS || "", 10) || 60_000;
const CACHE_MAX_ENTRIES = Number.parseInt(process.env.LIQUIPEDIA_CACHE_MAX_ENTRIES || "", 10) || 32;
const matchCache = new Map();
const LIQUIPEDIA_HOST = "liquipedia.net";

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toAbsoluteUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
}

function isExternalUrl(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host !== LIQUIPEDIA_HOST && !host.endsWith(`.${LIQUIPEDIA_HOST}`);
  } catch {
    return false;
  }
}

function extractExternalLink(el, $) {
  const candidateAreas = [
    el.find(".match-info-links"),
    el.find(".match-info-footer"),
    el
  ];

  for (const area of candidateAreas) {
    const links = area
      .find("a")
      .map((_, a) => {
        const anchor = $(a);
        const href = anchor.attr("href") || "";
        const label = cleanText(anchor.text());
        if (/watch/i.test(label) || /Special:Stream/i.test(href)) return null;
        return toAbsoluteUrl(href);
      })
      .get()
      .filter(Boolean);

    const external = links.find((url) => isExternalUrl(url));
    if (external) return external;
  }

  return null;
}

function extractTeam($, scope) {
  const anchor = scope.find(".name a, a[title]").first();
  const name = cleanText(anchor.text()) || cleanText(scope.find(".name").first().text()) || null;
  const url = toAbsoluteUrl(anchor.attr("href"));
  return { name, url };
}

function classifyMatch(match) {
  const countdown = (match.countdown || "").toUpperCase();
  if (countdown.includes("LIVE")) return "live";

  const hasNumericScore =
    Number.isInteger(match.score?.team1) && Number.isInteger(match.score?.team2);

  if (hasNumericScore) return "results";
  return "upcoming";
}

function parseMatchCards(html, categoryKey) {
  const $ = cheerio.load(html);
  const cards = [];

  $(".match-info").each((_, element) => {
    const el = $(element);

    const timer = el.find(".timer-object").first();
    const unixTs = Number.parseInt(timer.attr("data-timestamp") || "", 10);
    const datetimeText = cleanText(timer.find(".timer-object-date").first().text()) || null;
    const countdown =
      cleanText(timer.find(".timer-object-countdown-time").first().text()) ||
      cleanText(timer.find(".timer-object-countdown").first().text()) ||
      null;

    const opponents = el.find(".match-info-header-opponent");
    const left = el.find(".match-info-header-opponent-left").first();
    const right = opponents.last();

    const team1 = extractTeam($, left.length ? left : opponents.first());
    const team2 = extractTeam($, right);

    const scores = el
      .find(".match-info-header-scoreholder-score")
      .map((_, node) => cleanText($(node).text()))
      .get()
      .filter(Boolean);

    const bo = cleanText(el.find(".match-info-header-scoreholder-lower").first().text()) || null;

    const tournamentAnchor = el.find(".match-info-tournament a").last();
    const tournament = {
      name:
        cleanText(tournamentAnchor.text()) ||
        cleanText(el.find(".match-info-tournament").first().text()) ||
        null,
      url: toAbsoluteUrl(tournamentAnchor.attr("href"))
    };

    const matchDetailsAnchor = el
      .find("a")
      .filter((_, a) => /match:|view match details|\+\s*add details/i.test(cleanText($(a).text()) + " " + ($(a).attr("href") || "")))
      .first();

    const watchLinks = el
      .find("a")
      .filter((_, a) => /watch/i.test(cleanText($(a).text())) || /Special:Stream/i.test($(a).attr("href") || ""))
      .map((_, a) => ({
        label: cleanText($(a).text()) || "Watch",
        url: toAbsoluteUrl($(a).attr("href"))
      }))
      .get();

    const score = {
      team1: Number.isNaN(Number.parseInt(scores[0], 10)) ? null : Number.parseInt(scores[0], 10),
      team2: Number.isNaN(Number.parseInt(scores[1], 10)) ? null : Number.parseInt(scores[1], 10),
      bestOf: bo
    };

    const match = {
      category: categoryKey,
      status: "upcoming",
      datetime_text: datetimeText,
      scheduled_unix: Number.isFinite(unixTs) ? unixTs : null,
      scheduled_iso: Number.isFinite(unixTs) ? new Date(unixTs * 1000).toISOString() : null,
      countdown,
      team1,
      team2,
      score,
      tournament,
      details_url: toAbsoluteUrl(matchDetailsAnchor.attr("href")),
      external_link: extractExternalLink(el, $),
      watch_links: watchLinks
    };

    if (!team1.name || !team2.name) return;

    match.status = classifyMatch(match);
    cards.push(match);
  });

  return cards;
}

export async function fetchAndParseMatches(categoryKey) {
  const now = Date.now();
  const cached = matchCache.get(categoryKey);
  if (cached && cached.expiresAt > now) {
    return {
      ...cached.value,
      cache: {
        hit: true,
        ttl_ms: CACHE_TTL_MS,
        expires_at: new Date(cached.expiresAt).toISOString()
      }
    };
  }

  const sourceUrl = `${BASE_URL}/${categoryKey}/Liquipedia:Matches`;
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "wikipediaMCP/1.0 (+MCP personal server)",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });

  if (!response.ok) {
    throw new Error(`Liquipedia request failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const matches = parseMatchCards(html, categoryKey);
  const expiresAt = now + CACHE_TTL_MS;
  const value = {
    source_url: sourceUrl,
    fetched_at: new Date().toISOString(),
    total_parsed: matches.length,
    matches,
    cache: {
      hit: false,
      ttl_ms: CACHE_TTL_MS,
      expires_at: new Date(expiresAt).toISOString()
    }
  };

  matchCache.delete(categoryKey);
  matchCache.set(categoryKey, { value, expiresAt });

  if (matchCache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = matchCache.keys().next().value;
    if (oldestKey) matchCache.delete(oldestKey);
  }

  return value;
}

export function getMatchesByStatus(parsed, status, limit = 20) {
  const n = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.trunc(limit))) : 20;
  return parsed.matches.filter((m) => m.status === status).slice(0, n);
}
