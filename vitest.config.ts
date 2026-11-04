import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Tests must never reach real services.
    env: {
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
      BACKGROUND_FUNCTION_SECRET: '',
      URL: '',
    },
    restoreMocks: true,
  },
});
