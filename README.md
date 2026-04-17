# personal-liquipedia-MCP

一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的 Liquipedia 赛程查询服务，支持：

- 查询支持的游戏分类
- 查询即将开始（upcoming）比赛
- 查询进行中（live）比赛
- 查询已结束（results）比赛
- 内置轻量内存缓存，降低频繁请求 Liquipedia 的压力

## 1. 安装

```bash
pnpm install
```

## 2. 本地启动（stdio 模式）

```bash
npx --yes liquipedia-mcp
```

> MCP 客户端会通过 stdio 启动这个进程，不需要手动常驻运行。

## 3. MCP 客户端配置示例

优先推荐 `npx` 启动（适合发布到 npm 后直接拉起）。

```json
{
  "mcpServers": {
    "liquipedia": {
      "command": "npx",
      "args": [
        "--yes",
        "liquipedia-mcp"
      ],
      "env": {
        "LIQUIPEDIA_CACHE_TTL_MS": "60000",
        "LIQUIPEDIA_CACHE_MAX_ENTRIES": "32"
      }
    }
  }
}
```

如果你还没发布到 npm，也可以先用本地路径方式（路径改成你的绝对路径）：

```json
{
  "mcpServers": {
    "liquipedia": {
      "command": "npx",
      "args": [
        "--yes",
        "/ABSOLUTE/PATH/personal-liquipedia-MCP"
      ],
      "env": {
        "LIQUIPEDIA_CACHE_TTL_MS": "60000",
        "LIQUIPEDIA_CACHE_MAX_ENTRIES": "32"
      }
    }
  }
}
```

常见客户端（Claude Desktop / Cline / Roo Code / Cherry Studio）都可以使用等价 `mcpServers` 结构。

## 4. 可用工具

- `list_categories`
  - 返回所有可用分类（如 `dota2`、`counterstrike`、`valorant`）
- `get_upcoming_matches`
  - 参数：`category`（必填）, `limit`（可选，默认 20，最大 100）
- `get_live_matches`
  - 参数：`category`（必填）, `limit`（可选，默认 20，最大 100）
- `get_results`
  - 参数：`category`（必填）, `limit`（可选，默认 20，最大 100）
- `get_keyword_routes`
  - 查看当前内置关键词路由表
- `route_by_keywords`
  - 输入一段文本，按关键词路由自动匹配并执行对应工具

## 5. 关键词路由（支持 `liquipedia` 触发）

当前为代码内置固定路由（不会在用户本地生成或写入文件）：

- `liquipedia` -> `list_categories`

调用 `route_by_keywords` 时，传入 `text` 即可触发匹配并执行；`dry_run=true` 可只看命中和计划调用。

## 6. 轻量缓存说明

服务使用**进程内内存缓存**（按 `category` 作为 key）：

- 缓存命中时，直接返回上次抓取并解析的结果
- 默认 TTL：`60_000ms`（60 秒）
- 默认最大缓存条目：`32`
- 超出最大条目时，按插入顺序淘汰最旧条目

可通过环境变量调整：

- `LIQUIPEDIA_CACHE_TTL_MS`：缓存有效期（毫秒）
- `LIQUIPEDIA_CACHE_MAX_ENTRIES`：最大缓存条目数

工具响应中包含 `cache` 字段：

- `cache.hit`：是否命中缓存
- `cache.ttl_ms`：当前 TTL
- `cache.expires_at`：缓存过期时间（ISO）

## 7. 开发

```bash
pnpm start
```
