// Regras comuns das ações de conteúdo do painel (04/11/2026): situação de
// cada item (publicado, rascunho ou lixeira), publicar e despublicar, lixeira
// e a confirmação reforçada do "Excluir de vez". Puras (sem Firebase), usadas
// pela gravação (lib/gravacao/lixeira.ts), pelas telas e pelos testes.

export type Situacao = "publicado" | "rascunho" | "lixeira";

export type ColecaoDoPainel =
  | "posts"
  | "artigos"
  | "profissionais"
  | "produtos"
  | "categoriasDePosts"
  | "tagsDePosts"
  | "categoriasDeArtigos"
  | "tagsDeArtigos"
  | "categoriasDeProdutos";

type Dados = Record<string, unknown>;

// Como cada coleção guarda a situação. Sem regra: o item não tem situação de
// publicação (tags e categorias da loja, decisão de 04/11/2026), só lixeira.
type RegraDaSituacao = {
  campo: string;
  publicado: (dados: Dados) => boolean;
  valor: (publicar: boolean) => unknown;
  // Particípios para as mensagens ("publicado", "desativada"...).
  ligado: string;
  desligado: string;
};

export type ConfiguracaoDaColecao = {
  // "o post", "a categoria": artigo definido e nome, para as mensagens.
  artigo: "o" | "a";
  nome: string;
  plural: string;
  campoDoNome: string;
  situacao: RegraDaSituacao | null;
  // Posts e artigos: o site público só olha o status, então ir para a lixeira
  // também os deixa como rascunho (decisão de 04/11/2026); restaurar não os
  // publica de novo.
  rascunhoNaLixeira: boolean;
};

const STATUS: RegraDaSituacao = {
  campo: "status",
  publicado: (dados) => dados.status === "publicado",
  valor: (publicar) => (publicar ? "publicado" : "rascunho"),
  ligado: "publicado",
  desligado: "despublicado",
};

// Categorias com o campo ativa: ausente vale ativa (lib/topicos.ts).
const ATIVA: RegraDaSituacao = { campo: "ativa", publicado: (dados) => dados.ativa !== false, valor: (publicar) => publicar, ligado: "ativada", desligado: "desativada" };

export const COLECOES_DO_PAINEL: Record<ColecaoDoPainel, ConfiguracaoDaColecao> = {
  posts: { artigo: "o", nome: "post", plural: "posts", campoDoNome: "titulo", situacao: STATUS, rascunhoNaLixeira: true },
  artigos: { artigo: "o", nome: "artigo", plural: "artigos", campoDoNome: "titulo", situacao: STATUS, rascunhoNaLixeira: true },
  profissionais: {
    artigo: "o",
    nome: "profissional",
    plural: "profissionais",
    campoDoNome: "nome",
    situacao: { campo: "ativo", publicado: (dados) => dados.ativo === true, valor: (publicar) => publicar, ligado: "ativado", desligado: "desativado" },
    rascunhoNaLixeira: false,
  },
  produtos: {
    artigo: "o",
    nome: "produto",
    plural: "produtos",
    campoDoNome: "nome",
    situacao: { campo: "publicado", publicado: (dados) => dados.publicado === true, valor: (publicar) => publicar, ligado: "publicado", desligado: "despublicado" },
    rascunhoNaLixeira: false,
  },
  categoriasDePosts: { artigo: "a", nome: "categoria", plural: "categorias", campoDoNome: "nome", situacao: ATIVA, rascunhoNaLixeira: false },
  tagsDePosts: { artigo: "a", nome: "tag", plural: "tags", campoDoNome: "nome", situacao: null, rascunhoNaLixeira: false },
  categoriasDeArtigos: { artigo: "a", nome: "categoria", plural: "categorias", campoDoNome: "nome", situacao: ATIVA, rascunhoNaLixeira: false },
  tagsDeArtigos: { artigo: "a", nome: "tag", plural: "tags", campoDoNome: "nome", situacao: null, rascunhoNaLixeira: false },
  categoriasDeProdutos: { artigo: "a", nome: "categoria", plural: "categorias", campoDoNome: "nome", situacao: null, rascunhoNaLixeira: false },
};

export function ehColecaoDoPainel(valor: unknown): valor is ColecaoDoPainel {
  return typeof valor === "string" && Object.hasOwn(COLECOES_DO_PAINEL, valor);
}

// Situação na tela: a lixeira vale antes de qualquer outra. Item sem campo de
// situação, fora da lixeira, conta como publicado (aparece no site).
export function situacaoDoItem(colecao: ColecaoDoPainel, dados: Dados): Situacao {
  if (dados.excluidoEm) return "lixeira";
  const regra = COLECOES_DO_PAINEL[colecao].situacao;
  if (!regra) return "publicado";
  return regra.publicado(dados) ? "publicado" : "rascunho";
}

export function nomeDoItem(colecao: ColecaoDoPainel, dados: Dados): string {
  const nome = dados[COLECOES_DO_PAINEL[colecao].campoDoNome];
  return typeof nome === "string" && nome.trim() ? nome.trim() : "Sem título";
}

// "Post", "Categoria": começo de frase.
export function rotuloComMaiuscula(colecao: ColecaoDoPainel): string {
  const { nome } = COLECOES_DO_PAINEL[colecao];
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

export const PALAVRA_DE_CONFIRMACAO = "EXCLUIR";

export const MENSAGENS_DA_LIXEIRA = {
  naoEncontrado: "Item não encontrado. Recarregue a página.",
  naLixeira: "Este item está na lixeira. Restaure antes de publicar.",
  jaNaLixeira: "Este item já está na lixeira.",
  foraDaLixeira: "Este item não está na lixeira.",
  soDaLixeira: "Só é possível excluir de vez um item que já está na lixeira.",
  confirmacao: `Para excluir de vez, digite ${PALAVRA_DE_CONFIRMACAO} ou o nome exato do item.`,
  semSituacao: "Este item não tem publicação: ele aparece no site enquanto estiver fora da lixeira.",
} as const;

// Sem espaços nas pontas, espaços repetidos viram um e sem diferença de
// maiúsculas (a confirmação é para evitar o clique por engano, não um teste
// de digitação).
function normalizar(texto: string): string {
  return texto.replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

// Confirmação reforçada: a palavra EXCLUIR ou o nome do item.
export function confirmacaoDeExclusaoValida(digitado: unknown, nome: string): boolean {
  if (typeof digitado !== "string") return false;
  const valor = normalizar(digitado);
  if (!valor) return false;
  return valor === normalizar(PALAVRA_DE_CONFIRMACAO) || (normalizar(nome) !== "" && valor === normalizar(nome));
}

// Uso que impede o "Excluir de vez" (ex.: categoria usada por posts).
export type UsoQueImpede = { onde: string; quantidade: number; exemplos: string[] };

const aspas = (texto: string) => `"${texto}"`;

// "Não é possível excluir de vez: está em uso em 3 posts (ex.: "A", "B"). ..."
export function mensagemDeUso(usos: UsoQueImpede[]): string {
  const partes = usos.map(({ onde, quantidade, exemplos }) => `${quantidade} ${onde}${exemplos.length > 0 ? ` (ex.: ${exemplos.map(aspas).join(", ")})` : ""}`);
  return `Não é possível excluir de vez: está em uso em ${partes.join(" e em ")}. Tire o vínculo nesses itens antes, inclusive nos que estão na lixeira.`;
}

// Resumo do registro de alterações: só o tipo do item e o que aconteceu, sem
// o nome (que pode ser de uma pessoa).
export function resumoDaAcao(colecao: ColecaoDoPainel, acao: "lixeira" | "restaurar" | "excluirDeVez" | "ligar" | "desligar"): string {
  const { artigo, situacao } = COLECOES_DO_PAINEL[colecao];
  const rotulo = rotuloComMaiuscula(colecao);
  const generoA = artigo === "a";
  const ajustar = (palavra: string) => (generoA ? palavra.replace(/o$/, "a") : palavra);
  switch (acao) {
    case "lixeira":
      return `${rotulo} ${ajustar("movido")} para a lixeira.`;
    case "restaurar":
      return `${rotulo} ${ajustar("restaurado")} da lixeira.`;
    case "excluirDeVez":
      return `${rotulo} ${ajustar("excluído")} de vez.`;
    case "ligar":
      return `${rotulo} ${situacao?.ligado ?? ajustar("publicado")}.`;
    case "desligar":
      return `${rotulo} ${situacao?.desligado ?? ajustar("despublicado")}.`;
  }
}

// ---------- Ações em lote (etapa 2, 04/11/2026) ----------

export type AcaoEmLote = "despublicar" | "lixeira" | "restaurar";
export const ACOES_EM_LOTE: readonly AcaoEmLote[] = ["despublicar", "lixeira", "restaurar"];
export const LIMITE_DO_LOTE = 100;

export function ehAcaoEmLote(valor: unknown): valor is AcaoEmLote {
  return typeof valor === "string" && (ACOES_EM_LOTE as readonly string[]).includes(valor);
}

// Ids do lote: lista de 1 a LIMITE_DO_LOTE ids válidos, sem repetir.
export function lerIdsDoLote(valor: unknown, ehId: (id: unknown) => id is string): string[] | null {
  if (!Array.isArray(valor) || valor.length === 0 || valor.length > LIMITE_DO_LOTE) return null;
  if (!valor.every(ehId)) return null;
  return [...new Set(valor)];
}

export type ResultadoDoLote = { feitos: string[]; semMudanca: string[]; falhas: { nome: string; motivo: string }[] };

// Verbo de cada ação em lote, no plural, com o gênero da coleção.
function verboDoLote(colecao: ColecaoDoPainel, acao: AcaoEmLote, quantidade: number): string {
  const { artigo, situacao } = COLECOES_DO_PAINEL[colecao];
  const plural = quantidade === 1 ? "" : "s";
  const genero = (palavra: string) => (artigo === "a" ? palavra.replace(/o$/, "a") : palavra);
  if (acao === "lixeira") return `${quantidade === 1 ? "foi" : "foram"} para a lixeira`;
  if (acao === "restaurar") return `${quantidade === 1 ? "foi" : "foram"} ${genero("restaurado")}${plural}`;
  return `${quantidade === 1 ? "foi" : "foram"} ${situacao?.desligado ?? genero("despublicado")}${plural}`;
}

// Resumo do lote em português, sem os nomes (que vão nos avisos):
// "3 posts foram para a lixeira. 1 já estava assim. 1 não pôde ser alterado."
export function resumoDoLote(colecao: ColecaoDoPainel, acao: AcaoEmLote, resultado: ResultadoDoLote): string {
  const { nome, plural, artigo } = COLECOES_DO_PAINEL[colecao];
  const feitos = resultado.feitos.length;
  const partes: string[] = [];
  if (feitos > 0) partes.push(`${feitos} ${feitos === 1 ? nome : plural} ${verboDoLote(colecao, acao, feitos)}.`);
  if (resultado.semMudanca.length > 0) partes.push(`${resultado.semMudanca.length} já ${resultado.semMudanca.length === 1 ? "estava" : "estavam"} assim.`);
  if (resultado.falhas.length > 0) {
    const quantos = resultado.falhas.length;
    partes.push(`${quantos} não ${quantos === 1 ? "pôde" : "puderam"} ser ${artigo === "a" ? "alterada" : "alterado"}${quantos === 1 ? "" : "s"}; veja o motivo abaixo.`);
  }
  return partes.join(" ") || "Nada foi alterado.";
}

// Publicação e lixeira são condições independentes: documentos legados ou
// gravações simultâneas não podem recolocar um item excluído no site.
export function conteudoPublicadoVisivel(item: { status: string; excluidoEm?: unknown } | null | undefined): boolean {
  return item?.status === "publicado" && !item.excluidoEm;
}
