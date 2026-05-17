import { Router, type IRouter } from "express";
import healthRouter from "./health";
import entriesRouter from "./entries";
import syncRouter from "./sync";
import statsRouter from "./stats";
import alertsRouter from "./alerts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(entriesRouter);
router.use(syncRouter);
router.use(statsRouter);
router.use(alertsRouter);

export default router;
