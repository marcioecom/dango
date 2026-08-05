import { BrandMark } from "@dango/ui/components/brand-mark";

type EmailVerifiedPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function EmailVerifiedPage({ searchParams }: EmailVerifiedPageProps) {
  const { error } = await searchParams;

  return (
    <main className="grid min-h-svh place-items-center p-6">
      <section className="w-full max-w-lg" aria-labelledby="verification-title">
        <div className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]">
          <BrandMark className="size-9" />
          <span>Dango</span>
        </div>
        <div
          className={
            error
              ? "mt-12 size-2 rounded-full bg-destructive"
              : "mt-12 size-2 rounded-full bg-success"
          }
          aria-hidden="true"
        />
        <h1
          className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl"
          id="verification-title"
        >
          {error ? "Não foi possível confirmar" : "Email confirmado"}
        </h1>
        <p className="mt-4 max-w-[52ch] leading-7 text-pretty text-muted-foreground">
          {error
            ? "Este link é inválido ou expirou. Volte ao Dango e solicite uma nova tentativa."
            : "Volte ao Dango no seu Mac para entrar na sua conta."}
        </p>
      </section>
    </main>
  );
}
