// Lê a foto de um rótulo de vinho e devolve as características em JSON.
// O Supabase só deixa chamar esta função a utilizadores com sessão iniciada (verify_jwt).
// Precisa do segredo ANTHROPIC_API_KEY: supabase secrets set ANTHROPIC_API_KEY=...

import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BASE64 = 7_000_000; // cerca de 5 MB de imagem

const nulo = (tipo: string, extra: Record<string, unknown> = {}) => ({ type: [tipo, "null"], ...extra });
const escala = { ...nulo("integer"), minimum: 1, maximum: 5 };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    legivel: { type: "boolean", description: "false se a imagem não mostrar um rótulo de vinho legível" },
    nome: nulo("string"),
    produtor: nulo("string"),
    ano: nulo("integer"),
    tipo: { type: ["string", "null"], enum: ["tinto", "branco", "rose", "espumante", "fortificado", "sobremesa", "outro", null] },
    regiao: nulo("string"),
    pais: nulo("string"),
    castas: nulo("string"),
    corpo: escala,
    taninos: escala,
    acidez: escala,
    docura: escala,
    aromas: nulo("string"),
    harmonizacao: nulo("string"),
    beberDe: nulo("integer"),
    beberAte: nulo("integer"),
    notas: nulo("string"),
  },
  required: [
    "legivel", "nome", "produtor", "ano", "tipo", "regiao", "pais", "castas", "corpo", "taninos",
    "acidez", "docura", "aromas", "harmonizacao", "beberDe", "beberAte", "notas",
  ],
};

const SISTEMA = `És um sommelier experiente. Recebes a fotografia de um rótulo de vinho e devolves a ficha completa do vinho.

Regras:
- nome, produtor, ano, regiao e pais: o que está escrito no rótulo. "nome" é o nome do vinho sem o produtor (ex.: "Reserva Vinhas Velhas"). "regiao" é a denominação (ex.: "Douro DOC"). Se algum não estiver legível, usa o teu conhecimento deste vinho; só se não houver forma de saber, null.
- PREENCHE SEMPRE castas, corpo, taninos, acidez, docura, aromas, harmonizacao, beberDe, beberAte e notas, mesmo sem certeza: usa o que sabes deste vinho e, na falta disso, o perfil típico do produtor, da região, das castas e do estilo.
- corpo, taninos, acidez e docura: inteiros de 1 (muito baixo) a 5 (muito alto).
- aromas: 3 a 6 descritores separados por vírgulas. harmonizacao: 3 a 5 pratos concretos, de preferência da cozinha portuguesa.
- beberDe e beberAte: anos civis da janela de consumo ideal. Sem colheita (NV), conta a partir do ano atual.
- notas: 1 ou 2 frases sobre o vinho e o produtor.
- legivel: false só se a imagem não mostrar um rótulo de vinho.
- Escreve em português de Portugal.`;

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

function resposta(corpo: unknown, estado = 200) {
  return new Response(JSON.stringify(corpo), {
    status: estado,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resposta({ erro: "Método não suportado" }, 405);

  let imagem: string;
  try {
    ({ imagem } = await req.json());
  } catch {
    return resposta({ erro: "Pedido inválido" }, 400);
  }
  if (typeof imagem !== "string" || !imagem || imagem.length > MAX_BASE64) {
    return resposta({ erro: "Imagem em falta ou demasiado grande" }, 400);
  }

  try {
    const msg = await anthropic.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      // Se o pedido for recusado por um filtro de segurança, o servidor tenta outro modelo.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SCHEMA },
      },
      system: SISTEMA,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imagem } },
          { type: "text", text: "Preenche a ficha deste vinho." },
        ],
      }],
    // deno-lint-ignore no-explicit-any
    } as any);

    if (msg.stop_reason === "refusal") return resposta({ erro: "O pedido foi recusado. Tenta outra foto." }, 422);
    if (msg.stop_reason === "max_tokens") return resposta({ erro: "Resposta incompleta. Tenta de novo." }, 502);

    // deno-lint-ignore no-explicit-any
    const texto = msg.content.find((b: any) => b.type === "text")?.text;
    if (!texto) return resposta({ erro: "Sem resposta do modelo" }, 502);
    return resposta(JSON.parse(texto));
  } catch (e) {
    console.error(e);
    const estado = e instanceof Anthropic.RateLimitError ? 429 : 502;
    return resposta({ erro: "Falha ao ler o rótulo" }, estado);
  }
});
