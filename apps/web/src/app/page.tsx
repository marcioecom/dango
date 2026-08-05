import { BrandMark } from "@dango/ui/components/brand-mark";

export default function Home() {
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <section className="w-full max-w-lg" aria-labelledby="service-title">
        <div className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]">
          <BrandMark className="size-9" />
          <span>Dango</span>
        </div>
        <div className="mt-12 flex items-center gap-2 text-sm font-semibold text-primary">
          <span className="size-2 rounded-full bg-success" aria-hidden="true" />
          Serviço disponível
        </div>
        <h1
          className="mt-4 max-w-[18ch] text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl"
          id="service-title"
        >
          Sua próxima captura começa aqui.
        </h1>
        <p className="mt-4 max-w-[52ch] leading-7 text-pretty text-muted-foreground">
          O serviço de sincronização do Dango está pronto para receber suas expressões.
        </p>
      </section>
    </main>
  );
}
