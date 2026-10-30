// Imagens da home editadas no painel (29/10/2026): documento único
// configuracoes/home com os banners do carrossel e as imagens fixas das
// sections. Puro (sem Firebase): usado pela home, pelo painel, pela gravação
// e pelos testes. Sem documento, ou com um espaço vazio, a home mostra
// exatamente o padrão de antes (slides de SLIDES_DO_BANNER e placeholders).
import type { ImagemNaTela } from "../midia/tela.ts";
import { ehIdDeDocumentoValido } from "../validacao.ts";
import { SLIDES_DO_BANNER, type SlideDoBanner } from "./banners.ts";

export const COLECAO_DA_HOME = "configuracoes";
export const DOCUMENTO_DA_HOME = "home";
export const LIMITE_DE_BANNERS = 8;
export const LIMITE_DO_ALT_DA_HOME = 200;
export const LIMITE_DO_LINK = 2048;

// Espaços de imagem fixa da home, com identificador estável (também o id do
// dono da imagem, lib/midia/dono.ts) e a proporção vinda do CSS atual.
export const ESPACOS_DA_HOME = [
  {
    identificador: "secao-mutiroes",
    nome: "Mutirões que Transformam Vidas",
    onde: "ao lado dos números, na terceira faixa da home",
    proporcao: "4:5, em pé (ocupa a coluna ao lado dos números, com no mínimo 500 px de altura; a imagem é recortada para preencher)",
  },
  {
    identificador: "secao-faca-parte",
    nome: "Faça parte dessa rede",
    onde: "atrás da caixa da chamada final, no fim da home",
    proporcao: "2:1, deitada (largura do conteúdo e 600 px de altura; a imagem é recortada para preencher)",
  },
] as const;

export type IdentificadorDoEspaco = (typeof ESPACOS_DA_HOME)[number]["identificador"];

export const PROPORCAO_DO_BANNER = "12:5, deitada (1920 x 800 px; ocupa a largura toda da tela e é recortada nas pontas)";

export type BannerDaHome = {
  // Chave estável do banner (também o id do dono das imagens dele).
  chave: string;
  ordem: number;
  midiaId: string | null;
  alt: string;
  href: string;
  ativo: boolean;
};

export type ImagemDoEspaco = { midiaId: string | null; alt: string };

export type ConfiguracaoDaHome = {
  banners: BannerDaHome[];
  imagens: Partial<Record<IdentificadorDoEspaco, ImagemDoEspaco>>;
};

const CHAVE_DO_BANNER = /^banner-[a-z0-9]{4,40}$/;

export function ehChaveDeBanner(valor: unknown): valor is string {
  return typeof valor === "string" && CHAVE_DO_BANNER.test(valor);
}

export function ehEspacoDaHome(valor: unknown): valor is IdentificadorDoEspaco {
  return ESPACOS_DA_HOME.some((espaco) => espaco.identificador === valor);
}

// "Primeiro", "Segundo"... para os nomes dos banners no painel.
const ORDINAIS = ["Primeiro", "Segundo", "Terceiro", "Quarto", "Quinto", "Sexto", "Sétimo", "Oitavo"];

export function nomeDoBanner(posicao: number): string {
  return `${ORDINAIS[posicao - 1] ?? `${posicao}º`} banner`;
}

// Link de destino do banner: vazio (sem link), caminho interno começando com
// "/" ou endereço https completo. Recusa javascript:, data:, http:, "//",
// barra invertida, espaços e endereços inválidos.
export function validarLinkDoBanner(valor: unknown): { ok: true; href: string } | { ok: false; mensagem: string } {
  const href = typeof valor === "string" ? valor.trim() : "";
  if (!href) return { ok: true, href: "" };
  const invalido = { ok: false as const, mensagem: "Use um caminho do site começando com / (ex.: /loja) ou um endereço completo começando com https://." };
  if (href.length > LIMITE_DO_LINK) return { ok: false, mensagem: `O link aceita no máximo ${LIMITE_DO_LINK} caracteres.` };
  if (/[\s\\\u0000-\u001f\u007f]/.test(href)) return invalido;
  if (href.startsWith("/")) return href.startsWith("//") ? invalido : { ok: true, href };
  try {
    const endereco = new URL(href);
    if (endereco.protocol !== "https:" || !endereco.hostname.includes(".")) return invalido;
    return { ok: true, href };
  } catch {
    return invalido;
  }
}

export function linkEhExterno(href: string): boolean {
  return href.startsWith("https://");
}

function texto(valor: unknown, limite: number): string {
  return typeof valor === "string" ? valor.trim().replace(/\s+/g, " ").slice(0, limite) : "";
}

// Ordem dos banners: pelo campo ordem e, no empate, pela chave.
export function ordenarBanners(banners: BannerDaHome[]): BannerDaHome[] {
  return [...banners].sort((a, b) => a.ordem - b.ordem || a.chave.localeCompare(b.chave));
}

// Numera de 1 em diante, na ordem atual.
export function renumerarBanners(banners: BannerDaHome[]): BannerDaHome[] {
  return banners.map((banner, indice) => ({ ...banner, ordem: indice + 1 }));
}

// Leva o banner para a posição pedida (1 = primeiro), limitada às pontas.
export function posicionarBanner(banners: BannerDaHome[], chave: string, posicao: number): BannerDaHome[] {
  const ordenados = ordenarBanners(banners);
  const atual = ordenados.findIndex((banner) => banner.chave === chave);
  if (atual < 0) return renumerarBanners(ordenados);
  const destino = Math.min(Math.max(Math.round(posicao) || 1, 1), ordenados.length) - 1;
  const [banner] = ordenados.splice(atual, 1);
  ordenados.splice(destino, 0, banner);
  return renumerarBanners(ordenados);
}

// Leitura tolerante do documento: o que não tiver a forma esperada fica de
// fora (vale o padrão da home).
export function lerConfiguracaoDaHome(dados: unknown): ConfiguracaoDaHome {
  const campos = dados && typeof dados === "object" ? (dados as Record<string, unknown>) : {};
  const banners = (Array.isArray(campos.banners) ? campos.banners : [])
    .filter((banner): banner is Record<string, unknown> => Boolean(banner) && typeof banner === "object" && ehChaveDeBanner((banner as Record<string, unknown>).chave))
    .map((banner) => {
      const link = validarLinkDoBanner(banner.href);
      return {
        chave: banner.chave as string,
        ordem: typeof banner.ordem === "number" && Number.isFinite(banner.ordem) ? banner.ordem : Number.MAX_SAFE_INTEGER,
        midiaId: ehIdDeDocumentoValido(banner.midiaId) ? banner.midiaId : null,
        alt: texto(banner.alt, LIMITE_DO_ALT_DA_HOME),
        href: link.ok ? link.href : "",
        ativo: banner.ativo === true,
      };
    })
    .filter((banner, indice, lista) => lista.findIndex((outro) => outro.chave === banner.chave) === indice)
    .slice(0, LIMITE_DE_BANNERS);
  const imagens: ConfiguracaoDaHome["imagens"] = {};
  const mapa = campos.imagens && typeof campos.imagens === "object" ? (campos.imagens as Record<string, unknown>) : {};
  for (const { identificador } of ESPACOS_DA_HOME) {
    const valor = mapa[identificador];
    if (!valor || typeof valor !== "object") continue;
    const { midiaId, alt } = valor as Record<string, unknown>;
    if (ehIdDeDocumentoValido(midiaId)) imagens[identificador] = { midiaId, alt: texto(alt, LIMITE_DO_ALT_DA_HOME) };
  }
  return { banners: renumerarBanners(ordenarBanners(banners)), imagens };
}

// Slides do carrossel para o site: só os banners ativos com imagem
// disponível, na ordem. Sem nenhum, o carrossel padrão de antes.
export function slidesDaHome(configuracao: ConfiguracaoDaHome | null, imagens: Map<string, ImagemNaTela>): SlideDoBanner[] {
  const slides = ordenarBanners(configuracao?.banners ?? [])
    .filter((banner) => banner.ativo && banner.midiaId && imagens.has(banner.midiaId))
    .map((banner) => {
      const midia = imagens.get(banner.midiaId as string) as ImagemNaTela;
      const alt = banner.alt || midia.alt;
      return { imagem: "", midia: { ...midia, alt }, alt, href: banner.href, rotulo: "" };
    });
  return slides.length > 0 ? slides : SLIDES_DO_BANNER;
}

// Imagem de um espaço fixo para o site, ou null (o site mostra o placeholder).
export function imagemDoEspaco(configuracao: ConfiguracaoDaHome | null, identificador: IdentificadorDoEspaco, imagens: Map<string, ImagemNaTela>): ImagemNaTela | null {
  const escolhida = configuracao?.imagens[identificador];
  if (!escolhida?.midiaId) return null;
  const midia = imagens.get(escolhida.midiaId);
  return midia ? { ...midia, alt: escolhida.alt || midia.alt } : null;
}

// Todas as imagens que a configuração usa (para buscar de uma vez).
export function midiasDaHome(configuracao: ConfiguracaoDaHome | null): string[] {
  if (!configuracao) return [];
  return [...configuracao.banners.map((banner) => banner.midiaId), ...Object.values(configuracao.imagens).map((imagem) => imagem?.midiaId)].filter(
    (id): id is string => typeof id === "string",
  );
}

export type CampoDoBanner = "midiaId" | "alt" | "href" | "posicao" | "ativo";
export type DadosDoBanner = { chave: string; midiaId: string | null; alt: string; href: string; ativo: boolean; posicao: number };

// Formulário do banner (modal de /admin/home). Erros em português, por campo.
export function lerBannerDoFormulario(campos: {
  chave: unknown;
  midiaId: unknown;
  alt: unknown;
  href: unknown;
  ativo: unknown;
  posicao: unknown;
}): { ok: true; dados: DadosDoBanner } | { ok: false; erros: Partial<Record<CampoDoBanner, string>>; mensagem: string } {
  if (!ehChaveDeBanner(campos.chave)) return { ok: false, erros: {}, mensagem: "Banner não encontrado. Recarregue a página." };
  const erros: Partial<Record<CampoDoBanner, string>> = {};
  const midiaId = campos.midiaId === "" || campos.midiaId === null || campos.midiaId === undefined ? null : campos.midiaId;
  if (midiaId !== null && !ehIdDeDocumentoValido(midiaId)) erros.midiaId = "Imagem inválida. Envie ou escolha a imagem de novo.";
  const alt = typeof campos.alt === "string" ? campos.alt.trim().replace(/\s+/g, " ") : "";
  if (midiaId && !alt) erros.alt = "Descreva a imagem no texto alternativo.";
  if (alt.length > LIMITE_DO_ALT_DA_HOME) erros.alt = `O texto alternativo aceita no máximo ${LIMITE_DO_ALT_DA_HOME} caracteres.`;
  const link = validarLinkDoBanner(campos.href);
  if (!link.ok) erros.href = link.mensagem;
  const ativo = campos.ativo === "sim";
  if (ativo && !midiaId && !erros.midiaId) erros.midiaId = "Um banner ativo precisa de imagem. Envie uma imagem ou deixe o banner inativo.";
  const posicao = Number(campos.posicao);
  if (!Number.isInteger(posicao) || posicao < 1 || posicao > LIMITE_DE_BANNERS) erros.posicao = `Escolha uma posição de 1 a ${LIMITE_DE_BANNERS}.`;
  if (Object.keys(erros).length > 0) return { ok: false, erros, mensagem: "Confira os campos marcados." };
  return { ok: true, dados: { chave: campos.chave, midiaId: midiaId as string | null, alt, href: link.ok ? link.href : "", ativo, posicao } };
}

// Imagem de um espaço fixo (modal de /admin/home).
export function lerImagemDoEspacoDoFormulario(campos: { identificador: unknown; midiaId: unknown; alt: unknown }):
  | { ok: true; identificador: IdentificadorDoEspaco; imagem: ImagemDoEspaco }
  | { ok: false; erros: Partial<Record<"midiaId" | "alt", string>>; mensagem: string } {
  if (!ehEspacoDaHome(campos.identificador)) return { ok: false, erros: {}, mensagem: "Espaço de imagem não encontrado. Recarregue a página." };
  const midiaId = campos.midiaId === "" || campos.midiaId === null || campos.midiaId === undefined ? null : campos.midiaId;
  if (midiaId !== null && !ehIdDeDocumentoValido(midiaId)) return { ok: false, erros: { midiaId: "Imagem inválida. Envie ou escolha a imagem de novo." }, mensagem: "Confira os campos marcados." };
  const alt = typeof campos.alt === "string" ? campos.alt.trim().replace(/\s+/g, " ") : "";
  if (midiaId && !alt) return { ok: false, erros: { alt: "Descreva a imagem no texto alternativo." }, mensagem: "Confira os campos marcados." };
  if (alt.length > LIMITE_DO_ALT_DA_HOME) return { ok: false, erros: { alt: `O texto alternativo aceita no máximo ${LIMITE_DO_ALT_DA_HOME} caracteres.` }, mensagem: "Confira os campos marcados." };
  return { ok: true, identificador: campos.identificador, imagem: { midiaId: midiaId as string | null, alt: midiaId ? alt : "" } };
}

// Nomes (sem valores) do que mudou num banner, para o registro de alterações.
export function camposAlteradosDoBanner(antes: BannerDaHome | null, depois: BannerDaHome): string[] {
  if (!antes) return ["imagem", "texto alternativo", "link", "ativo", "posição"];
  const alterados: string[] = [];
  if (antes.midiaId !== depois.midiaId) alterados.push("imagem");
  if (antes.alt !== depois.alt) alterados.push("texto alternativo");
  if (antes.href !== depois.href) alterados.push("link");
  if (antes.ativo !== depois.ativo) alterados.push("ativo");
  if (antes.ordem !== depois.ordem) alterados.push("posição");
  return alterados;
}
