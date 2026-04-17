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

export async function initKeywordRoutes() {
  if (initialized) return;
  routes = DEFAULT_ROUTES.map(normalizeRoute);
  initialized = true;
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

export function isAllowedRouteTool(name) {
  return ALLOWED_TOOLS.has(name);
}
