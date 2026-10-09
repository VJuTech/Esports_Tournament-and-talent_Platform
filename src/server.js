const app = require('./app');
const env = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/database');

async function startServer() {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`Received ${signal}; shutting down`);
    server.close(async (error) => {
      if (error) {
        console.error('HTTP server shutdown failed', error);
        process.exitCode = 1;
      }

      await disconnectDatabase();
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((error) => {
  console.error('Application startup failed', error);
  process.exitCode = 1;
});
