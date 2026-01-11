import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

export default async function globalTeardown() {
  const container = global.__TEST_CONTAINER as StartedPostgreSqlContainer;

  if (container) {
    await container.stop();
  }

  delete global.__TEST_CONTAINER;
}
