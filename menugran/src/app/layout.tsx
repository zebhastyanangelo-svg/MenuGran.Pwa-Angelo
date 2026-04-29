import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MenuGran",
  description: "MenuGran - Tu aplicación de pedidos",
  manifest: "/manifest.webmanifest",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MenuGran" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
