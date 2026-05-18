import { db, entriesTable, clientsTable, entryClientMatchesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

// ── Text helpers ──────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^\w\s]/g, " ")        // punctuation → space
    .replace(/\s+/g, " ")
    .trim();
}

function contains(haystack: string, needle: string): boolean {
  if (!needle.trim()) return false;
  return normalize(haystack).includes(normalize(needle));
}

function containsAny(haystack: string, needles: string[]): string | null {
  for (const needle of needles) {
    if (contains(haystack, needle)) return needle;
  }
  return null;
}

// ── Type → mention keywords ───────────────────────────────────────────────────

const TYPE_MENTIONS: Record<string, string[]> = {
  autonomo: [
    "autonomo", "autonomos", "trabajador por cuenta propia",
    "trabajadores autonomos", "reta",
  ],
  sl: [
    "sociedad limitada", "sociedades limitadas", "s.l.", " sl ",
  ],
  sa: [
    "sociedad anonima", "sociedades anonimas", "s.a.", " sa ",
  ],
  asociacion: [
    "asociacion", "asociaciones", "entidad sin animo de lucro",
  ],
  comunidad_propietarios: [
    "comunidad de propietarios", "comunidades de propietarios",
    "junta de propietarios",
  ],
};

// ── Province → source mapping ─────────────────────────────────────────────────

function isLasPalmasMunicipality(municipality: string | null): boolean {
  if (!municipality) return false;
  const n = normalize(municipality);
  return (
    n.includes("las palmas") ||
    n.includes("gran canaria") ||
    n.includes("lanzarote") ||
    n.includes("fuerteventura")
  );
}

function isTenerifeMunicipality(municipality: string | null): boolean {
  if (!municipality) return false;
  const n = normalize(municipality);
  return (
    n.includes("tenerife") ||
    n.includes("santa cruz") ||
    n.includes("la palma") ||
    n.includes("la gomera") ||
    n.includes("el hierro")
  );
}

// ── Core scoring ──────────────────────────────────────────────────────────────

interface ScoredMatch {
  score: 1 | 2 | 3;
  reason: string;
}

function scoreClientForEntry(
  client: {
    type: string | null;
    cnae: string | null;
    municipality: string | null;
    keywords: string[] | null;
  },
  entry: {
    source: string;
    title: string;
    summary: string | null;
  }
): ScoredMatch | null {
  const searchText = [entry.title, entry.summary ?? ""].join(" ");

  // ── SCORE 3: keyword or municipality hit in title/summary ──────────────────
  if (client.keywords && client.keywords.length > 0) {
    const hit = containsAny(searchText, client.keywords);
    if (hit) {
      return {
        score: 3,
        reason: `Palabra clave "${hit}" encontrada en el título o resumen`,
      };
    }
  }

  if (client.municipality) {
    if (contains(searchText, client.municipality)) {
      return {
        score: 3,
        reason: `Municipio "${client.municipality}" mencionado en la publicación`,
      };
    }
  }

  // ── SCORE 2: CNAE code or type-keyword hit ─────────────────────────────────
  if (client.cnae && contains(searchText, client.cnae)) {
    return {
      score: 2,
      reason: `Código CNAE ${client.cnae} mencionado en la publicación`,
    };
  }

  if (client.type) {
    const typeMentions = TYPE_MENTIONS[client.type] ?? [];
    const hit = containsAny(searchText, typeMentions);
    if (hit) {
      return {
        score: 2,
        reason: `Mención a tipo de entidad "${hit}" relacionada con el perfil del cliente`,
      };
    }
  }

  // ── SCORE 1: territorial relevance by source ───────────────────────────────
  if (entry.source === "BOP_LPA" && isLasPalmasMunicipality(client.municipality)) {
    return {
      score: 1,
      reason: "Publicación del BOP Las Palmas con relevancia territorial para el cliente",
    };
  }

  if (entry.source === "BOP_TFE" && isTenerifeMunicipality(client.municipality)) {
    return {
      score: 1,
      reason: "Publicación del BOP Tenerife con relevancia territorial para el cliente",
    };
  }

  if (entry.source === "BOC") {
    // BOC affects all of the Canary Islands — only score 1 if client has a municipality set
    if (client.municipality) {
      return {
        score: 1,
        reason: "Publicación del BOC con alcance autonómico (Canarias)",
      };
    }
  }

  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Match a single entry against all active clients using rule-based scoring.
 * Returns the number of new match records created.
 */
export async function matchEntryToClients(entryId: number): Promise<number> {
  // Load entry
  const [entry] = await db
    .select({
      id: entriesTable.id,
      source: entriesTable.source,
      title: entriesTable.title,
      summary: entriesTable.summary,
    })
    .from(entriesTable)
    .where(eq(entriesTable.id, entryId))
    .limit(1);

  if (!entry) {
    logger.warn({ entryId }, "matchEntryToClients: entry not found");
    return 0;
  }

  // Load all active clients
  const clients = await db
    .select({
      id: clientsTable.id,
      type: clientsTable.type,
      cnae: clientsTable.cnae,
      municipality: clientsTable.municipality,
      keywords: clientsTable.keywords,
    })
    .from(clientsTable)
    .where(eq(clientsTable.active, true));

  if (clients.length === 0) return 0;

  // Load existing matches for this entry to avoid duplicates
  const existingMatches = await db
    .select({ clientId: entryClientMatchesTable.clientId })
    .from(entryClientMatchesTable)
    .where(eq(entryClientMatchesTable.entryId, entryId));

  const alreadyMatched = new Set(existingMatches.map((m) => m.clientId));

  // Evaluate and insert
  let created = 0;

  for (const client of clients) {
    if (alreadyMatched.has(client.id)) continue;

    const result = scoreClientForEntry(client, entry);
    if (!result) continue;

    try {
      await db.insert(entryClientMatchesTable).values({
        entryId,
        clientId: client.id,
        relevanceScore: result.score,
        reason: result.reason,
        matchedBy: "rules",
        reviewed: false,
      });
      created++;
    } catch (err) {
      logger.warn({ err, entryId, clientId: client.id }, "Error inserting client match");
    }
  }

  if (created > 0) {
    logger.info({ entryId, created }, "Client matches created");
  }

  return created;
}
