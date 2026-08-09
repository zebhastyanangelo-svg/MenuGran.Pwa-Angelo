/// <reference types="vite/client" />

/**
 * Tipado estricto para variables de entorno expuestas a la app por Vite.
 * Sin este shim, `import.meta.env.VITE_SUPABASE_URL` sería `unknown`.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
