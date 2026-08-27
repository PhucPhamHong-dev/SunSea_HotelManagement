import { defineConfig } from 'orval';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const openApiBaseUrl = apiBaseUrl.replace(/\/api\/v1\/?$/, '');
const openApiTarget = process.env.OPENAPI_URL ?? `${openApiBaseUrl}/openapi.json`;

export default defineConfig({
  sunsea: {
    input: { target: openApiTarget },
    output: {
      mode: 'tags-split',
      target: './src/lib/api/generated/client.ts',
      schemas: './src/lib/api/generated/models',
      client: 'fetch',
      prettier: true,
      override: {
        mutator: {
          path: './src/lib/api/api-fetch.ts',
          name: 'apiFetch',
        },
      },
    },
  },
});
