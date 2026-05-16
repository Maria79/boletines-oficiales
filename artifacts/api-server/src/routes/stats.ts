import { Router, type IRouter } from "express";
import { desc, sql, eq } from "drizzle-orm";
import { db, entriesTable } from "@workspace/db";
import { GetRecentEntriesQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats/summary", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0]!;

  const [totalResult, unreadResult, todayResult, bookmarkedResult, bySourceResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(entriesTable),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(entriesTable)
      .where(eq(entriesTable.isRead, false)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(entriesTable)
      .where(eq(entriesTable.publishedAt, today)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(entriesTable)
      .where(eq(entriesTable.isBookmarked, true)),
    db
      .select({
        source: entriesTable.source,
        count: sql<number>`count(*)::int`,
      })
      .from(entriesTable)
      .groupBy(entriesTable.source),
  ]);

  res.json({
    totalEntries: totalResult[0]?.count ?? 0,
    unreadCount: unreadResult[0]?.count ?? 0,
    todayCount: todayResult[0]?.count ?? 0,
    bookmarkedCount: bookmarkedResult[0]?.count ?? 0,
    bySource: bySourceResult,
  });
});

router.get("/stats/recent", async (req, res): Promise<void> => {
  const parsed = GetRecentEntriesQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 10) : 10;

  const entries = await db
    .select()
    .from(entriesTable)
    .orderBy(desc(entriesTable.publishedAt), desc(entriesTable.id))
    .limit(limit);

  res.json(entries);
});

router.get("/stats/categories", async (_req, res): Promise<void> => {
  const results = await db
    .select({
      category: entriesTable.category,
      count: sql<number>`count(*)::int`,
    })
    .from(entriesTable)
    .groupBy(entriesTable.category)
    .orderBy(desc(sql`count(*)`));

  const mapped = results.map((r) => ({
    category: r.category ?? "Sin categoría",
    count: r.count,
  }));

  res.json(mapped);
});

export default router;
