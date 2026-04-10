import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'dist/**',
        'tests/**',
        'vitest.config.ts',
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/types/**',
        'src/**/*.interface.ts',
        'src/index.ts',
        'src/strategy/strategy.interface.ts',
      ]
    }
  }
});
