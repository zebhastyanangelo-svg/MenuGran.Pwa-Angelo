/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/vanillajs" />

/**
 * Tipado estricto para variables de entorno expuestas a la app por Vite.
 * Sin este shim, `import.meta.env.VITE_SUPABASE_URL` sería `unknown`.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_IMGBB_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Evento disparado por el navegador (Chrome/Edge/Android) cuando la PWA
 * cumple los criterios de instalación. Se usa en el hook `useInstallPrompt`
 * para presentar el banner de instalación nativo sin librerías externas.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
  appinstalled: Event;
}
