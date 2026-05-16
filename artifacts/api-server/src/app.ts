import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cron from "node-cron";
import router from "./routes";
import { logger } from "./lib/logger";
import { runSync } from "./lib/sync";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Schedule daily sync at 08:00 every morning
cron.schedule("0 8 * * *", () => {
  logger.info("Running scheduled daily bulletin sync");
  runSync().catch((err) => logger.error({ err }, "Scheduled sync failed"));
});

logger.info("Daily bulletin sync scheduled at 08:00");

export default app;
