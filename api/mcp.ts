// api/mcp.ts
// Endpoint MCP que expone las herramientas del conector a Claude.ai

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod/v4";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  listCampaigns,
  getAccountInsights,
  getCampaignInsights,
} from "../lib/meta-client.js";

function buildServer() {
  const server = new McpServer({
    name: "meta-ads-connector",
    version: "1.0.0",
  });

  server.tool(
    "listar_campanas",
    "Lista todas las campañas de la cuenta publicitaria de Meta (Facebook/Instagram), incluyendo su nombre, estado (activa, pausada, etc.) y objetivo.",
    {},
    async () => {
      const adAccountId = process.env.META_AD_ACCOUNT_ID;
      if (!adAccountId) throw new Error("META_AD_ACCOUNT_ID no configurado");
      const campaigns = await listCampaigns(adAccountId);
      return {
        content: [{ type: "text", text: JSON.stringify(campaigns, null, 2) }],
      };
    }
  );

  server.tool(
    "resumen_rendimiento_cuenta",
    "Da un resumen del rendimiento de todas las campañas de la cuenta publicitaria en un periodo de tiempo: impresiones, clics, gasto, CTR, CPC, CPM y alcance.",
    {
      periodo: z
        .string()
        .optional()
        .describe(
          "Periodo: today, yesterday, last_7d, last_14d, last_30d, this_month, last_month. Por defecto last_7d"
        ),
    },
    async ({ periodo }) => {
      const adAccountId = process.env.META_AD_ACCOUNT_ID;
      if (!adAccountId) throw new Error("META_AD_ACCOUNT_ID no configurado");
      const insights = await getAccountInsights(adAccountId, periodo || "last_7d");
      return {
        content: [{ type: "text", text: JSON.stringify(insights, null, 2) }],
      };
    }
  );

  server.tool(
    "rendimiento_campana",
    "Da las métricas de rendimiento de una campaña específica de Meta Ads en un periodo de tiempo determinado.",
    {
      campaign_id: z.string().describe("El ID de la campaña a consultar"),
      periodo: z
        .string()
        .optional()
        .describe(
          "Periodo: today, yesterday, last_7d, last_14d, last_30d, this_month, last_month. Por defecto last_7d"
        ),
    },
    async ({ campaign_id, periodo }) => {
      const insights = await getCampaignInsights(campaign_id, periodo || "last_7d");
      return {
        content: [{ type: "text", text: JSON.stringify(insights, null, 2) }],
      };
    }
  );

  return server;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}