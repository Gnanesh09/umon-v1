import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { AutoReleaserService } from "./services/AutoReleaserService.js";
import { HeliusIndexerService } from "./services/HeliusIndexerService.js";
import { OracleWatcherService } from "./services/OracleWatcherService.js";
import { PaymentMonitorService } from "./services/PaymentMonitorService.js";

async function bootstrap(): Promise<void> {
  const oracleWatcher = new OracleWatcherService();
  await oracleWatcher.start();

  const heliusIndexer = new HeliusIndexerService();
  heliusIndexer.start();

  const autoReleaser = new AutoReleaserService();
  await autoReleaser.start();

  const paymentMonitor = new PaymentMonitorService();
  await paymentMonitor.start();

  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "PowerMoney backend listening");
  });
}

bootstrap().catch((error: Error) => {
  logger.error({ err: error }, "Failed to bootstrap backend");
  process.exit(1);
});
