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
  listAdSets,
  getAdSetInsights,
  listAds,
  getAdInsights,
} from "../lib/meta-client.js";

function buildServer() {
  const server = new McpServer({
    name: "meta-ads-connector",
    version: "1.0.0",
  });

  server.tool(
    "listar_conjuntos_anuncios",
    "Lista los conjuntos de anuncios (ad sets) de la cuenta publicitaria. Si se da un campaign_id, solo lista los conjuntos de esa campaña específica. Un conjunto de anuncios define audiencia, presupuesto y programación.",
    {
      campaign_id: z
        .string()
        .optional()
        .describe("ID de la campaña para filtrar. Si se omite, lista todos los conjuntos de la cuenta."),
    },
    async ({ campaign_id }) => {
      const adAccountId = process.env.META_AD_ACCOUNT_ID;
      if (!adAccountId) throw new Error("META_AD_ACCOUNT_ID no configurado");
      const adSets = await listAdSets(adAccountId, campaign_id);
      return {
        content: [{ type: "text", text: JSON.stringify(adSets, null, 2) }],
      };
    }
  );

  server.tool(
    "rendimiento_conjunto_anuncios",
    "Da las métricas de rendimiento de un conjunto de anuncios específico (impresiones, clics, gasto, CTR, CPC, CPM, alcance) en un periodo de tiempo determinado.",
    {
      adset_id: z.string().describe("El ID del conjunto de anuncios a consultar"),
      periodo: z
        .string()
        .optional()
        .describe(
          "Periodo: today, yesterday, last_7d, last_14d, last_30d, this_month, last_month. Por defecto last_7d"
        ),
    },
    async ({ adset_id, periodo }) => {
      const insights = await getAdSetInsights(adset_id, periodo || "last_7d");
      return {
        content: [{ type: "text", text: JSON.stringify(insights, null, 2) }],
      };
    }
  );

  server.tool(
    "listar_anuncios",
    "Lista los anuncios individuales (el contenido creativo: imagen, video o texto) de la cuenta publicitaria. Si se da un parent_id (puede ser el ID de una campaña o de un conjunto de anuncios), solo lista los anuncios dentro de ese elemento.",
    {
      parent_id: z
        .string()
        .optional()
        .describe(
          "ID de la campaña o conjunto de anuncios para filtrar. Si se omite, lista todos los anuncios de la cuenta."
        ),
    },
    async ({ parent_id }) => {
      const adAccountId = process.env.META_AD_ACCOUNT_ID;
      if (!adAccountId) throw new Error("META_AD_ACCOUNT_ID no configurado");
      const ads = await listAds(adAccountId, parent_id);
      return {
        content: [{ type: "text", text: JSON.stringify(ads, null, 2) }],
      };
    }
  );

  server.tool(
    "rendimiento_anuncio",
    "Da las métricas de rendimiento de un anuncio individual específico (impresiones, clics, gasto, CTR, CPC, CPM, alcance) en un periodo de tiempo determinado. Útil para saber qué creativo (imagen/video) está funcionando mejor.",
    {
      ad_id: z.string().describe("El ID del anuncio a consultar"),
      periodo: z
        .string()
        .optional()
        .describe(
          "Periodo: today, yesterday, last_7d, last_14d, last_30d, this_month, last_month. Por defecto last_7d"
        ),
    },
    async ({ ad_id, periodo }) => {
      const insights = await getAdInsights(ad_id, periodo || "last_7d");
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