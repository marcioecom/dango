"use client";

import { localeNames, supportedLocales } from "@dango/i18n";
import { Button } from "@dango/ui/components/button";
import { Check, Globe2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage?.startsWith("pt") ? "pt-BR" : "en";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button aria-label={t("languageLabel")} size="icon" type="button" variant="ghost">
          <Globe2 aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 w-56 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none"
          sideOffset={8}
        >
          <DropdownMenu.RadioGroup value={language} onValueChange={(value) => i18n.changeLanguage(value)}>
            {supportedLocales.map((value) => (
              <DropdownMenu.RadioItem
                className="relative flex h-11 cursor-pointer items-center rounded-md px-3 pr-10 text-sm font-medium outline-none hover:bg-accent data-[highlighted]:bg-accent"
                key={value}
                value={value}
              >
                {localeNames[value]}
                <DropdownMenu.ItemIndicator className="absolute right-3 inline-flex items-center">
                  <Check aria-hidden="true" className="size-4 text-primary" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
