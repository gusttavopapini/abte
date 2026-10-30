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

// Proporção recomendada de uma versão da imagem (30/10/2026): o texto para o
// painel, o tamanho em pixels e a razão da moldura da prévia (largura/altura).
export type ProporcaoRecomendada = { texto: string; tamanho: string; razao: number };

// Duas versões de cada imagem (30/10/2026): computador (obrigatória para o
// espaço ter imagem) e celular (opcional, mostrada até 767px). As proporções
// vêm do CSS atual de cada espaço, medidas no navegador em 390, 767, 768,
// 1024, 1280 e 1710 px (ver CLAUDE.md); o CSS não mudou.
export type ProporcoesDoEspaco = { computador: ProporcaoRecomendada; celular: ProporcaoRecomendada };

// Espaços de imagem fixa da home, com identificador estável (também o id do
// dono da imagem, lib/midia/dono.ts) e a proporção vinda do CSS atual.
export const ESPACOS_DA_HOME = [
  {
    identificador: "secao-mutiroes",
    nome: "Mutirões que Transformam Vidas",
    onde: "ao lado dos números, na terceira faixa da home",
    proporcoes: {
      computador: { texto: "5:4, deitada (a coluna ao lado dos números, com cerca de 580 x 520 px numa tela de 1280 px; a imagem é recortada para preencher)", tamanho: "1500 x 1200 px", razao: 5 / 4 },
      celular: { texto: "5:7, em pé (largura da tela e 500 px de altura, abaixo dos números; a imagem é recortada para preencher)", tamanho: "1000 x 1400 px", razao: 5 / 7 },
    },
  },
  {
    identificador: "secao-faca-parte",
    nome: "Faça parte dessa rede",
    onde: "atrás da caixa da chamada final, no fim da home",
    proporcoes: {
      computador: { texto: "2:1, deitada (largura do conteúdo e 600 px de altura; a imagem é recortada para preencher)", tamanho: "2400 x 1200 px", razao: 2 },
      celular: { texto: "3:5, em pé (largura da tela e 600 px de altura; a imagem é recortada para preencher)", tamanho: "960 x 1600 px", razao: 3 / 5 },
    },
  },
] as const satisfies readonly { identificador: string; nome: string; onde: string; proporcoes: ProporcoesDoEspaco }[];

export type IdentificadorDoEspaco = (typeof ESPACOS_DA_HOME)[number]["identificador"];

export const PROPORCOES_DO_BANNER: ProporcoesDoEspaco = {
  computador: { texto: "16:9, deitada (largura toda da tela e 90% da altura da janela; a imagem é recortada nas pontas)", tamanho: "1920 x 1080 px", razao: 16 / 9 },
  celular: { texto: "4:5, em pé (largura toda da tela e no mínimo 500 px de altura; a imagem é recortada nas pontas)", tamanho: "1080 x 1350 px", razao: 4 / 5 },
};

export const AVISO_SEM_VERSAO_CELULAR = "Sem versão para celular: no celular será usada a imagem de computador, que pode ser cortada.";

export type BannerDaHome = {
  // Chave estável do banner (também o id do dono das imagens dele).
  chave: string;
  ordem: number;
  // Versão para computador e, opcional, para celular (30/10/2026; documentos
  // antigos sem o campo valem como "sem versão celular").
  midiaId: string | null;
  midiaMobileId: string | null;
  alt: string;
  href: string;
  ativo: boolean;
};

// Um alt só por espaço, usado nas duas versões.
export type ImagemDoEspaco = { midiaId: string | null; midiaMobileId: string | null; alt: string };

// Imagem da home pronta para o site: a de computador e, se houver, a de
// celular (ImagemDaMidia monta um <picture> com as duas).
export type ImagemDaHomeNaTela = ImagemNaTela & { celular: ImagemNaTela | null };

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
        // Sem a de computador, a de celular não vale.
        midiaMobileId: ehIdDeDocumentoValido(banner.midiaId) && ehIdDeDocumentoValido(banner.midiaMobileId) ? banner.midiaMobileId : null,
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
    const { midiaId, midiaMobileId, alt } = valor as Record<string, unknown>;
    if (ehIdDeDocumentoValido(midiaId)) imagens[identificador] = { midiaId, midiaMobileId: ehIdDeDocumentoValido(midiaMobileId) ? midiaMobileId : null, alt: texto(alt, LIMITE_DO_ALT_DA_HOME) };
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
      // Versão celular na lixeira ou excluída: fica só a de computador.
      const celular = banner.midiaMobileId ? imagens.get(banner.midiaMobileId) ?? null : null;
      return { imagem: "", midia: { ...midia, alt, celular }, alt, href: banner.href, rotulo: "" };
    });
  return slides.length > 0 ? slides : SLIDES_DO_BANNER;
}

// Imagem de um espaço fixo para o site, ou null (o site mostra o placeholder).
export function imagemDoEspaco(configuracao: ConfiguracaoDaHome | null, identificador: IdentificadorDoEspaco, imagens: Map<string, ImagemNaTela>): ImagemDaHomeNaTela | null {
  const escolhida = configuracao?.imagens[identificador];
  if (!escolhida?.midiaId) return null;
  const midia = imagens.get(escolhida.midiaId);
  const celular = escolhida.midiaMobileId ? imagens.get(escolhida.midiaMobileId) ?? null : null;
  return midia ? { ...midia, alt: escolhida.alt || midia.alt, celular } : null;
}

// Todas as imagens que a configuração usa (para buscar de uma vez).
export function midiasDaHome(configuracao: ConfiguracaoDaHome | null): string[] {
  if (!configuracao) return [];
  return [
    ...configuracao.banners.flatMap((banner) => [banner.midiaId, banner.midiaMobileId]),
    ...Object.values(configuracao.imagens).flatMap((imagem) => [imagem?.midiaId, imagem?.midiaMobileId]),
  ].filter((id): id is string => typeof id === "string");
}

export type CampoDoBanner = "midiaId" | "midiaMobileId" | "alt" | "href" | "posicao" | "ativo";
export type DadosDoBanner = { chave: string; midiaId: string | null; midiaMobileId: string | null; alt: string; href: string; ativo: boolean; posicao: number };

const MENSAGEM_IMAGEM_INVALIDA = "Imagem inválida. Envie ou escolha a imagem de novo.";
export const MENSAGEM_CELULAR_SEM_COMPUTADOR = "Envie também a versão para computador: a versão para celular é opcional e só vale junto com ela.";

function idDoFormulario(valor: unknown): unknown {
  return valor === "" || valor === null || valor === undefined ? null : valor;
}

// As duas versões vindas do formulário: ids válidos, e a de celular só junto
// com a de computador.
function lerVersoes(campos: { midiaId: unknown; midiaMobileId?: unknown }): { midiaId: string | null; midiaMobileId: string | null; erros: Partial<Record<"midiaId" | "midiaMobileId", string>> } {
  const erros: Partial<Record<"midiaId" | "midiaMobileId", string>> = {};
  const midiaId = idDoFormulario(campos.midiaId);
  const midiaMobileId = idDoFormulario(campos.midiaMobileId);
  if (midiaId !== null && !ehIdDeDocumentoValido(midiaId)) erros.midiaId = MENSAGEM_IMAGEM_INVALIDA;
  if (midiaMobileId !== null && !ehIdDeDocumentoValido(midiaMobileId)) erros.midiaMobileId = MENSAGEM_IMAGEM_INVALIDA;
  else if (midiaMobileId !== null && midiaId === null) erros.midiaMobileId = MENSAGEM_CELULAR_SEM_COMPUTADOR;
  return { midiaId: midiaId as string | null, midiaMobileId: midiaMobileId as string | null, erros };
}

// Confere no servidor as duas versões escolhidas (30/10/2026): cada uma,
// quando presente e diferente da já gravada, precisa ser uma mídia existente
// e ativa (fora da lixeira, com variantes). A conferência chega por parâmetro
// (midiaPodeSerEscolhida, na gravação), para o teste rodar sem Firebase.
// Devolve o campo recusado, ou null.
export async function versaoRecusada(
  escolhidas: { midiaId: string | null; midiaMobileId: string | null },
  anteriores: { midiaId: string | null; midiaMobileId: string | null } | null,
  disponivel: (id: string) => Promise<boolean>,
): Promise<"midiaId" | "midiaMobileId" | null> {
  for (const campo of ["midiaId", "midiaMobileId"] as const) {
    const id = escolhidas[campo];
    if (!id || id === anteriores?.[campo]) continue;
    if (!(await disponivel(id))) return campo;
  }
  return null;
}

// Formulário do banner (modal de /admin/home). Erros em português, por campo.
export function lerBannerDoFormulario(campos: {
  chave: unknown;
  midiaId: unknown;
  midiaMobileId?: unknown;
  alt: unknown;
  href: unknown;
  ativo: unknown;
  posicao: unknown;
}): { ok: true; dados: DadosDoBanner } | { ok: false; erros: Partial<Record<CampoDoBanner, string>>; mensagem: string } {
  if (!ehChaveDeBanner(campos.chave)) return { ok: false, erros: {}, mensagem: "Banner não encontrado. Recarregue a página." };
  const { midiaId, midiaMobileId, erros: errosDasVersoes } = lerVersoes(campos);
  const erros: Partial<Record<CampoDoBanner, string>> = { ...errosDasVersoes };
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
  return { ok: true, dados: { chave: campos.chave, midiaId, midiaMobileId, alt, href: link.ok ? link.href : "", ativo, posicao } };
}

// Imagem de um espaço fixo (modal de /admin/home).
export function lerImagemDoEspacoDoFormulario(campos: { identificador: unknown; midiaId: unknown; midiaMobileId?: unknown; alt: unknown }):
  | { ok: true; identificador: IdentificadorDoEspaco; imagem: ImagemDoEspaco }
  | { ok: false; erros: Partial<Record<"midiaId" | "midiaMobileId" | "alt", string>>; mensagem: string } {
  if (!ehEspacoDaHome(campos.identificador)) return { ok: false, erros: {}, mensagem: "Espaço de imagem não encontrado. Recarregue a página." };
  const { midiaId, midiaMobileId, erros } = lerVersoes(campos);
  if (Object.keys(erros).length > 0) return { ok: false, erros, mensagem: "Confira os campos marcados." };
  const alt = typeof campos.alt === "string" ? campos.alt.trim().replace(/\s+/g, " ") : "";
  if (midiaId && !alt) return { ok: false, erros: { alt: "Descreva a imagem no texto alternativo." }, mensagem: "Confira os campos marcados." };
  if (alt.length > LIMITE_DO_ALT_DA_HOME) return { ok: false, erros: { alt: `O texto alternativo aceita no máximo ${LIMITE_DO_ALT_DA_HOME} caracteres.` }, mensagem: "Confira os campos marcados." };
  return { ok: true, identificador: campos.identificador, imagem: { midiaId, midiaMobileId, alt: midiaId ? alt : "" } };
}

// Nomes (sem valores) do que mudou num banner, para o registro de alterações.
export function camposAlteradosDoBanner(antes: BannerDaHome | null, depois: BannerDaHome): string[] {
  if (!antes) return ["imagem", ...(depois.midiaMobileId ? ["imagem para celular"] : []), "texto alternativo", "link", "ativo", "posição"];
  const alterados: string[] = [];
  if (antes.midiaId !== depois.midiaId) alterados.push("imagem");
  if (antes.midiaMobileId !== depois.midiaMobileId) alterados.push("imagem para celular");
  if (antes.alt !== depois.alt) alterados.push("texto alternativo");
  if (antes.href !== depois.href) alterados.push("link");
  if (antes.ativo !== depois.ativo) alterados.push("ativo");
  if (antes.ordem !== depois.ordem) alterados.push("posição");
  return alterados;
}

// Nomes (sem valores) do que mudou na imagem de um espaço.
export function camposAlteradosDoEspaco(antes: ImagemDoEspaco | null, depois: ImagemDoEspaco): string[] {
  return [
    ...((antes?.midiaId ?? null) !== depois.midiaId ? ["imagem"] : []),
    ...((antes?.midiaMobileId ?? null) !== depois.midiaMobileId ? ["imagem para celular"] : []),
    ...((antes?.alt ?? "") !== depois.alt ? ["texto alternativo"] : []),
  ];
}
