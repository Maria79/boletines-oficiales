import { Router, type IRouter } from "express";
import { runSync, getSyncStatus } from "../lib/sync";

const router: IRouter = Router();

router.post("/sync", async (req, res): Promise<void> => {
  req.log.info("Manual sync triggered");
  const result = await runSync();
  res.json(result);
});

router.get("/sync/status", async (_req, res): Promise<void> => {
  const status = await getSyncStatus();
  res.json(status);
});

export default router;
