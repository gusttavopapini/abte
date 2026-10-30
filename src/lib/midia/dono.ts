// Dono da imagem (29/10/2026): quem enviou a imagem pelo próprio formulário
// (capa de um post, foto de um profissional, galeria de um produto, espaço da
// home...). Campo opcional da mídia, { tipo, id, campo }: as imagens antigas e
// as enviadas direto na biblioteca não têm dono e continuam valendo. Em item
// novo, o id fica null até o item ser salvo, quando a ação completa o vínculo.
// Puro (sem Firebase), usado pelo servidor, pelo painel e pelos testes.
import { ehIdDeDocumentoValido } from "../validacao.ts";

export const CAMPOS_POR_TIPO_DE_DONO = {
  post: ["capa", "corpo"],
  artigo: ["imagem"],
  produto: ["galeria"],
  profissional: ["foto"],
  categoriaDeArtigo: ["imagem"],
  categoriaDeProduto: ["imagem"],
  diretoria: ["foto"],
  home: ["banner", "secao"],
} as const;

export type TipoDeDono = keyof typeof CAMPOS_POR_TIPO_DE_DONO;
export type CampoDoDono = (typeof CAMPOS_POR_TIPO_DE_DONO)[TipoDeDono][number];
export type DonoDaMidia = { tipo: TipoDeDono; id: string | null; campo: CampoDoDono };

export const TIPOS_DE_DONO = Object.keys(CAMPOS_POR_TIPO_DE_DONO) as TipoDeDono[];

// Nomes para as telas do painel (filtro e "Usada em").
export const ROTULOS_DOS_DONOS: Record<TipoDeDono, string> = {
  post: "Post do blog",
  artigo: "Artigo",
  produto: "Produto da loja",
  profissional: "Profissional",
  categoriaDeArtigo: "Categoria de artigos",
  categoriaDeProduto: "Categoria da loja",
  diretoria: "Diretoria",
  home: "Home",
};

export const ROTULOS_DOS_CAMPOS: Record<CampoDoDono, string> = {
  capa: "capa",
  corpo: "imagem no texto",
  imagem: "imagem",
  galeria: "galeria",
  foto: "foto",
  banner: "banner",
  secao: "imagem de seção",
};

// Na home, o id é o identificador do espaço (ex.: "secao-mutiroes") ou a
// chave do banner, e não um id de documento.
const ID_DO_ESPACO_DA_HOME = /^[a-z0-9-]{1,60}$/;

export const MENSAGEM_DONO_INVALIDO = "Não foi possível saber a que item a imagem pertence. Recarregue a página e tente de novo.";

function ehTipoDeDono(valor: unknown): valor is TipoDeDono {
  return typeof valor === "string" && Object.hasOwn(CAMPOS_POR_TIPO_DE_DONO, valor);
}

function idValido(tipo: TipoDeDono, id: string): boolean {
  return tipo === "home" ? ID_DO_ESPACO_DA_HOME.test(id) : ehIdDeDocumentoValido(id);
}

// Lê o dono vindo do formulário de envio (campos donoTipo, donoId e
// donoCampo). Os três vazios: envio sem dono (biblioteca). Qualquer valor
// estranho recusa o envio.
export function lerDono(tipo: unknown, id: unknown, campo: unknown): { ok: true; dono: DonoDaMidia | null } | { ok: false; mensagem: string } {
  const vazio = (valor: unknown) => valor === null || valor === undefined || valor === "";
  if (vazio(tipo) && vazio(id) && vazio(campo)) return { ok: true, dono: null };
  if (!ehTipoDeDono(tipo)) return { ok: false, mensagem: MENSAGEM_DONO_INVALIDO };
  const campos: readonly string[] = CAMPOS_POR_TIPO_DE_DONO[tipo];
  if (typeof campo !== "string" || !campos.includes(campo)) return { ok: false, mensagem: MENSAGEM_DONO_INVALIDO };
  if (vazio(id)) return { ok: true, dono: { tipo, id: null, campo: campo as CampoDoDono } };
  if (typeof id !== "string" || !idValido(tipo, id)) return { ok: false, mensagem: MENSAGEM_DONO_INVALIDO };
  return { ok: true, dono: { tipo, id, campo: campo as CampoDoDono } };
}

// Dono gravado num documento de mídia (leitura tolerante: valor estranho
// vale como sem dono).
export function donoDoDocumento(valor: unknown): DonoDaMidia | null {
  if (!valor || typeof valor !== "object") return null;
  const { tipo, id, campo } = valor as Record<string, unknown>;
  const lido = lerDono(tipo, id ?? "", campo);
  return lido.ok ? lido.dono : null;
}

// O vínculo de um item novo se completa ao salvar: só a mídia com o mesmo
// tipo e campo e ainda sem id recebe o id do item. Mídia sem dono, de outro
// item ou de outro campo fica como está.
export function precisaCompletarDono(atual: DonoDaMidia | null, tipo: TipoDeDono, campo: CampoDoDono): boolean {
  return atual !== null && atual.tipo === tipo && atual.campo === campo && atual.id === null;
}

// Ids das imagens no texto em Markdown restrito: ![alt](midia:ID).
export function idsDasImagensNoTexto(texto: string): string[] {
  return [...new Set([...texto.matchAll(/\]\(midia:([A-Za-z0-9]{1,128})\)/g)].map(([, id]) => id).filter(ehIdDeDocumentoValido))];
}

// "Post do blog (capa)": descrição curta do dono para a tela.
export function descreverDono(dono: DonoDaMidia): string {
  return `${ROTULOS_DOS_DONOS[dono.tipo]} (${ROTULOS_DOS_CAMPOS[dono.campo]})`;
}
