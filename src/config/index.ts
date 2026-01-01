/**
 * Application Configuration
 */

export const config = {
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
    timeout: 30000,
  },
  app: {
    name: 'vitco Desktop',
    version: '1.0.0',
  },
  updates: {
    serverUrl: import.meta.env.VITE_UPDATE_SERVER_URL || 'https://your-update-server.com/updates/',
    checkInterval: 3600000, // Check every hour (1 hour in milliseconds)
  },
};

