import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

export default async function globalTeardown() {
  const dbContainer = global.__DB_CONTAINER__ as StartedPostgreSqlContainer;
  const minioContainer = global.__MINIO_CONTAINER__ as StartedPostgreSqlContainer;

  if (dbContainer) {
    await dbContainer.stop();
  }

  if (minioContainer) {
    await minioContainer.stop(); 
  }

  delete global.__DB_CONTAINER__;
  delete global.__MINIO_CONTAINER__;
}