import type { Metadata, Viewport } from "next";
import { Karla, Playfair_Display_SC } from "next/font/google";
import SessionProvider from "@/components/providers/SessionProvider";
import SWUpdatePrompt from "@/components/SWUpdatePrompt";
import "./globals.css";

const karla = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-karla",
});

const playfair = Playfair_Display_SC({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-playfair",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F6F8" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1D20" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "MenuGran - Pide comida fácil",
    template: "%s | MenuGran",
  },
  description: "MenuGran - Tu aplicación PWA de pedidos de comida con entregas en tiempo real",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MenuGran",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://menugran.app",
    title: "MenuGran - Pide comida fácil",
    description: "Tu aplicación PWA de pedidos de comida con entregas en tiempo real",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MenuGran" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#F5F6F8" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${karla.variable} ${playfair.variable} bg-cream-50 text-ink font-sans`} suppressHydrationWarning>
        <SessionProvider>{children}</SessionProvider>
        <SWUpdatePrompt />
      </body>
    </html>
  );
}
