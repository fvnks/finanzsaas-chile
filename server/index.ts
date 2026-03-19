import app from "./app";
import { startExchangeRateCron } from "./services/exchangeRateService";
import { startSubscriptionCron } from "./services/subscriptionService";
import { logger } from "./lib/logger";

const PORT = process.env.PORT || 3001;

app.listen(Number(PORT), '0.0.0.0', () => {
  logger.info({
    event: "server_started",
    port: Number(PORT),
    nodeEnv: process.env.NODE_ENV || "development"
  });
  
  // Iniciar servicio de Tipo de Cambio (UF/USD)
  startExchangeRateCron();
  startSubscriptionCron();
});

process.on("unhandledRejection", (reason) => {
  logger.error({
    event: "unhandled_rejection",
    message: reason instanceof Error ? reason.message : String(reason)
  });
});

process.on("uncaughtException", (error) => {
  logger.error({
    event: "uncaught_exception",
    message: error.message
  });
});
