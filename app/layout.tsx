import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "sanah w liczbach — ranking utworów",
  description: "Małe piosenki. Wielkie liczby. Fanowski ranking utworów sanah na YouTube i Spotify — prototyp z danymi demonstracyjnymi.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="pl"><body>{children}</body></html>;
}
