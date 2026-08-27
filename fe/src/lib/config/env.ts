const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const websocketUrl = process.env.NEXT_PUBLIC_WS_URL ?? apiBaseUrl;

export const appEnv = {
  apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
  websocketUrl: websocketUrl.replace(/\/$/, ''),
} as const;
