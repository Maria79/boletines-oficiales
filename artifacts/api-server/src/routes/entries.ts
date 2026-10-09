import { Router, type IRouter } from "express";
import { eq, and, ilike, desc, sql } from "drizzle-orm";
import { db, entriesTable } from "@workspace/db";
import {
  ListEntriesQueryParams,
  GetEntryParams,
  MarkEntryReadParams,
  ToggleBookmarkParams,
} from "@workspace/api-zod";
import { requireClientApiToken } from "../middlewares/clientApiAccess";

const router: IRouter = Router();

router.get("/entries", async (req, res): Promise<void> => {
  const parsed = ListEntriesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { source, category, date, search, page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (source) conditions.push(eq(entriesTable.source, source));
  if (category) conditions.push(eq(entriesTable.category, category));
  if (date) conditions.push(eq(entriesTable.publishedAt, date));
  if (search) conditions.push(ilike(entriesTable.title, `%${search}%`));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [entries, countResult] = await Promise.all([
    db
      .select()
      .from(entriesTable)
      .where(whereClause)
      .orderBy(desc(entriesTable.publishedAt), desc(entriesTable.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(entriesTable)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  res.json({
    entries,
    total,
    page,
    limit,
  });
});

router.get("/entries/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetEntryParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .select()
    .from(entriesTable)
    .where(eq(entriesTable.id, params.data.id));

  if (!entry) {
    res.status(404).json({ error: "Entrada no encontrada" });
    return;
  }

  res.json(entry);
});

router.patch("/entries/:id/read", requireClientApiToken, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = MarkEntryReadParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .update(entriesTable)
    .set({ isRead: true })
    .where(eq(entriesTable.id, params.data.id))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Entrada no encontrada" });
    return;
  }

  res.json(entry);
});

router.patch("/entries/:id/bookmark", requireClientApiToken, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ToggleBookmarkParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [current] = await db
    .select({ isBookmarked: entriesTable.isBookmarked })
    .from(entriesTable)
    .where(eq(entriesTable.id, params.data.id));

  if (!current) {
    res.status(404).json({ error: "Entrada no encontrada" });
    return;
  }

  const [entry] = await db
    .update(entriesTable)
    .set({ isBookmarked: !current.isBookmarked })
    .where(eq(entriesTable.id, params.data.id))
    .returning();

  res.json(entry);
});

export default router;
