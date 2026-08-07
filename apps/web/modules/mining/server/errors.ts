export class MiningError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function miningErrorResponse(error: unknown) {
  if (error instanceof MiningError) {
    return Response.json({ code: error.code, error: error.message }, { status: error.status });
  }

  console.error("Falha inesperada na mineração", error);
  return Response.json(
    { code: "INTERNAL_ERROR", error: "Não foi possível concluir a operação." },
    { status: 500 },
  );
}

export async function parseJsonRequest(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new MiningError("INVALID_JSON", "O corpo da requisição deve ser um JSON válido.", 400);
  }
}
