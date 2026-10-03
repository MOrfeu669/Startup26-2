import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          // Aplica as migrations num Postgres em memória (PGlite): valida o SQL e as constraints sem Docker.
          name: 'schema',
          include: ['tests/schema/**/*.test.ts'],
          environment: 'node',
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['tests/setup/integracao.ts'],
          // Os testes compartilham o mesmo banco local e o limpam entre casos.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
