import { StartedMinioContainer } from '@testcontainers/minio';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { StartedRabbitMQContainer } from '@testcontainers/rabbitmq';

export default async function globalTeardown() {
  const dbContainer = global.__DB_CONTAINER__ as StartedPostgreSqlContainer;
  const minioContainer = global.__MINIO_CONTAINER__ as StartedMinioContainer;
  const rabbitContainer =
    global.__RABBIT_CONTAINER__ as StartedRabbitMQContainer;

  if (dbContainer) {
    await dbContainer.stop();
  }

  if (minioContainer) {
    await minioContainer.stop();
  }

  if (rabbitContainer) {
    await rabbitContainer.stop();
  }

  delete global.__DB_CONTAINER__;
  delete global.__MINIO_CONTAINER__;
  delete global.__RABBIT_CONTAINER__;
}
