import "@dango/ui/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dango",
  description: "Capture expressões e transforme-as em cards revisados.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
