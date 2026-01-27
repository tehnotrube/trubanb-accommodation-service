import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { MinioContainer, StartedMinioContainer } from '@testcontainers/minio';
import { getTypeOrmConfig } from '../../src/db/typeorm.config';
import { RabbitMQContainer, StartedRabbitMQContainer } from '@testcontainers/rabbitmq';

export let dbContainer: StartedPostgreSqlContainer;
export let minioContainer: StartedMinioContainer;
export let rabbitContainer: StartedRabbitMQContainer;

export default async function globalSetup() {
  dbContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('test_db')
    .withUsername('test')
    .withPassword('test')
    .withStartupTimeout(60000)
    .start();

  minioContainer = await new MinioContainer('minio/minio:latest')
    .withUsername('minioadmin')
    .withPassword('minioadmin123')
    .withExposedPorts(9000)
    .start();

  rabbitContainer = await new RabbitMQContainer('rabbitmq:management')
  .withExposedPorts(5672)
  .start();

  const rabbitHost = rabbitContainer.getHost();
  const rabbitPort = rabbitContainer.getMappedPort(5672);

  const minioHost = minioContainer.getHost();
  const minioPort = minioContainer.getMappedPort(9000);
  const minioEndpoint = `http://${minioHost}:${minioPort}`;

  process.env.DB_HOST = dbContainer.getHost();
  process.env.DB_PORT = String(dbContainer.getPort());
  process.env.DB_NAME = dbContainer.getDatabase();
  process.env.DB_USER = dbContainer.getUsername();
  process.env.DB_PASSWORD = dbContainer.getPassword();

  process.env.MINIO_ENDPOINT = minioHost;
  process.env.MINIO_PORT = String(minioPort);
  process.env.MINIO_ACCESS_KEY = 'minioadmin';
  process.env.MINIO_SECRET_KEY = 'minioadmin123';
  process.env.MINIO_BUCKET = 'test-photos';
  process.env.MINIO_USE_SSL = 'false';
  process.env.STORAGE_PUBLIC_URL = minioEndpoint;

  process.env.RABBITMQ_URL = `amqp://guest:guest@${rabbitHost}:${rabbitPort}`;

  process.env.ENV = 'test';
  process.env.NODE_ENV = 'test';

  const config = getTypeOrmConfig({
    isTest: true,
    runMigrations: true,
    overrides: {
      host: dbContainer.getHost(),
      port: dbContainer.getPort(),
      username: dbContainer.getUsername(),
      password: dbContainer.getPassword(),
      database: dbContainer.getDatabase(),
    },
  });

  const { DataSource } = await import('typeorm');
  const ds = new DataSource(config);
  await ds.initialize();
  await ds.runMigrations();
  await ds.destroy();

  global.__DB_CONTAINER__ = dbContainer;
  global.__MINIO_CONTAINER__ = minioContainer;
  global.__RABBIT_CONTAINER__ = rabbitContainer;
}
