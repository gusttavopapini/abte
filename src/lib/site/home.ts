// Imagens da home editadas no painel (29/10/2026): documento único
// configuracoes/home com os banners do carrossel e as imagens fixas das
// sections. Puro (sem Firebase): usado pela home, pelo painel, pela gravação
// e pelos testes. Sem documento, ou com um espaço vazio, a home mostra
// exatamente o padrão de antes (slides de SLIDES_DO_BANNER e placeholders).
import type { ImagemNaTela } from "../midia/tela.ts";
import { ehIdDeDocumentoValido } from "../validacao.ts";
import { SLIDES_DO_BANNER, type SlideDoBanner } from "./banners.ts";
import { DOMINIOS_DO_SITE } from "../../config/links.ts";
import { ancoraDoLink } from "./ancoras.ts";
import { ehCaminhoDosArtigos } from "./configuracoes.ts";
import { lerVideoQuemSomos, type VideoQuemSomos } from "./videoQuemSomos.ts";

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

// Banner em tela cheia (30/10/2026): largura e altura da janela.
export const PROPORCOES_DO_BANNER: ProporcoesDoEspaco & { tablet: ProporcaoRecomendada } = {
  computador: { texto: "16:9, deitada (a tela inteira do computador, a partir de 1024 px; a imagem é recortada nas bordas conforme o tamanho da tela)", tamanho: "1920 x 1080 px", razao: 16 / 9 },
  // Tablet (768 a 1023 px), 30/10/2026.
  tablet: { texto: "3:4, em pé (a tela inteira do tablet, de 768 a 1023 px; a imagem é recortada nas bordas conforme o tamanho da tela)", tamanho: "1536 x 2048 px", razao: 3 / 4 },
  celular: { texto: "9:16, em pé (a tela inteira do celular, até 767 px; a imagem é recortada nas bordas conforme o tamanho da tela)", tamanho: "1080 x 1920 px", razao: 9 / 16 },
};

// Texto e botão em código sobre a imagem do banner (30/10/2026): a arte
// enviada passa a ser só a imagem. Todos vazios: o banner é só a imagem,
// como antes (banners antigos com o texto dentro da arte).
export const LIMITE_DO_TITULO_DO_BANNER = 90;
export const LIMITE_DO_SUBTITULO_DO_BANNER = 200;
export const LIMITE_DO_TEXTO_DO_BOTAO = 30;
export const POSICOES_DO_TEXTO = ["esquerda", "centro", "direita"] as const;
export type PosicaoDoTexto = (typeof POSICOES_DO_TEXTO)[number];
export const ROTULOS_DAS_POSICOES_DO_TEXTO: Record<PosicaoDoTexto, string> = { esquerda: "Esquerda", centro: "Centro", direita: "Direita" };
export const AVISO_IMAGEM_SEM_TEXTO = "Envie a imagem sem texto. Deixe uma área calma onde o texto vai ficar.";
export const AVISO_VERSAO_FALTANDO = "Sem a versão para tablet ou para celular, será usada a imagem da versão mais próxima (celular usa a de tablet e, sem ela, a de computador; tablet usa a de computador).";

export type TextoDoBanner = { titulo: string; trechoEmDestaque: string; subtitulo: string; textoDoBotao: string; posicao: PosicaoDoTexto };

export function ehPosicaoDoTexto(valor: unknown): valor is PosicaoDoTexto {
  return typeof valor === "string" && (POSICOES_DO_TEXTO as readonly string[]).includes(valor);
}

// O banner tem texto em código? (sem nenhum campo, é só a imagem)
export function temTextoNoBanner(texto: Pick<TextoDoBanner, "titulo" | "subtitulo" | "textoDoBotao">): boolean {
  return Boolean(texto.titulo || texto.subtitulo || texto.textoDoBotao);
}

// Título dividido em partes, com o trecho em destaque marcado (a primeira
// ocorrência). Trecho vazio ou fora do título: o título inteiro, sem destaque.
export function partesDoTitulo(titulo: string, trecho: string): { texto: string; destaque: boolean }[] {
  const indice = trecho ? titulo.indexOf(trecho) : -1;
  if (indice < 0) return titulo ? [{ texto: titulo, destaque: false }] : [];
  return [
    { texto: titulo.slice(0, indice), destaque: false },
    { texto: trecho, destaque: true },
    { texto: titulo.slice(indice + trecho.length), destaque: false },
  ].filter((parte) => parte.texto);
}

export const DICA_DO_BANNER = "Mantenha textos e rostos na parte central da imagem; as bordas podem ser cortadas conforme o tamanho da tela.";

// Ponto de foco do banner (30/10/2026): a parte da imagem que fica à vista
// quando a tela corta as laterais. Ausente vale "centro" (documentos
// antigos continuam valendo). Só nos banners: as imagens das seções não
// ocupam a altura da tela.
export const PONTOS_DE_FOCO = ["esquerda", "centro", "direita"] as const;
export type PontoDeFoco = (typeof PONTOS_DE_FOCO)[number];
export const ROTULOS_DOS_PONTOS_DE_FOCO: Record<PontoDeFoco, string> = { esquerda: "Esquerda", centro: "Centro", direita: "Direita" };
export const MENSAGEM_PONTO_DE_FOCO_INVALIDO = "Escolha o ponto de foco: esquerda, centro ou direita.";

export function ehPontoDeFoco(valor: unknown): valor is PontoDeFoco {
  return typeof valor === "string" && (PONTOS_DE_FOCO as readonly string[]).includes(valor);
}

// object-position de cada ponto de foco (versões computador e celular).
export const POSICAO_DO_PONTO_DE_FOCO: Record<PontoDeFoco, string> = { esquerda: "0% 50%", centro: "50% 50%", direita: "100% 50%" };

// "Bem mais larga que 16:9": mais que 2:1 (ex.: 2000 x 900). Sem medidas,
// não avisa.
export const RAZAO_LARGA_DEMAIS = 2;
export const AVISO_IMAGEM_LARGA = "Esta imagem é mais larga que o formato recomendado e pode ser cortada nas laterais. Ajuste o ponto de foco ou envie uma versão em 16:9.";

export function bannerMuitoLargo(medidas: { largura: number; altura: number } | null | undefined): boolean {
  if (!medidas || !(medidas.largura > 0) || !(medidas.altura > 0)) return false;
  return medidas.largura / medidas.altura > RAZAO_LARGA_DEMAIS;
}

export const AVISO_SEM_VERSAO_CELULAR = "Sem versão para celular: no celular será usada a imagem de computador, que pode ser cortada.";

export type BannerDaHome = {
  // Chave estável do banner (também o id do dono das imagens dele).
  chave: string;
  ordem: number;
  // Versão para computador e, opcional, para celular (30/10/2026; documentos
  // antigos sem o campo valem como "sem versão celular").
  midiaId: string | null;
  midiaMobileId: string | null;
  // Versão para tablet, 768 a 1023 px (30/10/2026; ausente: a de computador).
  midiaTabletId: string | null;
  alt: string;
  href: string;
  ativo: boolean;
  pontoDeFoco: PontoDeFoco;
  // Texto e botão em código (30/10/2026); vazios nos banners antigos.
  titulo: string;
  trechoEmDestaque: string;
  subtitulo: string;
  textoDoBotao: string;
  posicaoDoTexto: PosicaoDoTexto;
};

// Um alt só por espaço, usado nas duas versões.
export type ImagemDoEspaco = { midiaId: string | null; midiaMobileId: string | null; alt: string };

// Imagem da home pronta para o site: a de computador e, se houver, a de
// celular (ImagemDaMidia monta um <picture> com as duas).
export type ImagemDaHomeNaTela = ImagemNaTela & { celular: ImagemNaTela | null; tablet?: ImagemNaTela | null };

export type ConfiguracaoDaHome = {
  banners: BannerDaHome[];
  imagens: Partial<Record<IdentificadorDoEspaco, ImagemDoEspaco>>;
  // Vídeo de "Quem Somos" (30/10/2026); null: o padrão da home.
  video: VideoQuemSomos | null;
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

// Páginas conhecidas do site para o link do banner (30/10/2026; não há
// página "Quem Somos": é uma seção da home, na lista das âncoras).
export const PAGINAS_DO_SITE = [
  { href: "/blog", nome: "Blog" },
  { href: "/artigos", nome: "Artigos" },
  { href: "/loja", nome: "Loja" },
  { href: "/profissionais", nome: "Profissionais" },
  { href: "/diretoria", nome: "Diretoria" },
  { href: "/contato", nome: "Contato" },
  { href: "/doe", nome: "Doe para a ABTE" },
  { href: "/seja-associado", nome: "Seja associado" },
] as const;

export const MENSAGEM_LINK_INVALIDO = "Use um caminho do site começando com / (ex.: /loja) ou um endereço completo começando com https://.";
export const MENSAGEM_TEXTO_DO_BOTAO_COM_ENDERECO = "O texto do botão deve ser uma frase curta, como Acesse nosso blog. O endereço vai no campo Link de destino.";

// Caminho interno seguro: uma barra só no começo e só caracteres de URL
// (letras, números e - . _ ~ % / ? = & + : , ; ! * ' ( ) @ #).
const CAMINHO_SEGURO = /^\/(?!\/)[A-Za-z0-9\-._~%/?=&+:,;!*'()@#]*$/;

// Link de destino do banner, uma função só para o navegador e o servidor
// (30/10/2026): vazio (sem link), "#âncora" ou "/#âncora" da lista da home,
// caminho interno seguro (/blog, /blog/um-post, /loja?categoria=x) ou
// endereço https. Endereço do próprio site vira o caminho interno
// (convertido: true). Recusa javascript:, data:, http:, "//", barra
// invertida, espaços, âncora fora da lista e endereços malformados.
export function validarLinkDoBanner(valor: unknown, dominiosDoSite: readonly string[] = DOMINIOS_DO_SITE): { ok: true; href: string; convertido?: boolean } | { ok: false; mensagem: string } {
  const href = typeof valor === "string" ? valor.trim() : "";
  if (!href) return { ok: true, href: "" };
  if (href.length > LIMITE_DO_LINK) return { ok: false, mensagem: `O link aceita no máximo ${LIMITE_DO_LINK} caracteres.` };
  if (/[\s\\\u0000-\u001f\u007f]/.test(href)) return { ok: false, mensagem: MENSAGEM_LINK_INVALIDO };
  if (href.startsWith("#") || href.startsWith("/#")) return ancoraDoLink(href) ? { ok: true, href } : { ok: false, mensagem: "Escolha uma das seções da home da lista." };
  if (href.startsWith("/")) return CAMINHO_SEGURO.test(href) ? { ok: true, href } : { ok: false, mensagem: MENSAGEM_LINK_INVALIDO };
  let endereco: URL;
  try {
    endereco = new URL(href);
  } catch {
    return { ok: false, mensagem: MENSAGEM_LINK_INVALIDO };
  }
  if (endereco.protocol !== "https:" || !endereco.hostname.includes(".") || endereco.username || endereco.password) return { ok: false, mensagem: MENSAGEM_LINK_INVALIDO };
  if (dominiosDoSite.includes(endereco.hostname)) {
    const interno = `${endereco.pathname}${endereco.search}${endereco.hash}` || "/";
    const lido = validarLinkDoBanner(interno, dominiosDoSite);
    return lido.ok ? { ok: true, href: lido.href, convertido: true } : lido;
  }
  return { ok: true, href };
}

// O texto do botão parece um endereço? (começa com http ou tem "://")
export function textoDoBotaoPareceEndereco(texto: string): boolean {
  return /^\s*https?/i.test(texto) || texto.includes("://");
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

// Texto do banner gravado (leitura tolerante): acima dos limites é cortado;
// trecho em destaque fora do título é descartado.
function lerTextoDoBanner(banner: Record<string, unknown>): Omit<TextoDoBanner, "posicao"> & { posicaoDoTexto: PosicaoDoTexto } {
  const titulo = texto(banner.titulo, LIMITE_DO_TITULO_DO_BANNER);
  const trecho = texto(banner.trechoEmDestaque, LIMITE_DO_TITULO_DO_BANNER);
  return {
    titulo,
    trechoEmDestaque: trecho && titulo.includes(trecho) ? trecho : "",
    subtitulo: texto(banner.subtitulo, LIMITE_DO_SUBTITULO_DO_BANNER),
    textoDoBotao: texto(banner.textoDoBotao, LIMITE_DO_TEXTO_DO_BOTAO),
    posicaoDoTexto: ehPosicaoDoTexto(banner.posicaoDoTexto) ? banner.posicaoDoTexto : "esquerda",
  };
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
        midiaTabletId: ehIdDeDocumentoValido(banner.midiaId) && ehIdDeDocumentoValido(banner.midiaTabletId) ? banner.midiaTabletId : null,
        alt: texto(banner.alt, LIMITE_DO_ALT_DA_HOME),
        href: link.ok ? link.href : "",
        ativo: banner.ativo === true,
        // Ausente ou estranho: o centro, como antes.
        pontoDeFoco: ehPontoDeFoco(banner.pontoDeFoco) ? banner.pontoDeFoco : "centro",
        ...lerTextoDoBanner(banner),
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
  return { banners: renumerarBanners(ordenarBanners(banners)), imagens, video: lerVideoQuemSomos(campos.videoQuemSomos) };
}

// Slides do carrossel para o site: só os banners ativos com imagem
// disponível, na ordem. Sem nenhum, o carrossel padrão de antes.
// Com os Artigos fora do site (configuracoes/site, 30/10/2026), o banner
// com link para /artigos aparece sem link.
export function slidesDaHome(configuracao: ConfiguracaoDaHome | null, imagens: Map<string, ImagemNaTela>, artigosAtivo = true): SlideDoBanner[] {
  const slides = ordenarBanners(configuracao?.banners ?? [])
    .filter((banner) => banner.ativo && banner.midiaId && imagens.has(banner.midiaId))
    .map((banner) => {
      const midia = imagens.get(banner.midiaId as string) as ImagemNaTela;
      const alt = banner.alt || midia.alt;
      // Versão celular na lixeira ou excluída: fica só a de computador.
      const celular = banner.midiaMobileId ? imagens.get(banner.midiaMobileId) ?? null : null;
      const tablet = banner.midiaTabletId ? imagens.get(banner.midiaTabletId) ?? null : null;
      const href = !artigosAtivo && ehCaminhoDosArtigos(banner.href) ? "" : banner.href;
      const textoDoSlide = temTextoNoBanner(banner)
        ? { titulo: banner.titulo, trechoEmDestaque: banner.trechoEmDestaque, subtitulo: banner.subtitulo, textoDoBotao: href ? banner.textoDoBotao : "", posicao: banner.posicaoDoTexto }
        : null;
      return { imagem: "", midia: { ...midia, alt, celular, tablet }, alt, href, rotulo: "", pontoDeFoco: banner.pontoDeFoco, texto: textoDoSlide };
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
    ...configuracao.banners.flatMap((banner) => [banner.midiaId, banner.midiaMobileId, banner.midiaTabletId]),
    ...Object.values(configuracao.imagens).flatMap((imagem) => [imagem?.midiaId, imagem?.midiaMobileId]),
    configuracao.video?.capaMidiaId,
  ].filter((id): id is string => typeof id === "string");
}

export type CampoDoBanner =
  | "midiaId"
  | "midiaMobileId"
  | "midiaTabletId"
  | "alt"
  | "href"
  | "posicao"
  | "ativo"
  | "pontoDeFoco"
  | "titulo"
  | "trechoEmDestaque"
  | "subtitulo"
  | "textoDoBotao"
  | "posicaoDoTexto";
export type DadosDoBanner = {
  chave: string;
  midiaId: string | null;
  midiaMobileId: string | null;
  midiaTabletId: string | null;
  alt: string;
  href: string;
  ativo: boolean;
  posicao: number;
  pontoDeFoco: PontoDeFoco;
  titulo: string;
  trechoEmDestaque: string;
  subtitulo: string;
  textoDoBotao: string;
  posicaoDoTexto: PosicaoDoTexto;
};

const MENSAGEM_IMAGEM_INVALIDA = "Imagem inválida. Envie ou escolha a imagem de novo.";
export const MENSAGEM_CELULAR_SEM_COMPUTADOR = "Envie também a versão para computador: a versão para celular é opcional e só vale junto com ela.";
export const MENSAGEM_TABLET_SEM_COMPUTADOR = "Envie também a versão para computador: a versão para tablet é opcional e só vale junto com ela.";

function idDoFormulario(valor: unknown): unknown {
  return valor === "" || valor === null || valor === undefined ? null : valor;
}

// As duas versões vindas do formulário: ids válidos, e a de celular só junto
// com a de computador.
type CampoDeVersao = "midiaId" | "midiaMobileId" | "midiaTabletId";
function lerVersoes(campos: { midiaId: unknown; midiaMobileId?: unknown; midiaTabletId?: unknown }): {
  midiaId: string | null;
  midiaMobileId: string | null;
  midiaTabletId: string | null;
  erros: Partial<Record<CampoDeVersao, string>>;
} {
  const erros: Partial<Record<CampoDeVersao, string>> = {};
  const midiaId = idDoFormulario(campos.midiaId);
  if (midiaId !== null && !ehIdDeDocumentoValido(midiaId)) erros.midiaId = MENSAGEM_IMAGEM_INVALIDA;
  const outra = (campo: "midiaMobileId" | "midiaTabletId", mensagemSemComputador: string) => {
    const valor = idDoFormulario(campos[campo]);
    if (valor !== null && !ehIdDeDocumentoValido(valor)) erros[campo] = MENSAGEM_IMAGEM_INVALIDA;
    else if (valor !== null && midiaId === null) erros[campo] = mensagemSemComputador;
    return valor as string | null;
  };
  const midiaMobileId = outra("midiaMobileId", MENSAGEM_CELULAR_SEM_COMPUTADOR);
  const midiaTabletId = outra("midiaTabletId", MENSAGEM_TABLET_SEM_COMPUTADOR);
  return { midiaId: midiaId as string | null, midiaMobileId, midiaTabletId, erros };
}

// Confere no servidor as duas versões escolhidas (30/10/2026): cada uma,
// quando presente e diferente da já gravada, precisa ser uma mídia existente
// e ativa (fora da lixeira, com variantes). A conferência chega por parâmetro
// (midiaPodeSerEscolhida, na gravação), para o teste rodar sem Firebase.
// Devolve o campo recusado, ou null.
export async function versaoRecusada(
  escolhidas: Partial<Record<CampoDeVersao, string | null>>,
  anteriores: Partial<Record<CampoDeVersao, string | null>> | null,
  disponivel: (id: string) => Promise<boolean>,
): Promise<CampoDeVersao | null> {
  for (const campo of ["midiaId", "midiaMobileId", "midiaTabletId"] as const) {
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
  midiaTabletId?: unknown;
  alt: unknown;
  href: unknown;
  ativo: unknown;
  posicao: unknown;
  pontoDeFoco?: unknown;
  titulo?: unknown;
  trechoEmDestaque?: unknown;
  subtitulo?: unknown;
  textoDoBotao?: unknown;
  posicaoDoTexto?: unknown;
}): { ok: true; dados: DadosDoBanner } | { ok: false; erros: Partial<Record<CampoDoBanner, string>>; mensagem: string } {
  if (!ehChaveDeBanner(campos.chave)) return { ok: false, erros: {}, mensagem: "Banner não encontrado. Recarregue a página." };
  const { midiaId, midiaMobileId, midiaTabletId, erros: errosDasVersoes } = lerVersoes(campos);
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
  // Sem o campo (formulário anterior a ele): o centro. Valor estranho: recusa.
  const pontoDeFoco = campos.pontoDeFoco === null || campos.pontoDeFoco === undefined ? "centro" : campos.pontoDeFoco;
  if (!ehPontoDeFoco(pontoDeFoco)) erros.pontoDeFoco = MENSAGEM_PONTO_DE_FOCO_INVALIDO;
  // Texto e botão (30/10/2026), todos opcionais.
  const linha = (valor: unknown) => (typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "");
  const titulo = linha(campos.titulo);
  const trechoEmDestaque = linha(campos.trechoEmDestaque);
  const subtitulo = linha(campos.subtitulo);
  const textoDoBotao = linha(campos.textoDoBotao);
  if (titulo.length > LIMITE_DO_TITULO_DO_BANNER) erros.titulo = `O título aceita no máximo ${LIMITE_DO_TITULO_DO_BANNER} caracteres.`;
  if (trechoEmDestaque && !titulo.includes(trechoEmDestaque)) erros.trechoEmDestaque = "O trecho em destaque precisa fazer parte do título, escrito exatamente igual.";
  if (subtitulo.length > LIMITE_DO_SUBTITULO_DO_BANNER) erros.subtitulo = `O subtítulo aceita no máximo ${LIMITE_DO_SUBTITULO_DO_BANNER} caracteres.`;
  if (textoDoBotaoPareceEndereco(textoDoBotao)) erros.textoDoBotao = MENSAGEM_TEXTO_DO_BOTAO_COM_ENDERECO;
  else if (textoDoBotao.length > LIMITE_DO_TEXTO_DO_BOTAO) erros.textoDoBotao = `O texto do botão aceita no máximo ${LIMITE_DO_TEXTO_DO_BOTAO} caracteres.`;
  else if (textoDoBotao && link.ok && !link.href) erros.textoDoBotao = "Preencha o link para o botão aparecer, ou deixe o texto do botão vazio.";
  const posicaoDoTexto = campos.posicaoDoTexto === null || campos.posicaoDoTexto === undefined ? "esquerda" : campos.posicaoDoTexto;
  if (!ehPosicaoDoTexto(posicaoDoTexto)) erros.posicaoDoTexto = "Escolha a posição do texto: esquerda, centro ou direita.";
  if (Object.keys(erros).length > 0) return { ok: false, erros, mensagem: "Confira os campos marcados." };
  return {
    ok: true,
    dados: {
      chave: campos.chave,
      midiaId,
      midiaMobileId,
      midiaTabletId,
      alt,
      href: link.ok ? link.href : "",
      ativo,
      posicao,
      pontoDeFoco: pontoDeFoco as PontoDeFoco,
      titulo,
      trechoEmDestaque,
      subtitulo,
      textoDoBotao,
      posicaoDoTexto: posicaoDoTexto as PosicaoDoTexto,
    },
  };
}

// Imagem de um espaço fixo (modal de /admin/home).
export function lerImagemDoEspacoDoFormulario(campos: { identificador: unknown; midiaId: unknown; midiaMobileId?: unknown; alt: unknown }):
  | { ok: true; identificador: IdentificadorDoEspaco; imagem: ImagemDoEspaco }
  | { ok: false; erros: Partial<Record<"midiaId" | "midiaMobileId" | "alt", string>>; mensagem: string } {
  if (!ehEspacoDaHome(campos.identificador)) return { ok: false, erros: {}, mensagem: "Espaço de imagem não encontrado. Recarregue a página." };
  const { midiaId, midiaMobileId, erros: errosDasVersoes } = lerVersoes(campos);
  // As seções não têm versão para tablet.
  const erros: Partial<Record<"midiaId" | "midiaMobileId" | "alt", string>> = { ...(errosDasVersoes.midiaId ? { midiaId: errosDasVersoes.midiaId } : {}), ...(errosDasVersoes.midiaMobileId ? { midiaMobileId: errosDasVersoes.midiaMobileId } : {}) };
  if (Object.keys(erros).length > 0) return { ok: false, erros, mensagem: "Confira os campos marcados." };
  const alt = typeof campos.alt === "string" ? campos.alt.trim().replace(/\s+/g, " ") : "";
  if (midiaId && !alt) return { ok: false, erros: { alt: "Descreva a imagem no texto alternativo." }, mensagem: "Confira os campos marcados." };
  if (alt.length > LIMITE_DO_ALT_DA_HOME) return { ok: false, erros: { alt: `O texto alternativo aceita no máximo ${LIMITE_DO_ALT_DA_HOME} caracteres.` }, mensagem: "Confira os campos marcados." };
  return { ok: true, identificador: campos.identificador, imagem: { midiaId, midiaMobileId, alt: midiaId ? alt : "" } };
}

// Nomes (sem valores) do que mudou num banner, para o registro de alterações.
export function camposAlteradosDoBanner(antes: BannerDaHome | null, depois: BannerDaHome): string[] {
  if (!antes)
    return [
      "imagem",
      ...(depois.midiaTabletId ? ["imagem para tablet"] : []),
      ...(depois.midiaMobileId ? ["imagem para celular"] : []),
      "texto alternativo",
      "link",
      "ativo",
      "posição",
      ...(depois.pontoDeFoco !== "centro" ? ["ponto de foco"] : []),
      ...(temTextoNoBanner(depois) ? ["texto do banner"] : []),
    ];
  const alterados: string[] = [];
  if (antes.midiaId !== depois.midiaId) alterados.push("imagem");
  if (antes.midiaMobileId !== depois.midiaMobileId) alterados.push("imagem para celular");
  if (antes.alt !== depois.alt) alterados.push("texto alternativo");
  if (antes.href !== depois.href) alterados.push("link");
  if (antes.ativo !== depois.ativo) alterados.push("ativo");
  if (antes.ordem !== depois.ordem) alterados.push("posição");
  if (antes.pontoDeFoco !== depois.pontoDeFoco) alterados.push("ponto de foco");
  if (antes.midiaTabletId !== depois.midiaTabletId) alterados.push("imagem para tablet");
  if (antes.titulo !== depois.titulo) alterados.push("título");
  if (antes.trechoEmDestaque !== depois.trechoEmDestaque) alterados.push("trecho em destaque");
  if (antes.subtitulo !== depois.subtitulo) alterados.push("subtítulo");
  if (antes.textoDoBotao !== depois.textoDoBotao) alterados.push("texto do botão");
  if (antes.posicaoDoTexto !== depois.posicaoDoTexto) alterados.push("posição do texto");
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
