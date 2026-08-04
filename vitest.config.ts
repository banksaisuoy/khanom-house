import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 15000,
    // setup.ts sets DATABASE_URL to test.db BEFORE any imports
    setupFiles: ['tests/setup.ts'],
    // Only run one test file at a time to avoid SQLite locking
    pool: 'forks',
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
