"use client";

import { Button } from "@dango/ui/components/button";
import { ChevronDown, UserRound } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useTranslation } from "react-i18next";

import { useLogout } from "../../hooks/use-logout";

export function AccountActions({ email, name }: { email: string; name: string }) {
  const { t } = useTranslation();
  const { isSigningOut, signOut, signOutError } = useLogout();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button aria-label={t("accountMenuLabel")} size="icon" type="button" variant="ghost">
          <UserRound aria-hidden="true" />
          <ChevronDown aria-hidden="true" className="-ml-1 size-3" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 w-72 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none"
          sideOffset={8}
        >
          <DropdownMenu.Label className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{name || t("account")}</p>
            <p className="mt-0.5 truncate text-xs font-normal text-muted-foreground">{email}</p>
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          {signOutError ? (
            <p className="px-3 py-2 text-sm text-destructive" role="alert">
              {t("logoutError")}
            </p>
          ) : null}
          <DropdownMenu.Item asChild>
            <button
              className="flex h-10 w-full cursor-pointer items-center rounded-md px-3 text-sm font-medium text-destructive outline-none hover:bg-destructive/10 data-[highlighted]:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSigningOut}
              onClick={signOut}
              type="button"
            >
              {isSigningOut ? t("signingOut") : t("logout")}
            </button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
