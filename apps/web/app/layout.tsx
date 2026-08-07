import "@dango/ui/globals.css";
import type { Metadata, Viewport } from "next";

import { ServiceWorkerRegistration } from "@/modules/pwa/service-worker-registration";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Dango",
  description: "Capture expressões e transforme-as em cards revisados.",
  applicationName: "Dango",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dango",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9faf8" },
    { media: "(prefers-color-scheme: dark)", color: "#151914" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
