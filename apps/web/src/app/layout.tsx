import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anki Miner",
  description: "Confirmação de conta do Anki Miner",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
