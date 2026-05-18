import { logger } from "./logger";
import { parseStringPromise } from "xml2js";

export interface BormeFetchedEntry {
  source: "BORME";
  title: string;
  summary?: string;
  category?: string;
  publishedAt: string;
  url: string;
  externalId: string;
}

export async function fetchBORME(): Promise<BormeFetchedEntry[]> {
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;
    const url = `https://www.boe.es/diario_borme/xml.php?id=BORME-S-${dateStr}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      logger.warn({ status: res.status, url }, "BORME fetch returned non-OK status");
      return [];
    }

    const xml = await res.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    const sumario = parsed?.sumario;
    if (!sumario) return [];

    const diario = sumario.diario;
    if (!diario) return [];

    const publishedAt = `${yyyy}-${mm}-${dd}`;
    const entries: BormeFetchedEntry[] = [];

    // BORME sections: sección (Empresarios, Anuncios y Avisos…)
    const secciones = Array.isArray(diario.seccion)
      ? diario.seccion
      : [diario.seccion].filter(Boolean);

    for (const seccion of secciones) {
      const seccionNombre: string = seccion?.$.nombre ?? "General";

      // Each section has emisores (registros mercantiles / organismos)
      const emisores = Array.isArray(seccion.emisor)
        ? seccion.emisor
        : [seccion.emisor].filter(Boolean);

      for (const emisor of emisores) {
        if (!emisor) continue;
        const items = Array.isArray(emisor.item)
          ? emisor.item
          : [emisor.item].filter(Boolean);

        for (const item of items) {
          if (!item) continue;

          const id: string = item.$?.id ?? "";
          const titulo: string = String(item.titulo ?? "Sin título").trim();

          // Build URL: prefer PDF link, fallback to HTML
          let entryUrl = "";
          const urlPdf = item.urlPdf?.$?.szUrl ?? item.urlPdf;
          const urlHtm = item.urlHtm?.$?.szUrl ?? item.urlHtm;
          if (urlPdf) {
            entryUrl = urlPdf.startsWith("http") ? urlPdf : `https://www.boe.es${urlPdf}`;
          } else if (urlHtm) {
            entryUrl = urlHtm.startsWith("http") ? urlHtm : `https://www.boe.es${urlHtm}`;
          } else if (id) {
            entryUrl = `https://www.boe.es/borme/dias/${yyyy}/${mm}/${dd}/pdfs/${id}.pdf`;
          }

          // Summary: combine section name + any available description
          const summary = [seccionNombre, item.descripcion]
            .filter(Boolean)
            .join(" — ")
            .slice(0, 500) || undefined;

          entries.push({
            source: "BORME",
            title: titulo,
            summary,
            category: seccionNombre,
            publishedAt,
            url: entryUrl,
            externalId: `BORME-${id || titulo.slice(0, 60)}`,
          });
        }
      }
    }

    logger.info({ count: entries.length }, "BORME entries fetched");
    return entries;
  } catch (err) {
    logger.error({ err }, "Error fetching BORME");
    return [];
  }
}
