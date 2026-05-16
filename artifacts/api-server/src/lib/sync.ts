import { db, entriesTable, syncLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";
import { parseStringPromise } from "xml2js";

interface FetchedEntry {
  source: string;
  title: string;
  summary?: string;
  category?: string;
  publishedAt: string;
  url: string;
  externalId: string;
}

async function fetchBOE(): Promise<FetchedEntry[]> {
  try {
    const today = new Date().toISOString().split("T")[0]!.replace(/-/g, "");
    const url = `https://www.boe.es/diario_boe/xml.php?id=BOE-S-${today}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      logger.warn({ status: res.status, url }, "BOE fetch returned non-OK status");
      return [];
    }
    const xml = await res.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    const sumario = parsed?.sumario;
    if (!sumario) return [];

    const entries: FetchedEntry[] = [];
    const diario = sumario.diario;
    if (!diario) return [];

    const secciones = Array.isArray(diario.seccion) ? diario.seccion : [diario.seccion].filter(Boolean);
    for (const seccion of secciones) {
      const categoria = seccion?.$.nombre || "General";
      const departamentos = Array.isArray(seccion.departamento)
        ? seccion.departamento
        : [seccion.departamento].filter(Boolean);
      for (const dept of departamentos) {
        const items = Array.isArray(dept.epigrafe) ? dept.epigrafe : [dept.epigrafe].filter(Boolean);
        for (const epigrafe of items) {
          const itemList = Array.isArray(epigrafe.item) ? epigrafe.item : [epigrafe.item].filter(Boolean);
          for (const item of itemList) {
            if (!item) continue;
            const id = item.$.id || "";
            const titulo = item.titulo || (typeof item === "string" ? item : "Sin título");
            const urlDoc = item.urlPdf?.$?.szUrl || item.urlHtm || `https://www.boe.es/boe/dias/${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}/pdfs/${id}.pdf`;
            entries.push({
              source: "BOE",
              title: String(titulo).trim(),
              summary: item.titulo ? undefined : undefined,
              category: categoria,
              publishedAt: `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`,
              url: urlDoc.startsWith("http") ? urlDoc : `https://www.boe.es${urlDoc}`,
              externalId: `BOE-${id || titulo}`,
            });
          }
        }
      }
    }
    logger.info({ count: entries.length }, "BOE entries fetched");
    return entries;
  } catch (err) {
    logger.error({ err }, "Error fetching BOE");
    return [];
  }
}

async function fetchBOC(): Promise<FetchedEntry[]> {
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const url = `https://www.gobiernodecanarias.org/boc/rss/rss.jsp`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      logger.warn({ status: res.status }, "BOC RSS fetch returned non-OK status");
      return [];
    }
    const xml = await res.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    const items = parsed?.rss?.channel?.item;
    if (!items) return [];
    const itemList = Array.isArray(items) ? items : [items];
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const entries: FetchedEntry[] = [];
    for (const item of itemList) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : null;
      const pubDateStr = pubDate
        ? `${pubDate.getFullYear()}-${String(pubDate.getMonth() + 1).padStart(2, "0")}-${String(pubDate.getDate()).padStart(2, "0")}`
        : todayStr;
      const link = item.link || "";
      const guid = item.guid?._ || item.guid || link;
      entries.push({
        source: "BOC",
        title: String(item.title || "Sin título").trim(),
        summary: item.description ? String(item.description).replace(/<[^>]*>/g, "").trim().slice(0, 500) : undefined,
        category: item.category || "General",
        publishedAt: pubDateStr,
        url: link,
        externalId: `BOC-${guid}`,
      });
    }
    logger.info({ count: entries.length }, "BOC entries fetched");
    return entries;
  } catch (err) {
    logger.error({ err }, "Error fetching BOC");
    return [];
  }
}

async function fetchBOPLasPalmas(): Promise<FetchedEntry[]> {
  try {
    const url = `https://www.laprovincia.es/bop/rss.xml`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      logger.warn({ status: res.status }, "BOP Las Palmas fetch returned non-OK status");
      return [];
    }
    const xml = await res.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    const items = parsed?.rss?.channel?.item;
    if (!items) return [];
    const itemList = Array.isArray(items) ? items : [items];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const entries: FetchedEntry[] = [];
    for (const item of itemList) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : null;
      const pubDateStr = pubDate
        ? `${pubDate.getFullYear()}-${String(pubDate.getMonth() + 1).padStart(2, "0")}-${String(pubDate.getDate()).padStart(2, "0")}`
        : todayStr;
      const link = item.link || "";
      const guid = item.guid?._ || item.guid || link;
      entries.push({
        source: "BOP_LPA",
        title: String(item.title || "Sin título").trim(),
        summary: item.description ? String(item.description).replace(/<[^>]*>/g, "").trim().slice(0, 500) : undefined,
        category: item.category || "General",
        publishedAt: pubDateStr,
        url: link,
        externalId: `BOP_LPA-${guid}`,
      });
    }
    logger.info({ count: entries.length }, "BOP Las Palmas entries fetched");
    return entries;
  } catch (err) {
    logger.error({ err }, "Error fetching BOP Las Palmas");
    return [];
  }
}

async function fetchBOPTenerife(): Promise<FetchedEntry[]> {
  try {
    const url = `https://www.tenerife.es/portalcapeco/pages/tenerife/bop/bopRSS.jsf`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      logger.warn({ status: res.status }, "BOP Tenerife fetch returned non-OK status");
      return [];
    }
    const xml = await res.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    const items = parsed?.rss?.channel?.item;
    if (!items) return [];
    const itemList = Array.isArray(items) ? items : [items];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const entries: FetchedEntry[] = [];
    for (const item of itemList) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : null;
      const pubDateStr = pubDate
        ? `${pubDate.getFullYear()}-${String(pubDate.getMonth() + 1).padStart(2, "0")}-${String(pubDate.getDate()).padStart(2, "0")}`
        : todayStr;
      const link = item.link || "";
      const guid = item.guid?._ || item.guid || link;
      entries.push({
        source: "BOP_TFE",
        title: String(item.title || "Sin título").trim(),
        summary: item.description ? String(item.description).replace(/<[^>]*>/g, "").trim().slice(0, 500) : undefined,
        category: item.category || "General",
        publishedAt: pubDateStr,
        url: link,
        externalId: `BOP_TFE-${guid}`,
      });
    }
    logger.info({ count: entries.length }, "BOP Tenerife entries fetched");
    return entries;
  } catch (err) {
    logger.error({ err }, "Error fetching BOP Tenerife");
    return [];
  }
}

export async function runSync(): Promise<{
  success: boolean;
  message: string;
  newEntries: number;
  sources: { source: string; count: number; success: boolean }[];
}> {
  logger.info("Starting bulletin sync");

  const [logEntry] = await db
    .insert(syncLogsTable)
    .values({ isRunning: true, newEntries: "0" })
    .returning();

  const logId = logEntry!.id;

  try {
    const [boeEntries, bocEntries, bopLpaEntries, bopTfeEntries] = await Promise.allSettled([
      fetchBOE(),
      fetchBOC(),
      fetchBOPLasPalmas(),
      fetchBOPTenerife(),
    ]);

    const sourceResults = [
      { source: "BOE", result: boeEntries },
      { source: "BOC", result: bocEntries },
      { source: "BOP_LPA", result: bopLpaEntries },
      { source: "BOP_TFE", result: bopTfeEntries },
    ];

    let totalNew = 0;
    const summaries: { source: string; count: number; success: boolean }[] = [];

    for (const { source, result } of sourceResults) {
      if (result.status === "rejected") {
        summaries.push({ source, count: 0, success: false });
        continue;
      }
      const fetched = result.value;
      let newCount = 0;
      for (const entry of fetched) {
        try {
          const existing = await db
            .select({ id: entriesTable.id })
            .from(entriesTable)
            .where(
              and(
                eq(entriesTable.source, entry.source),
                eq(entriesTable.externalId, entry.externalId)
              )
            )
            .limit(1);

          if (existing.length === 0) {
            await db.insert(entriesTable).values({
              source: entry.source,
              title: entry.title,
              summary: entry.summary ?? null,
              category: entry.category ?? null,
              publishedAt: entry.publishedAt,
              url: entry.url,
              externalId: entry.externalId,
              isRead: false,
              isBookmarked: false,
            });
            newCount++;
            totalNew++;
          }
        } catch (insertErr) {
          logger.warn({ err: insertErr, externalId: entry.externalId }, "Error inserting entry");
        }
      }
      summaries.push({ source, count: newCount, success: true });
    }

    const resultMsg = `Sincronización completada: ${totalNew} entradas nuevas`;
    await db
      .update(syncLogsTable)
      .set({
        finishedAt: new Date(),
        isRunning: false,
        newEntries: String(totalNew),
        result: resultMsg,
      })
      .where(eq(syncLogsTable.id, logId));

    logger.info({ totalNew, summaries }, "Sync completed");
    return { success: true, message: resultMsg, newEntries: totalNew, sources: summaries };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await db
      .update(syncLogsTable)
      .set({
        finishedAt: new Date(),
        isRunning: false,
        newEntries: "0",
        result: "Error",
        errorMessage: errMsg,
      })
      .where(eq(syncLogsTable.id, logId));
    logger.error({ err }, "Sync failed");
    return { success: false, message: errMsg, newEntries: 0, sources: [] };
  }
}

export async function getSyncStatus(): Promise<{
  lastSyncAt: string | null;
  isRunning: boolean;
  lastResult: string | null;
  scheduledTime: string;
}> {
  const logs = await db
    .select()
    .from(syncLogsTable)
    .orderBy(syncLogsTable.startedAt)
    .limit(1);

  // Get most recent
  const allLogs = await db
    .select()
    .from(syncLogsTable)
    .orderBy(syncLogsTable.id)
    .limit(100);

  const latest = allLogs.at(-1);

  return {
    lastSyncAt: latest?.finishedAt?.toISOString() ?? null,
    isRunning: latest?.isRunning ?? false,
    lastResult: latest?.result ?? null,
    scheduledTime: "0 8 * * *", // Every day at 08:00
  };
}
