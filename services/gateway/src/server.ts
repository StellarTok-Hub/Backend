import { createApp } from './app';
import { env } from './config';
import { logger } from './utils/logger';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`gateway listening on port ${env.PORT}`);
});

function shutdown(signal: string) {
  logger.info(`received ${signal}, shutting down gracefully`);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
