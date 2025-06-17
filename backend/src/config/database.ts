import knex from 'knex';
import { config } from './env';

// Database configuration
const db = knex({
  client: 'pg',
  connection: {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
  },
});

export default db;
