#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { LIQUIPEDIA_CATEGORIES, assertValidCategory } from "./categories.js";
import { fetchAndParseMatches, getMatchesByStatus } from "./liquipedia.js";
import {
  getKeywordRoutes,
  initKeywordRoutes,
  isAllowedRouteTool,
  matchRoutesByText
} from "./keywordRoutes.js";

const server = new Server(
  {
    name: "liquipedia-personal-mcp",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const TOOL_SCHEMAS = {
  list_categories: {
    name: "list_categories",
    description: "List available Liquipedia category keys and names.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  get_upcoming_matches: {
    name: "get_upcoming_matches",
    description: "Get upcoming matches for a Liquipedia category.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Category key, e.g. dota2, counterstrike, valorant" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 }
      },
      required: ["category"],
      additionalProperties: false
    }
  },
  get_live_matches: {
    name: "get_live_matches",
    description: "Get live matches for a Liquipedia category.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Category key, e.g. dota2, counterstrike, valorant" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 }
      },
      required: ["category"],
      additionalProperties: false
    }
  },
  get_results: {
    name: "get_results",
    description: "Get completed match results for a Liquipedia category.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Category key, e.g. dota2, counterstrike, valorant" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 }
      },
      required: ["category"],
      additionalProperties: false
    }
  },
  get_keyword_routes: {
    name: "get_keyword_routes",
    description: "Get current hardcoded keyword routing table used for Liquipedia tool triggering.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  route_by_keywords: {
    name: "route_by_keywords",
    description:
      "Match input text against keyword routes and execute mapped Liquipedia tools. Useful to trigger by words like 'liquipedia'.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "User text to route, e.g. 'liquipedia dota2 upcoming'" },
        dry_run: { type: "boolean", default: false, description: "Only return matches and planned calls." },
        category: { type: "string", description: "Override category for matched tools requiring category." },
        limit: { type: "integer", minimum: 1, maximum: 100, description: "Override limit for matched tools." }
      },
      required: ["text"],
      additionalProperties: false
    }
  }
};

function asResult(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload
  };
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.values(TOOL_SCHEMAS)
  };
});

async function runLiquipediaTool(name, args) {
  if (name === "list_categories") {
    return {
      total: LIQUIPEDIA_CATEGORIES.length,
      categories: LIQUIPEDIA_CATEGORIES
    };
  }

  if (name === "get_upcoming_matches" || name === "get_live_matches" || name === "get_results") {
    const category = assertValidCategory(args.category);
    const limit = Number.isFinite(args.limit) ? args.limit : 20;
    const parsed = await fetchAndParseMatches(category.key);

    const status =
      name === "get_upcoming_matches"
        ? "upcoming"
        : name === "get_live_matches"
          ? "live"
          : "results";

    const matches = getMatchesByStatus(parsed, status, limit);

    return {
      category,
      status,
      total_returned: matches.length,
      total_parsed_on_page: parsed.total_parsed,
      source_url: parsed.source_url,
      fetched_at: parsed.fetched_at,
      cache: parsed.cache,
      matches
    };
  }

  throw new Error(`Unknown Liquipedia tool: ${name}`);
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params?.name;
  const args = request.params?.arguments || {};

  try {
    if (name === "list_categories" || name === "get_upcoming_matches" || name === "get_live_matches" || name === "get_results") {
      return asResult(await runLiquipediaTool(name, args));
    }

    if (name === "get_keyword_routes") {
      return asResult({
        total: getKeywordRoutes().length,
        routes: getKeywordRoutes()
      });
    }

    if (name === "route_by_keywords") {
      const text = String(args.text || "");
      const matches = matchRoutesByText(text);

      const planned = matches.map((route) => {
        const mergedArgs = {
          ...(route.args || {}),
          ...(args.category ? { category: args.category } : {}),
          ...(Number.isFinite(args.limit) ? { limit: args.limit } : {})
        };

        return {
          route_id: route.id,
          keywords: route.keywords,
          tool: route.tool,
          arguments: mergedArgs
        };
      });

      if (args.dry_run) {
        return asResult({
          text,
          matched_routes: matches.length,
          planned_calls: planned
        });
      }

      const results = [];
      for (const call of planned) {
        if (!isAllowedRouteTool(call.tool)) continue;
        const output = await runLiquipediaTool(call.tool, call.arguments || {});
        results.push({
          route_id: call.route_id,
          tool: call.tool,
          arguments: call.arguments,
          output
        });
      }

      return asResult({
        text,
        matched_routes: matches.length,
        executed_calls: results.length,
        results
      });
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Tool ${name} failed: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
});

async function main() {
  await initKeywordRoutes();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
