import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { i18n } from "../../../i18n/i18n";
import { renderWithProviders } from "../../../test/render";
import { useAnkiDelivery } from "../hooks/use-anki-delivery";
import type { AnkiProfile } from "../types";
import { AnkiDeliveryView } from "./anki-delivery-view";

vi.mock("../hooks/use-anki-delivery", () => ({ useAnkiDelivery: vi.fn() }));

const saveProfile = vi.fn(async (profile: AnkiProfile) => profile);
const sync = vi.fn();

describe("Anki delivery settings", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("pt-BR");
    vi.mocked(useAnkiDelivery).mockReturnValue({
      catalog: {
        data: {
          decks: ["English::Mining", "Default"],
          models: [{ fields: ["Front", "Back"], name: "Basic" }],
        },
      },
      deliveries: { data: [], isPending: false },
      profile: { data: null },
      saveProfile: {
        error: null,
        isError: false,
        isPending: false,
        mutateAsync: saveProfile,
      },
      status: { data: { connected: true }, isPending: false },
      sync: { error: null, isError: false, isPending: false, mutate: sync },
    } as unknown as ReturnType<typeof useAnkiDelivery>);
  });

  it("suggests the established Anki defaults and saves a valid profile", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnkiDeliveryView accountId="account-1" />);

    await waitFor(() => expect(screen.getByLabelText("Baralho")).toHaveValue("English::Mining"));
    expect(screen.getByLabelText("Tipo de nota")).toHaveValue("Basic");
    expect(screen.getByLabelText("Campo da frente")).toHaveValue("Front");
    expect(screen.getByLabelText("Campo do verso")).toHaveValue("Back");

    await user.click(screen.getByRole("button", { name: "Salvar perfil" }));
    expect(saveProfile).toHaveBeenCalledWith({
      accountId: "account-1",
      backField: "Back",
      deckName: "English::Mining",
      frontField: "Front",
      modelName: "Basic",
    });
  });

  it("offers an explicit retry without making it necessary for normal sync", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnkiDeliveryView accountId="account-1" />);

    await user.click(screen.getByRole("button", { name: "Sincronizar agora" }));
    expect(sync).toHaveBeenCalledOnce();
  });
});
