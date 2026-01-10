import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource, DataSourceOptions } from 'typeorm';
import { getTypeOrmConfig } from '../../src/db/typeorm.config';

export let dbConfig: DataSourceOptions;

export default async function globalSetup() {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('test_db')
    .withUsername('test')
    .withPassword('test')
    .withStartupTimeout(60000)
    .start();

  const dbConfig = getTypeOrmConfig({
    isTest: true,
    runMigrations: false,
    overrides: {
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
    },
  });

  process.env.DB_HOST = container.getHost();
  process.env.DB_PORT = String(container.getPort());
  process.env.DB_USER = container.getUsername();
  process.env.DB_PASSWORD = container.getPassword();
  process.env.DB_NAME = container.getDatabase();
  process.env.ENV = 'test';
  process.env.NODE_ENV = 'test';

  const migrationDataSource = new DataSource(dbConfig);

  await migrationDataSource.initialize();
  await migrationDataSource.runMigrations();

  global.__TEST_CONTAINER = container as StartedPostgreSqlContainer | undefined;
}
