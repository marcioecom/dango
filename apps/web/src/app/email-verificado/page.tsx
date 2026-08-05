type EmailVerifiedPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function EmailVerifiedPage({ searchParams }: EmailVerifiedPageProps) {
  const { error } = await searchParams;

  return (
    <main className="verification-page">
      <section aria-labelledby="verification-title">
        <span className="brand-mark" aria-hidden="true">AM</span>
        <h1 id="verification-title">
          {error ? "Não foi possível confirmar" : "Email confirmado"}
        </h1>
        <p>
          {error
            ? "Este link é inválido ou expirou. Volte ao Anki Miner e solicite uma nova tentativa."
            : "Volte ao Anki Miner no seu Mac para entrar na sua conta."}
        </p>
      </section>
    </main>
  );
}
