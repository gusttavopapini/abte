// Cliente de rede dos scripts de coleta e migração do site antigo (etapa 6).
// Regras fixas (decididas em 21/10/2026): só GET e HTTPS, uma origem fixa
// definida no código de quem cria o cliente (nunca vinda do conteúdo
// coletado), redirecionamentos só para a mesma origem e no máximo 3, 30 s de
// limite por pedido, 25 MB por resposta (cortado durante o download), novas
// tentativas só em erro 5xx (2), pausa mínima de 1 s entre pedidos e
// User-Agent que identifica a ABTE. 403 e 429 são "bloqueio": quem chama
// interrompe a execução inteira, sem tentar contornar.
// Sem dependências; testado com um servidor local em testes/unidade/migracao-rede.test.mts.

export const USER_AGENT_DA_MIGRACAO = "ABTE-migracao/1.0 (migracao do site da Associacao Brasileira de Tratamento da Escoliose)";

export type TipoDeErroDeRede =
  | "bloqueio"
  | "naoEncontrado"
  | "http"
  | "servidor"
  | "tempo"
  | "grande"
  | "redirecionamento"
  | "conexao"
  | "endereco";

export class ErroDeRede extends Error {
  readonly tipo: TipoDeErroDeRede;
  readonly status: number | null;
  constructor(tipo: TipoDeErroDeRede, mensagem: string, status: number | null = null) {
    super(mensagem);
    this.name = "ErroDeRede";
    this.tipo = tipo;
    this.status = status;
  }
}

export type ConfiguracaoDaRede = {
  // Origem fixa, ex.: "https://static.wixstatic.com" (sem caminho).
  origem: string;
  userAgent?: string;
  tempoLimiteMs?: number;
  limiteDeBytes?: number;
  novasTentativas?: number;
  // Espera antes de cada nova tentativa (a última se repete).
  esperasEntreTentativasMs?: number[];
  pausaMinimaMs?: number;
  maximoDeRedirecionamentos?: number;
  // SÓ nos testes: aceita http://127.0.0.1 (servidor local).
  permitirHttpLocal?: boolean;
};

export type Resposta = { bytes: Uint8Array; tipoInformado: string | null; status: number };

const PADRAO = {
  userAgent: USER_AGENT_DA_MIGRACAO,
  tempoLimiteMs: 30_000,
  limiteDeBytes: 25 * 1024 * 1024,
  novasTentativas: 2,
  esperasEntreTentativasMs: [5_000, 15_000],
  pausaMinimaMs: 1_000,
  maximoDeRedirecionamentos: 3,
};

const esperar = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

function conferirOrigem(origem: string, permitirHttpLocal: boolean): string {
  let url: URL;
  try {
    url = new URL(origem);
  } catch {
    throw new ErroDeRede("endereco", "Origem inválida.");
  }
  const local = url.protocol === "http:" && permitirHttpLocal && (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  if (url.protocol !== "https:" && !local) throw new ErroDeRede("endereco", "Só HTTPS.");
  if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
    throw new ErroDeRede("endereco", "A origem não pode ter caminho, consulta nem credenciais.");
  }
  return url.origin;
}

// Caminho relativo à origem fixa (ex.: "/media/abc.jpg"). Recusa qualquer
// coisa que possa trocar de servidor: "//outro", "\", esquema, espaços.
export function caminhoSeguro(caminho: string): boolean {
  return (
    caminho.startsWith("/") &&
    !caminho.startsWith("//") &&
    !/[\\\s#]/.test(caminho) &&
    !caminho.split("/").includes("..") &&
    /^[\x21-\x7e]+$/.test(caminho)
  );
}

async function lerCorpo(resposta: Response, limite: number): Promise<Uint8Array> {
  const informado = Number(resposta.headers.get("content-length"));
  if (Number.isFinite(informado) && informado > limite) {
    await resposta.body?.cancel().catch(() => undefined);
    throw new ErroDeRede("grande", `Arquivo maior que ${Math.round(limite / 1024 / 1024)} MB.`);
  }
  if (!resposta.body) return new Uint8Array();
  const partes: Uint8Array[] = [];
  let total = 0;
  const leitor = resposta.body.getReader();
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.length;
    if (total > limite) {
      await leitor.cancel().catch(() => undefined);
      throw new ErroDeRede("grande", `Arquivo maior que ${Math.round(limite / 1024 / 1024)} MB.`);
    }
    partes.push(value);
  }
  const bytes = new Uint8Array(total);
  let posicao = 0;
  for (const parte of partes) {
    bytes.set(parte, posicao);
    posicao += parte.length;
  }
  return bytes;
}

function erroDaFalha(erro: unknown): ErroDeRede {
  if (erro instanceof ErroDeRede) return erro;
  const nome = erro instanceof Error ? erro.name : "";
  if (nome === "TimeoutError" || nome === "AbortError") return new ErroDeRede("tempo", "Tempo limite esgotado.");
  return new ErroDeRede("conexao", "Falha de conexão.");
}

export function criarClienteDeRede(configuracao: ConfiguracaoDaRede) {
  const config = { ...PADRAO, ...configuracao };
  const origem = conferirOrigem(config.origem, Boolean(config.permitirHttpLocal));
  let ultimoPedido = 0;
  let pedidos = 0;

  // Um pedido, já com a pausa mínima desde o anterior.
  async function pedir(url: URL): Promise<Response> {
    const falta = ultimoPedido + config.pausaMinimaMs - Date.now();
    if (falta > 0) await esperar(falta);
    ultimoPedido = Date.now();
    pedidos++;
    return fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": config.userAgent, accept: "*/*" },
      signal: AbortSignal.timeout(config.tempoLimiteMs),
    });
  }

  // Uma tentativa completa: segue os redirecionamentos (só na mesma origem)
  // e lê o corpo com o limite de tamanho.
  async function tentar(inicial: URL): Promise<Resposta> {
    let url = inicial;
    for (let saltos = 0; ; saltos++) {
      const resposta = await pedir(url);
      if (resposta.status >= 300 && resposta.status < 400) {
        await resposta.body?.cancel().catch(() => undefined);
        const destino = resposta.headers.get("location");
        if (!destino) throw new ErroDeRede("redirecionamento", "Redirecionamento sem destino.", resposta.status);
        if (saltos >= config.maximoDeRedirecionamentos) throw new ErroDeRede("redirecionamento", "Redirecionamentos demais.", resposta.status);
        const proxima = new URL(destino, url);
        if (proxima.origin !== origem) throw new ErroDeRede("redirecionamento", "Redirecionamento para outro servidor recusado.", resposta.status);
        url = proxima;
        continue;
      }
      if (resposta.status === 403 || resposta.status === 429) {
        await resposta.body?.cancel().catch(() => undefined);
        throw new ErroDeRede("bloqueio", `O site respondeu ${resposta.status} (bloqueio).`, resposta.status);
      }
      if (resposta.status === 404 || resposta.status === 410) {
        await resposta.body?.cancel().catch(() => undefined);
        throw new ErroDeRede("naoEncontrado", `Não encontrado (${resposta.status}).`, resposta.status);
      }
      if (resposta.status >= 500) {
        await resposta.body?.cancel().catch(() => undefined);
        throw new ErroDeRede("servidor", `Erro do servidor (${resposta.status}).`, resposta.status);
      }
      if (resposta.status < 200 || resposta.status >= 300) {
        await resposta.body?.cancel().catch(() => undefined);
        throw new ErroDeRede("http", `Resposta inesperada (${resposta.status}).`, resposta.status);
      }
      return { bytes: await lerCorpo(resposta, config.limiteDeBytes), tipoInformado: resposta.headers.get("content-type"), status: resposta.status };
    }
  }

  return {
    origem,
    // Total de pedidos feitos (inclui redirecionamentos e novas tentativas).
    get pedidos() {
      return pedidos;
    },
    async baixar(caminho: string): Promise<Resposta> {
      if (!caminhoSeguro(caminho)) throw new ErroDeRede("endereco", "Caminho recusado.");
      const url = new URL(caminho, origem);
      if (url.origin !== origem) throw new ErroDeRede("endereco", "Caminho recusado.");
      for (let tentativa = 0; ; tentativa++) {
        try {
          return await tentar(url);
        } catch (falha) {
          const erro = erroDaFalha(falha);
          if (erro.tipo !== "servidor" || tentativa >= config.novasTentativas) throw erro;
          const esperas = config.esperasEntreTentativasMs;
          await esperar(esperas[Math.min(tentativa, esperas.length - 1)] ?? 0);
        }
      }
    },
  };
}

export type ClienteDeRede = ReturnType<typeof criarClienteDeRede>;
