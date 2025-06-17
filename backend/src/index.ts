import './aliases'; // Must be first

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { initializeStorage } from './config/storage';
import { config } from './config/env';
import mediaRouter from './routes/mediaRoutes';
import commentRouter from './routes/commentRoutes';
import { createLogger } from './utils/logger';

const app = new Hono();
const appLogger = createLogger('app-server');

app.use('*', honoLogger());

// CORS configuration
app.use('*', cors({
  origin: config.server.trusted_origins,
  allowHeaders: config.server.allowed_headers,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  exposeHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400,
  credentials: true,
}));

// Request logging
app.use('*', async (c, next) => {
  appLogger.info(`${c.req.method} ${c.req.url}`, {
    headers: c.req.header(),
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip')
  });
  await next();
});

// Health check routes
app.get('/', (c) => c.json({ status: 'ok', message: 'Media Sharing API is running' }));
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API routes
app.route('/api/media', mediaRouter);
app.route('/api/comments', commentRouter);

app.onError((err, c) => {
  appLogger.error('Unhandled error', err);
  return c.json({ error: 'Internal server error' }, 500);
});

const PORT = config.server.port;

const runMigrations = async () => {
  const dbLogger = createLogger('database-migrations');
  
  try {
    const knex = require('knex');
    const { knexConfig } = require('./config/knexConfig');
    const env = process.env.NODE_ENV || 'development';
    const db = knex(knexConfig[env]);
    
    // Check if knex_migrations table exists
    const hasTable = await db.schema.hasTable('knex_migrations');
    
    if (!hasTable) {
      dbLogger.info('Migrations have not been run yet, running now...');
      await db.migrate.latest();
      dbLogger.info('Migrations completed successfully');
    } else {
      // Check if there are pending migrations
      const [_, pendingMigrations] = await db.migrate.list();
      
      if (pendingMigrations.length > 0) {
        dbLogger.info(`Found ${pendingMigrations.length} pending migrations, running now...`);
        await db.migrate.latest();
        dbLogger.info('Migrations completed successfully');
      } else {
        dbLogger.info('Database schema is up to date');
      }
    }
    
    // Close the knex connection used for migrations
    await db.destroy();
    return true;
  } catch (error) {
    dbLogger.error('Error checking/running migrations', error);
    throw error;
  }
};

const startServer = async () => {
  try {
    await runMigrations();
    await initializeStorage();
    appLogger.info('Storage initialized successfully');
    
    // Start the server
    serve({
      fetch: app.fetch,
      port: Number(PORT)
    });
    
    appLogger.info(`Server is running on http://localhost:${PORT}`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    });
  } catch (error) {
    appLogger.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();
