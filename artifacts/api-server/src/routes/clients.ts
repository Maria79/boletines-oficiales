import { Router, type IRouter } from "express";
import { eq, and, desc, SQL } from "drizzle-orm";
import { db, clientsTable, entryClientMatchesTable, entriesTable } from "@workspace/db";
import { CreateClientBody, UpdateClientBody } from "@workspace/api-zod";

const router: IRouter = Router();

// ── NIF/CIF validation helpers ────────────────────────────────────────────────

// NIF (DNI): 8 digits + 1 control letter
const NIF_REGEX = /^[0-9]{8}[A-Z]$/i;
// NIE (foreign): X|Y|Z + 7 digits + 1 control letter
const NIE_REGEX = /^[XYZ][0-9]{7}[A-Z]$/i;
// CIF (legal entities): 1 letter (not X/Y/Z) + 7 digits + 1 digit/letter
const CIF_REGEX = /^[ABCDEFGHJKLMNPQRSUVW][0-9]{7}[0-9A-J]$/i;

function validateNif(raw: string): { valid: boolean; nifType: "nif" | "cif" | null; normalized: string } {
  const normalized = raw.trim().toUpperCase().replace(/[\s\-\.]/g, "");
  if (NIF_REGEX.test(normalized) || NIE_REGEX.test(normalized)) {
    return { valid: true, nifType: "nif", normalized };
  }
  if (CIF_REGEX.test(normalized)) {
    return { valid: true, nifType: "cif", normalized };
  }
  return { valid: false, nifType: null, normalized };
}

// ── GET /clients — lista paginada con filtros opcionales ─────────────────────
router.get("/clients", async (req, res): Promise<void> => {
  const { active, type, municipality, page, limit: limitParam } = req.query as Record<string, string | undefined>;

  const pageNum = parseInt(page ?? "1", 10);
  const pageSize = Math.min(parseInt(limitParam ?? "50", 10), 200);
  const offset = (pageNum - 1) * pageSize;

  const conditions: SQL[] = [];

  if (active !== undefined) {
    conditions.push(eq(clientsTable.active, active === "true"));
  }
  if (type) {
    conditions.push(eq(clientsTable.type, type as typeof clientsTable.type._.data));
  }
  if (municipality) {
    conditions.push(eq(clientsTable.municipality, municipality));
  }

  const clients = await db
    .select()
    .from(clientsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(clientsTable.createdAt))
    .limit(pageSize)
    .offset(offset);

  req.log.info({ count: clients.length, page: pageNum }, "clients listed");
  res.json(clients);
});

// ── GET /clients/:id — ficha completa con los últimos matches ────────────────
router.get("/clients/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID de cliente inválido" });
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, id))
    .limit(1);

  if (!client) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }

  const recentMatches = await db
    .select({
      id: entryClientMatchesTable.id,
      entryId: entryClientMatchesTable.entryId,
      clientId: entryClientMatchesTable.clientId,
      relevanceScore: entryClientMatchesTable.relevanceScore,
      reason: entryClientMatchesTable.reason,
      matchedBy: entryClientMatchesTable.matchedBy,
      reviewed: entryClientMatchesTable.reviewed,
      createdAt: entryClientMatchesTable.createdAt,
      entryTitle: entriesTable.title,
      entrySource: entriesTable.source,
      entryPublishedAt: entriesTable.publishedAt,
    })
    .from(entryClientMatchesTable)
    .innerJoin(entriesTable, eq(entryClientMatchesTable.entryId, entriesTable.id))
    .where(eq(entryClientMatchesTable.clientId, id))
    .orderBy(desc(entryClientMatchesTable.createdAt))
    .limit(20);

  req.log.info({ clientId: id }, "client detail fetched");
  res.json({ ...client, recentMatches });
});

// ── POST /clients — crear cliente ────────────────────────────────────────────
router.post("/clients", async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, nif, type, cnae, municipality, taxRegime, keywords, active, bormeMonitored } = parsed.data;

  // Validate and infer nif_type
  let normalizedNif: string | null = null;
  let inferredNifType: "nif" | "cif" | null = null;

  if (nif) {
    const result = validateNif(nif);
    if (!result.valid) {
      res.status(400).json({ error: `NIF/CIF inválido: "${nif}". Formatos aceptados: NIF (12345678A), NIE (X1234567A), CIF (A1234567J)` });
      return;
    }
    normalizedNif = result.normalized;
    inferredNifType = result.nifType;

    // Check uniqueness
    const [existing] = await db
      .select({ id: clientsTable.id })
      .from(clientsTable)
      .where(eq(clientsTable.nif, normalizedNif))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: `Ya existe un cliente con el NIF/CIF ${normalizedNif}` });
      return;
    }
  }

  const [client] = await db
    .insert(clientsTable)
    .values({
      name: name.trim(),
      nif: normalizedNif,
      nifType: inferredNifType,
      bormeMonitored: bormeMonitored ?? true,
      type: type as typeof clientsTable.type._.data ?? null,
      cnae: cnae ?? null,
      municipality: municipality ?? null,
      taxRegime: taxRegime as typeof clientsTable.taxRegime._.data ?? null,
      keywords: keywords ?? null,
      active: active ?? true,
    })
    .returning();

  req.log.info({ clientId: client.id, nif: normalizedNif }, "client created");
  res.status(201).json(client);
});

// ── PATCH /clients/:id — actualizar cliente ──────────────────────────────────
router.patch("/clients/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID de cliente inválido" });
    return;
  }

  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof clientsTable.$inferInsert> = {};
  const data = parsed.data;

  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.type !== undefined) updates.type = data.type as typeof clientsTable.type._.data;
  if (data.cnae !== undefined) updates.cnae = data.cnae;
  if (data.municipality !== undefined) updates.municipality = data.municipality;
  if (data.taxRegime !== undefined) updates.taxRegime = data.taxRegime as typeof clientsTable.taxRegime._.data;
  if (data.keywords !== undefined) updates.keywords = data.keywords;
  if (data.active !== undefined) updates.active = data.active;
  if (data.bormeMonitored !== undefined) updates.bormeMonitored = data.bormeMonitored;

  // Validate and infer nif_type if nif is being updated
  if (data.nif !== undefined) {
    const result = validateNif(data.nif);
    if (!result.valid) {
      res.status(400).json({ error: `NIF/CIF inválido: "${data.nif}". Formatos aceptados: NIF (12345678A), NIE (X1234567A), CIF (A1234567J)` });
      return;
    }
    // Check uniqueness (excluding current client)
    const [existing] = await db
      .select({ id: clientsTable.id })
      .from(clientsTable)
      .where(and(eq(clientsTable.nif, result.normalized), eq(clientsTable.id, id)))
      .limit(1);

    // Only check conflict if it's a different client
    if (!existing) {
      const [conflict] = await db
        .select({ id: clientsTable.id })
        .from(clientsTable)
        .where(eq(clientsTable.nif, result.normalized))
        .limit(1);
      if (conflict) {
        res.status(409).json({ error: `Ya existe un cliente con el NIF/CIF ${result.normalized}` });
        return;
      }
    }

    updates.nif = result.normalized;
    updates.nifType = result.nifType;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No se han proporcionado campos para actualizar" });
    return;
  }

  const [client] = await db
    .update(clientsTable)
    .set(updates)
    .where(eq(clientsTable.id, id))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }

  req.log.info({ clientId: id }, "client updated");
  res.json(client);
});

// ── DELETE /clients/:id — soft delete (active = false) ──────────────────────
router.delete("/clients/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID de cliente inválido" });
    return;
  }

  const [client] = await db
    .update(clientsTable)
    .set({ active: false })
    .where(eq(clientsTable.id, id))
    .returning({ id: clientsTable.id });

  if (!client) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }

  req.log.info({ clientId: id }, "client soft-deleted");
  res.sendStatus(204);
});

export default router;
