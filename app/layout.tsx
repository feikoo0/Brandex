import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Braindex OS",
  description: "Sistema de gestión para agencias creativas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-gray-50 dark:bg-[#0a0a0c] text-gray-900 dark:text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
