import { promises as fs } from "node:fs";
import path from "node:path";

const ROUTE_FILE_PATH =
  process.env.LIQUIPEDIA_KEYWORD_ROUTES_FILE ||
  path.resolve(process.cwd(), "keyword-routes.json");

const ALLOWED_TOOLS = new Set([
  "list_categories",
  "get_upcoming_matches",
  "get_live_matches",
  "get_results"
]);

const DEFAULT_ROUTES = [
  {
    id: "default-liquipedia",
    keywords: ["liquipedia"],
    tool: "list_categories",
    args: {},
    enabled: true
  }
];

let routes = [];
let initialized = false;

function normalizeKeyword(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRoute(input) {
  const keywords = Array.isArray(input.keywords)
    ? input.keywords.map(normalizeKeyword).filter(Boolean)
    : [];

  if (!keywords.length) {
    throw new Error("Route must include at least one keyword");
  }

  const tool = String(input.tool || "").trim();
  if (!ALLOWED_TOOLS.has(tool)) {
    throw new Error(`Invalid tool '${tool}'. Allowed: ${Array.from(ALLOWED_TOOLS).join(", ")}`);
  }

  return {
    id: String(input.id || `route-${Date.now()}`),
    keywords,
    tool,
    args: input.args && typeof input.args === "object" ? input.args : {},
    enabled: input.enabled !== false
  };
}

async function ensureRouteFileExists() {
  try {
    await fs.access(ROUTE_FILE_PATH);
  } catch {
    const seed = { routes: DEFAULT_ROUTES };
    await fs.writeFile(ROUTE_FILE_PATH, JSON.stringify(seed, null, 2), "utf8");
  }
}

export async function initKeywordRoutes() {
  if (initialized) return;

  await ensureRouteFileExists();
  const raw = await fs.readFile(ROUTE_FILE_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const fileRoutes = Array.isArray(parsed?.routes) ? parsed.routes : [];

  routes = fileRoutes.map(normalizeRoute);
  initialized = true;
}

export function getRouteFilePath() {
  return ROUTE_FILE_PATH;
}

export function getKeywordRoutes() {
  return routes.map((route) => ({ ...route }));
}

export function matchRoutesByText(text) {
  const normalized = normalizeKeyword(text);
  if (!normalized) return [];

  return routes.filter((route) => {
    if (!route.enabled) return false;
    return route.keywords.some((keyword) => normalized.includes(keyword));
  });
}

export async function upsertKeywordRoute(input, persist = true) {
  const route = normalizeRoute(input);
  const index = routes.findIndex((item) => item.id === route.id);

  if (index >= 0) {
    routes[index] = route;
  } else {
    routes.push(route);
  }

  if (persist) {
    await fs.writeFile(
      ROUTE_FILE_PATH,
      JSON.stringify({ routes }, null, 2),
      "utf8"
    );
  }

  return route;
}

export function isAllowedRouteTool(name) {
  return ALLOWED_TOOLS.has(name);
}
