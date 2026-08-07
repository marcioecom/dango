"use client";

import { Archive, Inbox, PenLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

const destinations = [
  { href: "/capture", icon: PenLine, key: "navigationCapture" },
  { href: "/inbox", icon: Inbox, key: "navigationInbox" },
  { href: "/mined", icon: Archive, key: "navigationMined" },
] as const;

export function AppNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav aria-label={t("navigationLabel")} className={mobile ? "w-full" : "hidden md:block"}>
      <ul className={mobile ? "grid grid-cols-3" : "flex items-center gap-1"}>
        {destinations.map(({ href, icon: Icon, key }) => {
          const current = pathname === href || (href === "/inbox" && pathname.startsWith("/inbox/"));
          return (
            <li key={href}>
              <Link
                aria-current={current ? "page" : undefined}
                className={
                  mobile
                    ? "flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-primary"
                    : "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground"
                }
                href={href}
              >
                <Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
                <span>{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
