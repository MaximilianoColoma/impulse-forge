import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    pool: 'threads',
    fileParallelism: false,
    maxWorkers: 1,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/integrations/supabase/types.ts',
      ],
      thresholds: {
        lines: 25,
        functions: 25,
        branches: 25,
        statements: 25,
      },
    },
  },
  resolve: {
    alias: {
      // Deno edge functions import zod via npm: specifier; map it for Vitest.
      'npm:zod@3.23.8': 'zod',
      '@': path.resolve(__dirname, './src'),
    },
  },
});
