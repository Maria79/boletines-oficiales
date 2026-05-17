import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, entryNotesTable, entriesTable } from "@workspace/db";
import { CreateEntryNoteBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/entries/:id/notes", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const entryId = parseInt(raw, 10);
  if (isNaN(entryId)) {
    res.status(400).json({ error: "ID de entrada inválido" });
    return;
  }

  const notes = await db
    .select()
    .from(entryNotesTable)
    .where(eq(entryNotesTable.entryId, entryId))
    .orderBy(asc(entryNotesTable.createdAt));

  res.json(notes);
});

router.post("/entries/:id/notes", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const entryId = parseInt(raw, 10);
  if (isNaN(entryId)) {
    res.status(400).json({ error: "ID de entrada inválido" });
    return;
  }

  const parsed = CreateEntryNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!parsed.data.content.trim()) {
    res.status(400).json({ error: "El contenido de la nota no puede estar vacío" });
    return;
  }

  // Verify entry exists
  const [entry] = await db
    .select({ id: entriesTable.id })
    .from(entriesTable)
    .where(eq(entriesTable.id, entryId))
    .limit(1);

  if (!entry) {
    res.status(404).json({ error: "Entrada no encontrada" });
    return;
  }

  const [note] = await db
    .insert(entryNotesTable)
    .values({ entryId, content: parsed.data.content.trim() })
    .returning();

  res.status(201).json(note);
});

router.patch("/entries/:id/notes/:noteId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawNoteId = Array.isArray(req.params.noteId) ? req.params.noteId[0] : req.params.noteId;
  const entryId = parseInt(rawId, 10);
  const noteId = parseInt(rawNoteId, 10);

  if (isNaN(entryId) || isNaN(noteId)) {
    res.status(400).json({ error: "IDs inválidos" });
    return;
  }

  const parsed = CreateEntryNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!parsed.data.content.trim()) {
    res.status(400).json({ error: "El contenido de la nota no puede estar vacío" });
    return;
  }

  const [note] = await db
    .update(entryNotesTable)
    .set({ content: parsed.data.content.trim() })
    .where(and(eq(entryNotesTable.id, noteId), eq(entryNotesTable.entryId, entryId)))
    .returning();

  if (!note) {
    res.status(404).json({ error: "Nota no encontrada" });
    return;
  }

  res.json(note);
});

router.delete("/entries/:id/notes/:noteId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawNoteId = Array.isArray(req.params.noteId) ? req.params.noteId[0] : req.params.noteId;
  const entryId = parseInt(rawId, 10);
  const noteId = parseInt(rawNoteId, 10);

  if (isNaN(entryId) || isNaN(noteId)) {
    res.status(400).json({ error: "IDs inválidos" });
    return;
  }

  const [deleted] = await db
    .delete(entryNotesTable)
    .where(and(eq(entryNotesTable.id, noteId), eq(entryNotesTable.entryId, entryId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Nota no encontrada" });
    return;
  }

  res.sendStatus(204);
});

export default router;
