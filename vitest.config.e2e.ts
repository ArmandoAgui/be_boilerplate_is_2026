import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Las suites comparten TEST_DATABASE_URL y algunas insertan triggers de
    // falla temporales; ejecutarlas en paralelo contamina las fixtures ajenas.
    fileParallelism: false,
  },
});
