#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE =
  process.env.BRANDOMICA_API_URL || "https://www.brandomica.com";

const server = new McpServer(
  {
    name: "brandomica-mcp-server",
    version: "1.0.3",
  },
  {
    instructions:
      "Brandomica Lab — safety-first brand name verification. " +
      "Use brandomica_assess_safety first for a quick risk decision. " +
      "If medium/high risk, run brandomica_filing_readiness for filing details. " +
      "Use brandomica_check_all for full evidence across domains, social, trademarks, app stores, and SaaS. " +
      "Compare candidates with brandomica_compare_brands. " +
      "All tools return structured JSON. Brand names must be lowercase alphanumeric (hyphens allowed).",
  },
);

async function fetchApi(endpoint: string, name: string, extra?: Record<string, string>): Promise<unknown> {
  const params = new URLSearchParams({ name });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
  }
  const url = `${API_BASE}/api/${endpoint}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brandomica API error ${res.status}: ${body}`);
  }
  return res.json();
}

async function fetchApiPost(endpoint: string, body: unknown): Promise<unknown> {
  const url = `${API_BASE}/api/${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Brandomica API error ${res.status}: ${text}`);
  }
  return res.json();
}

// --- Tool: check_all ---

interface DomainResult {
  domain: string;
  available: boolean;
  purchasePrice?: number;
  renewalPrice?: number;
  minimumRegistrationYears?: number;
  provider?: string;
}

interface SocialResult {
  platform: string;
  available: boolean | null;
  url: string;
  method?: "api" | "index" | "manual";
  provider?: string;
}

interface TrademarkResult {
  source: string;
  available: boolean | null;
  count: number;
  url: string;
  method?: string;
  provider?: string;
}

interface AppStoreResult {
  platform: string;
  found: boolean | null;
  results?: string[];
  url?: string;
}

interface SaasResult {
  platform: string;
  available: boolean | null;
  url: string;
}

interface GoogleTopResult {
  title: string;
  url: string;
  snippet?: string;
}

interface GoogleSearchResult {
  platform: string;
  found: boolean | null;
  resultCount?: number;
  topResults?: GoogleTopResult[];
  hasKnowledgeGraph?: boolean;
  provider?: string;
  url: string;
}

interface ScoreResult {
  score: number;
  maxScore: number;
  totalChecks: number;
  confidence: "high" | "medium" | "low";
  decisionGate: "ok" | "insufficient_evidence";
  confidenceNote?: string;
  missingCriticalCategories?: string[];
  breakdown: { label: string }[];
}

interface SafetySignal {
  id: "legal" | "collision" | "impersonation" | "linguistic" | "phonetic" | "coverage";
  label: string;
  risk: "low" | "medium" | "high";
  summary: string;
  evidenceCount: number;
  critical: boolean;
}

interface BrandSafetyAssessment {
  overallRisk: "low" | "medium" | "high";
  safetyScore: number;
  headline: string;
  summary: string;
  blockers: string[];
  unknownCriticalCategories: string[];
  signals: SafetySignal[];
  actions: string[];
}

interface FilingReadinessConflictSummary {
  severity: "high" | "medium" | "low";
  source: string;
  jurisdiction?: string;
  description: string;
  whyItMatters: string;
  evidenceUrl?: string;
  classes?: number[];
}

interface FilingReadinessSummary {
  verdict: "ready" | "caution" | "blocked";
  filingRisk: "go" | "caution" | "stop";
  gateStatus: "ready" | "caution" | "blocked";
  confidence: "high" | "medium" | "low";
  missingCriticalCategories: string[];
  topConflicts: FilingReadinessConflictSummary[];
  actions: string[];
}

interface FilingReadinessResponse {
  name: string;
  mode: "full" | "quick";
  checkedAt: string;
  filingReadiness: FilingReadinessSummary;
}

interface CheckAllResponse {
  name: string;
  domains: DomainResult[];
  social: SocialResult[];
  trademarks: TrademarkResult[];
  appStores: AppStoreResult[];
  saas: SaasResult[];
  google: GoogleSearchResult[];
  score: ScoreResult;
  safety: BrandSafetyAssessment;
  linguistic?: unknown;
  phonetic?: unknown;
  mode: string;
}

interface CompareResponse {
  results: CheckAllResponse[];
  recommendation: string | null;
}

function formatDomains(data: { results: DomainResult[] }): string {
  const lines: string[] = ["## Domain Availability"];
  for (const d of data.results) {
    const status = d.available ? "Available" : "Taken";
    let price = "";
    if (d.available && d.purchasePrice != null && d.renewalPrice != null) {
      const minYears = d.minimumRegistrationYears ?? 1;
      const dueToday = d.purchasePrice + d.renewalPrice * Math.max(0, minYears - 1);
      const tco3 = d.purchasePrice + d.renewalPrice * 2;
      const upfrontNote =
        minYears > 1 ? `, due today $${dueToday} (${minYears}y minimum)` : "";
      price = ` — year 1 $${d.purchasePrice}, renewal $${d.renewalPrice}/yr, 3Y TCO $${tco3}${upfrontNote}`;
    }
    const fallback = d.provider === "WhoisXML" ? " [WhoisXML fallback]" : "";
    lines.push(`- ${d.domain}: ${status}${price}${fallback}`);
  }
  return lines.join("\n");
}

function formatSocial(data: { results: SocialResult[] }): string {
  const lines: string[] = ["## Social Handle Availability"];
  for (const s of data.results) {
    const status =
      s.available === true
        ? "Available"
        : s.available === false
          ? "Taken"
          : "Unknown (check manually)";
    lines.push(`- ${s.platform}: ${status} — ${s.url}`);
  }
  return lines.join("\n");
}

function formatTrademarks(data: { results: TrademarkResult[] }): string {
  const lines: string[] = ["## Trademark Search"];
  for (const t of data.results) {
    const status =
      t.available === true
        ? "Clear"
        : t.available === false
          ? `Found (${t.count} results)`
          : "Check manually";
    const via = t.provider ? ` [via ${t.provider}]` : "";
    lines.push(`- ${t.source}: ${status}${via} — ${t.url}`);
  }
  return lines.join("\n");
}

function formatAppStores(data: { results: AppStoreResult[] }): string {
  const lines: string[] = ["## App Store Search"];
  for (const a of data.results) {
    const status =
      a.found === true
        ? `Found (${a.results?.join(", ") || "matches"})`
        : a.found === false
          ? "Clear"
          : "Unknown (check manually)";
    const url = a.url ? ` — ${a.url}` : "";
    lines.push(`- ${a.platform}: ${status}${url}`);
  }
  return lines.join("\n");
}

function formatSaas(data: { results: SaasResult[] }): string {
  const lines: string[] = ["## Package Registries & SaaS"];
  for (const s of data.results) {
    const status =
      s.available === true
        ? "Available"
        : s.available === false
          ? "Taken"
          : "Unknown (check manually)";
    lines.push(`- ${s.platform}: ${status} — ${s.url}`);
  }
  return lines.join("\n");
}

function formatGoogle(data: { results: GoogleSearchResult[] }): string {
  const lines: string[] = ["## Web Presence (Google Search)"];
  for (const g of data.results) {
    const status =
      g.found === true
        ? `Competitors found${g.resultCount ? ` (${g.resultCount} results)` : ""}`
        : g.found === false
          ? "No competitors found"
          : "Unknown (check manually)";
    const topHits =
      g.found === true && g.topResults?.length
        ? ` — Top: ${g.topResults.map((r) => r.title).join(", ")}`
        : "";
    const kg = g.hasKnowledgeGraph ? " [Knowledge Graph]" : "";
    lines.push(`- ${g.platform}: ${status}${kg}${topHits} — ${g.url}`);
  }
  return lines.join("\n");
}

// --- Register tools ---

const brandNameInput = {
  brand_name: z
    .string()
    .min(1)
    .max(63)
    .regex(
      /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/,
      "Lowercase letters, numbers, and hyphens only (no leading/trailing hyphens)"
    )
    .describe("The brand name to check"),
};

const toolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

server.registerTool(
  "brandomica_check_all",
  {
    title: "Full Brand Check",
    description:
      "Check brand name availability across domains (with pricing), social handles, trademarks, app stores, and SaaS channels. Returns structured JSON with a 0-10 availability score and a 0-100 safety assessment. Use mode='quick' for faster results with fewer checks (domains without pricing, GitHub only, npm only, trademarks, no app stores or web presence).",
    inputSchema: z.object({
      ...brandNameInput,
      mode: z.enum(["full", "quick"]).default("full").describe("Check mode: 'full' runs all checks with pricing, 'quick' runs essential checks only (~3-4 API calls)"),
    }).strict(),
    annotations: toolAnnotations,
  },
  async ({ brand_name, mode }) => {
    const extra = mode && mode !== "full" ? { mode } : undefined;
    const data = (await fetchApi("check-all", brand_name, extra)) as CheckAllResponse;
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data) }],
    };
  }
);

server.registerTool(
  "brandomica_assess_safety",
  {
    title: "Brand Safety Assessment",
    description:
      "Return only the brand safety block for fast agent decisions. Uses the same check pipeline as brandomica_check_all and outputs overall risk, 0-100 safety score, blockers, signal breakdown, and recommended actions.",
    inputSchema: z.object({
      ...brandNameInput,
      mode: z.enum(["full", "quick"]).default("quick").describe("Check mode: 'quick' (default) for faster safety decisions, 'full' for complete evidence coverage"),
    }).strict(),
    annotations: toolAnnotations,
  },
  async ({ brand_name, mode }) => {
    const extra = mode && mode !== "full" ? { mode } : undefined;
    const data = (await fetchApi("check-all", brand_name, extra)) as CheckAllResponse;
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data.safety) }],
    };
  }
);

server.registerTool(
  "brandomica_filing_readiness",
  {
    title: "Filing Readiness Summary",
    description:
      "Return a decision-focused filing readiness block with verdict, filing risk, top conflicts by jurisdiction/class, evidence links, confidence, and missing critical categories.",
    inputSchema: z.object({
      ...brandNameInput,
      mode: z.enum(["full", "quick"]).default("full").describe("Check mode: full (default) for filing decisions, quick for faster directional output"),
    }).strict(),
    annotations: toolAnnotations,
  },
  async ({ brand_name, mode }) => {
    const extra = mode && mode !== "full" ? { mode } : undefined;
    const data = (await fetchApi("filing-readiness", brand_name, extra)) as FilingReadinessResponse;
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data) }],
    };
  }
);

server.registerTool(
  "brandomica_compare_brands",
  {
    title: "Compare Brand Names",
    description:
      "Compare 2-5 brand name candidates side-by-side. Checks each across domains, social handles, trademarks, app stores, and SaaS channels. Returns availability score plus safety assessment per candidate and a highest-scoring recommendation.",
    inputSchema: z.object({
      brand_names: z
        .array(
          z.string().min(1).max(63).regex(
            /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/,
            "Lowercase letters, numbers, and hyphens only"
          )
        )
        .min(2)
        .max(5)
        .describe("Array of 2-5 brand names to compare"),
    }).strict(),
    annotations: toolAnnotations,
  },
  async ({ brand_names }) => {
    const data = (await fetchApiPost("compare-brands", { names: brand_names })) as CompareResponse;
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data) }],
    };
  }
);

server.registerTool(
  "brandomica_brand_report",
  {
    title: "Brand Safety Report",
    description:
      "Generate a comprehensive Brand Safety Report with timestamped evidence for due diligence. Includes availability score, safety assessment, filing readiness, linguistic/phonetic screening, all evidence, domain costs, trademark filing estimates, and limitations. Returns full JSON report.",
    inputSchema: z.object(brandNameInput).strict(),
    annotations: toolAnnotations,
  },
  async ({ brand_name }) => {
    const data = await fetchApi("brand-report", brand_name);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data) }],
    };
  }
);

server.registerTool(
  "brandomica_check_domains",
  {
    title: "Domain Availability",
    description:
      "Check domain availability across 6 TLDs (.com, .io, .co, .app, .dev, .ai) with purchase and renewal pricing.",
    inputSchema: z.object(brandNameInput).strict(),
    annotations: toolAnnotations,
  },
  async ({ brand_name }) => {
    const data = (await fetchApi("check-domains", brand_name)) as {
      results: DomainResult[];
    };
    return {
      content: [{ type: "text" as const, text: formatDomains(data) }],
    };
  }
);

server.registerTool(
  "brandomica_check_social",
  {
    title: "Social Handle Availability",
    description:
      "Check social media handle availability on GitHub, Twitter/X, TikTok, LinkedIn, and Instagram.",
    inputSchema: z.object(brandNameInput).strict(),
    annotations: toolAnnotations,
  },
  async ({ brand_name }) => {
    const data = (await fetchApi("check-social", brand_name)) as {
      results: SocialResult[];
    };
    return {
      content: [{ type: "text" as const, text: formatSocial(data) }],
    };
  }
);

server.registerTool(
  "brandomica_check_trademarks",
  {
    title: "Trademark Search",
    description:
      "Check trademark registries for existing registrations of a brand name. USPTO uses Turso (hosted SQLite FTS5) as the primary provider with local bulk index as legacy fallback; EUIPO returns a manual search link.",
    inputSchema: z.object(brandNameInput).strict(),
    annotations: toolAnnotations,
  },
  async ({ brand_name }) => {
    const data = (await fetchApi("check-trademarks", brand_name)) as {
      results: TrademarkResult[];
    };
    return {
      content: [{ type: "text" as const, text: formatTrademarks(data) }],
    };
  }
);

server.registerTool(
  "brandomica_check_appstores",
  {
    title: "App Store Search",
    description:
      "Search iOS App Store and Google Play for apps matching the brand name.",
    inputSchema: z.object(brandNameInput).strict(),
    annotations: toolAnnotations,
  },
  async ({ brand_name }) => {
    const data = (await fetchApi("check-appstores", brand_name)) as {
      results: AppStoreResult[];
    };
    return {
      content: [{ type: "text" as const, text: formatAppStores(data) }],
    };
  }
);

server.registerTool(
  "brandomica_check_saas",
  {
    title: "Package Registry & SaaS Availability",
    description:
      "Check package name availability across npm, PyPI, crates.io, RubyGems, NuGet, Homebrew, Docker Hub, and ProductHunt.",
    inputSchema: z.object(brandNameInput).strict(),
    annotations: toolAnnotations,
  },
  async ({ brand_name }) => {
    const data = (await fetchApi("check-saas", brand_name)) as {
      results: SaasResult[];
    };
    return {
      content: [{ type: "text" as const, text: formatSaas(data) }],
    };
  }
);

server.registerTool(
  "brandomica_check_google",
  {
    title: "Web Presence (Google Search)",
    description:
      "Search Google for existing companies or products using a brand name. Detects competitor overlap that may not appear in formal registries.",
    inputSchema: z.object(brandNameInput).strict(),
    annotations: toolAnnotations,
  },
  async ({ brand_name }) => {
    const data = (await fetchApi("check-google", brand_name)) as {
      results: GoogleSearchResult[];
    };
    return {
      content: [{ type: "text" as const, text: formatGoogle(data) }],
    };
  }
);

server.registerTool(
  "brandomica_batch_check",
  {
    title: "Batch Brand Check",
    description:
      "Check 2-10 brand names in a single call. Runs checks concurrently and returns results sorted by score descending. Each result includes availability score and safety assessment.",
    inputSchema: z.object({
      brand_names: z
        .array(
          z.string().min(1).max(63).regex(
            /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/,
            "Lowercase letters, numbers, and hyphens only"
          )
        )
        .min(2)
        .max(10)
        .describe("Array of 2-10 brand names to check"),
      mode: z.enum(["full", "quick"]).default("quick").describe("Check mode: 'quick' (default) for speed, 'full' for complete checks"),
    }).strict(),
    annotations: toolAnnotations,
  },
  async ({ brand_names, mode }) => {
    const data = await fetchApiPost("batch-check", { names: brand_names, mode });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data) }],
    };
  }
);

// --- Start server ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Brandomica MCP server running via stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
