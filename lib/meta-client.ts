// lib/meta-client.ts
// Cliente para hablar con la Graph API de Meta (Marketing API)

const GRAPH_API_VERSION = "v23.0";
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function getAccessToken(): string {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    throw new Error("META_ACCESS_TOKEN no está configurado en las variables de entorno");
  }
  return token;
}

// Helper genérico para hacer peticiones GET a la Graph API
async function metaGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("access_token", getAccessToken());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());
  const data = await res.json();

  if (!res.ok) {
    // Meta devuelve errores en data.error
    const errorMsg = data?.error?.message || "Error desconocido al llamar a la API de Meta";
    throw new Error(`Meta API error: ${errorMsg}`);
  }

  return data as T;
}

// --- Tipos básicos ---

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

export interface MetaInsight {
  campaign_id?: string;
  campaign_name?: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  reach?: string;
  date_start?: string;
  date_stop?: string;
}

// --- Funciones públicas ---

/**
 * Lista las campañas de una cuenta publicitaria.
 */
export async function listCampaigns(adAccountId: string): Promise<MetaCampaign[]> {
  const accountPath = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const data = await metaGet<{ data: MetaCampaign[] }>(`/${accountPath}/campaigns`, {
    fields: "id,name,status,objective,daily_budget,lifetime_budget",
    limit: "100",
  });
  return data.data;
}

/**
 * Obtiene insights (métricas de rendimiento) de una cuenta publicitaria completa.
 * datePreset puede ser: today, yesterday, last_7d, last_14d, last_30d, this_month, last_month, etc.
 */
export async function getAccountInsights(
  adAccountId: string,
  datePreset: string = "last_7d"
): Promise<MetaInsight[]> {
  const accountPath = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const data = await metaGet<{ data: MetaInsight[] }>(`/${accountPath}/insights`, {
    fields: "campaign_id,campaign_name,impressions,clicks,spend,ctr,cpc,cpm,reach",
    level: "campaign",
    date_preset: datePreset,
    limit: "100",
  });
  return data.data;
}

/**
 * Obtiene insights de una campaña específica.
 */
export async function getCampaignInsights(
  campaignId: string,
  datePreset: string = "last_7d"
): Promise<MetaInsight[]> {
  const data = await metaGet<{ data: MetaInsight[] }>(`/${campaignId}/insights`, {
    fields: "impressions,clicks,spend,ctr,cpc,cpm,reach",
    date_preset: datePreset,
  });
  return data.data;
}

// --- Tipos adicionales ---

export interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  campaign_id?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  targeting?: unknown;
}

export interface MetaAd {
  id: string;
  name: string;
  status: string;
  adset_id?: string;
  campaign_id?: string;
  creative?: { id?: string; name?: string };
}

// --- Funciones de Ad Sets ---

/**
 * Lista los conjuntos de anuncios (ad sets) de una cuenta publicitaria,
 * opcionalmente filtrados por campaña.
 */
export async function listAdSets(
  adAccountId: string,
  campaignId?: string
): Promise<MetaAdSet[]> {
  if (campaignId) {
    const data = await metaGet<{ data: MetaAdSet[] }>(`/${campaignId}/adsets`, {
      fields: "id,name,status,campaign_id,daily_budget,lifetime_budget",
      limit: "100",
    });
    return data.data;
  }
  const accountPath = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const data = await metaGet<{ data: MetaAdSet[] }>(`/${accountPath}/adsets`, {
    fields: "id,name,status,campaign_id,daily_budget,lifetime_budget",
    limit: "100",
  });
  return data.data;
}

/**
 * Obtiene insights de un conjunto de anuncios específico.
 */
export async function getAdSetInsights(
  adSetId: string,
  datePreset: string = "last_7d"
): Promise<MetaInsight[]> {
  const data = await metaGet<{ data: MetaInsight[] }>(`/${adSetId}/insights`, {
    fields: "impressions,clicks,spend,ctr,cpc,cpm,reach",
    date_preset: datePreset,
  });
  return data.data;
}

// --- Funciones de Ads ---

/**
 * Lista los anuncios de una cuenta publicitaria,
 * opcionalmente filtrados por campaña o conjunto de anuncios.
 */
export async function listAds(
  adAccountId: string,
  parentId?: string
): Promise<MetaAd[]> {
  if (parentId) {
    const data = await metaGet<{ data: MetaAd[] }>(`/${parentId}/ads`, {
      fields: "id,name,status,adset_id,campaign_id,creative{id,name}",
      limit: "100",
    });
    return data.data;
  }
  const accountPath = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const data = await metaGet<{ data: MetaAd[] }>(`/${accountPath}/ads`, {
    fields: "id,name,status,adset_id,campaign_id,creative{id,name}",
    limit: "100",
  });
  return data.data;
}

/**
 * Obtiene insights de un anuncio específico.
 */
export async function getAdInsights(
  adId: string,
  datePreset: string = "last_7d"
): Promise<MetaInsight[]> {
  const data = await metaGet<{ data: MetaInsight[] }>(`/${adId}/insights`, {
    fields: "impressions,clicks,spend,ctr,cpc,cpm,reach",
    date_preset: datePreset,
  });
  return data.data;
}