import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, alertsTable, entriesTable } from "@workspace/db";
import { CreateAlertBody, DeleteAlertParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/alerts", async (_req, res): Promise<void> => {
  const alerts = await db
    .select()
    .from(alertsTable)
    .orderBy(alertsTable.createdAt);
  res.json(alerts);
});

router.post("/alerts", async (req, res): Promise<void> => {
  const parsed = CreateAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category, source } = parsed.data;

  const [alert] = await db
    .insert(alertsTable)
    .values({ category, source: source ?? null })
    .returning();

  res.status(201).json(alert);
});

router.delete("/alerts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteAlertParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(alertsTable)
    .where(eq(alertsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Alerta no encontrada" });
    return;
  }

  res.sendStatus(204);
});

router.get("/alerts/matches", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0]!;

  const alerts = await db.select().from(alertsTable).orderBy(alertsTable.createdAt);

  if (alerts.length === 0) {
    res.json([]);
    return;
  }

  const matches = await Promise.all(
    alerts.map(async (alert) => {
      const conditions = [
        eq(entriesTable.category, alert.category),
        eq(entriesTable.publishedAt, today),
      ];
      if (alert.source) {
        conditions.push(eq(entriesTable.source, alert.source));
      }
      const entries = await db
        .select()
        .from(entriesTable)
        .where(and(...conditions))
        .orderBy(entriesTable.id);
      return { alert, entries };
    })
  );

  // Only return alerts that have at least one matching entry
  res.json(matches.filter((m) => m.entries.length > 0));
});

export default router;
