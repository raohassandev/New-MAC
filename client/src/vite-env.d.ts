// client/src/vite-env.d.ts

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL: string;
  // Add any other environment variables you use
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
