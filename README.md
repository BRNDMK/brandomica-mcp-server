# Brandomica Lab MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server for checking brand name availability across domains, social handles, trademarks, app stores, and SaaS channels.

Powered by [Brandomica Lab](https://www.brandomica.com).

## Installation

### Remote (no install)

Connect directly via streamable HTTP — no install needed:

```
https://www.brandomica.com/mcp
```

### Claude Code

```bash
claude mcp add brandomica -- npx brandomica-mcp-server
```

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "brandomica": {
      "command": "npx",
      "args": ["brandomica-mcp-server"]
    }
  }
}
```

### Custom API URL

To point at a local dev server or custom deployment:

```json
{
  "mcpServers": {
    "brandomica": {
      "command": "npx",
      "args": ["brandomica-mcp-server"],
      "env": {
        "BRANDOMICA_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `brandomica_check_all` | Full brand check — domains, social, trademarks, app stores, SaaS + score |
| `brandomica_assess_safety` | Fast safety-only output (overall risk, 0-100 safety score, blockers, actions) |
| `brandomica_filing_readiness` | Decision-ready filing summary (verdict, top conflicts by jurisdiction/class, evidence links, confidence gaps) |
| `brandomica_compare_brands` | Compare 2-5 brand names side-by-side (results keep request order + recommendation) |
| `brandomica_brand_report` | Full brand safety report — timestamped evidence document for due diligence |
| `brandomica_check_domains` | Domain availability across 6 TLDs with pricing |
| `brandomica_check_social` | Social handle availability (GitHub, Twitter/X, TikTok, LinkedIn, Instagram) |
| `brandomica_check_trademarks` | Trademark registry search (USPTO, EUIPO) |
| `brandomica_check_appstores` | App Store and Google Play search |
| `brandomica_check_google` | Web presence — Google Search competitor overlap detection |
| `brandomica_check_saas` | Package registry & SaaS availability (npm, PyPI, crates.io, RubyGems, NuGet, Homebrew, Docker Hub, ProductHunt) |
| `brandomica_batch_check` | Check 2-10 brand names in one call, sorted by score |

All tools accept a `brand_name` parameter (lowercase letters, numbers, hyphens). `brandomica_check_all`, `brandomica_assess_safety`, and `brandomica_filing_readiness` also accept an optional `mode` parameter (`quick` or `full`). `brandomica_compare_brands` accepts a `brand_names` array (2-5). `brandomica_batch_check` accepts a `brand_names` array (2-10) and an optional `mode` parameter (`quick` or `full`).

## Examples

### 1. Quick availability check

> "Check if the brand name 'acme' is available"

Claude calls `brandomica_check_all` and returns a structured JSON response with a 0-10 availability score, 0-100 safety score, domain pricing, social handles, trademark conflicts, and more.

### 2. Safety-first flow

> "Assess safety for 'acme' first. If risk is medium or high, run filing readiness in full mode and summarize top conflicts with evidence links."

Claude uses a three-step workflow:
1. `brandomica_assess_safety` for a fast risk decision (overall risk level, 0-100 safety score, blockers, recommended actions)
2. `brandomica_filing_readiness` for decision-grade filing output (verdict, top conflicts by jurisdiction/class, evidence links, confidence gaps)
3. `brandomica_check_all` only when deeper raw evidence is needed

### 3. Batch comparison

> "I'm choosing between 'nexlayer', 'buildkraft', and 'codelaunch' for a developer tool. Compare all three and recommend the safest option."

Claude calls `brandomica_compare_brands` with all three names. Each candidate gets a full availability score and safety assessment. The response includes results in request order plus a recommendation highlighting the highest-scoring candidate.

## Development

```bash
cd mcp-server
npm install
npm run build
node dist/index.js
```

Test with MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Troubleshooting

### "Tools not appearing" in Claude Desktop

- Verify your config file path:
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Validate JSON syntax (trailing commas, missing quotes)
- Restart Claude Desktop after editing config
- Check that `npx brandomica-mcp-server` runs without errors in your terminal

### "Tools not appearing" in Claude Code

```bash
# Verify the server is registered
claude mcp list

# Re-add if missing
claude mcp add brandomica -- npx brandomica-mcp-server
```

### npx hangs or times out

- Clear the npx cache: `npx clear-npx-cache` then retry
- Install globally instead: `npm install -g brandomica-mcp-server` then use `brandomica-mcp-server` as the command (instead of `npx brandomica-mcp-server`)
- Check network connectivity: `npm ping`

### Tool returns an error or empty results

- **Rate limited (429):** The remote endpoint allows 30 requests/minute. Wait 60 seconds and retry.
- **Timeout:** Some checks (domains, trademarks) call external APIs. Transient failures resolve on retry.
- **`null` social handles:** `null` means the platform wasn't indexed by the search provider — it does not mean the handle is available or taken. Only `true`/`false` is definitive.

### Remote endpoint (HTTPS) not responding

- Verify the URL: `https://www.brandomica.com/mcp`
- Check service status: `https://www.brandomica.com/status`
- The remote endpoint uses streamable HTTP transport — ensure your MCP client supports it

### Using a custom API URL

Set `BRANDOMICA_API_URL` to point at a local dev server or custom deployment:

```bash
BRANDOMICA_API_URL=http://localhost:3000 npx brandomica-mcp-server
```

### Debugging with MCP Inspector

```bash
npx @modelcontextprotocol/inspector npx brandomica-mcp-server
```

Opens a browser UI where you can call each tool interactively and inspect JSON responses.

## Support

- [GitHub Issues](https://github.com/BRNDMK/brandomica-mcp-server/issues) — bug reports, feature requests
- Email: [support@brandomica.com](mailto:support@brandomica.com)
- Security vulnerabilities: [security@brandomica.com](mailto:security@brandomica.com) (private reports only)
- Security policy: see [`SECURITY.md`](https://github.com/BRNDMK/Brandomica/blob/main/SECURITY.md) and [`/.well-known/security.txt`](https://www.brandomica.com/.well-known/security.txt)

## License

MIT
