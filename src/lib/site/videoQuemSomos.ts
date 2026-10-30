// Vídeo da seção "Quem Somos" (30/10/2026), editado em /admin/home: arquivo
// enviado ao Storage (MP4 ou WebM) ou link do YouTube, com descrição, capa,
// legenda .vtt e o aviso de menores. Fica em configuracoes/home, campo
// videoQuemSomos (sem a coleção midias, que é só de imagens). Puro (sem
// Firebase): usado pelo painel, pela gravação, pela home e pelos testes.
//
// O arquivo NÃO passa pela função da Vercel (limite de corpo): o servidor
// gera uma política de envio assinada (POST V4, com tamanho e tipo
// limitados, caminho próprio e validade curta), o navegador envia direto ao
// bucket e o servidor confere o objeto antes de gravar a referência. A
// entrega pública é a mesma das imagens: download direto de publico/ (o
// Storage atende pedidos parciais, Range e 206).
import { idDoYoutubeDoLink } from "./video.ts";
import { ehIdDeDocumentoValido } from "../validacao.ts";

export const IDENTIFICADOR_DO_VIDEO = "quem-somos-video";
export const PROPORCAO_DO_VIDEO = { texto: "9:16, em pé (a coluna ao lado de Missão, Visão e Valores)", tamanho: "1080 x 1920 px", razao: 9 / 16 };
// Limite do arquivo de vídeo: 1 GB (pedido de 30/10/2026; antes, 60 MB),
// uma constante só, usada na sessão de envio, na confirmação pelos
// metadados, na validação do navegador e nos textos do painel.
export const LIMITE_DO_VIDEO_EM_BYTES = 1073741824;
export const TEXTO_DO_LIMITE_DO_VIDEO = "até 1 GB; recomendamos até 100 MB para carregar rápido no celular";
// Envio retomável em partes de 8 MB (múltiplo de 256 KB, exigido pelo
// Cloud Storage).
export const TAMANHO_DA_PARTE_DO_ENVIO = 8 * 1024 * 1024;
export const LIMITE_DA_LEGENDA_EM_BYTES = 200 * 1024;
export const LIMITE_DA_DESCRICAO_DO_VIDEO = 300;
export const DURACAO_RECOMENDADA = "até 2 minutos";
// Validade da política de envio assinada.
export const VALIDADE_DO_ENVIO_EM_MS = 10 * 60 * 1000;

export const TIPOS_DE_VIDEO = { "video/mp4": "mp4", "video/webm": "webm" } as const;
export type TipoDeVideo = keyof typeof TIPOS_DE_VIDEO;
export const TIPO_DA_LEGENDA = "text/vtt";
export type ArquivoDoVideo = "video" | "legenda";

export type VideoQuemSomos = {
  descricao: string;
  capaMidiaId: string | null;
  legendaCaminho: string | null;
  indicaMenor: boolean;
} & ({ tipo: "arquivo"; caminho: string; contentType: TipoDeVideo; tamanho: number } | { tipo: "youtube"; youtubeId: string });

const PASTA_DOS_VIDEOS = "publico/videos";
const CAMINHO_DE_VIDEO = /^publico\/videos\/[A-Za-z0-9]{20}\/video\.(mp4|webm)$/;
const CAMINHO_DE_LEGENDA = /^publico\/videos\/[A-Za-z0-9]{20}\/legenda\.vtt$/;
const ID_DO_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;

export function ehTipoDeVideo(valor: unknown): valor is TipoDeVideo {
  return typeof valor === "string" && Object.hasOwn(TIPOS_DE_VIDEO, valor);
}

export function ehCaminhoDoArquivo(tipo: ArquivoDoVideo, caminho: unknown): caminho is string {
  return typeof caminho === "string" && (tipo === "video" ? CAMINHO_DE_VIDEO : CAMINHO_DE_LEGENDA).test(caminho);
}

// Pedido de envio (antes de assinar): tipo e tamanho dentro dos limites.
export function validarPedidoDeEnvio(pedido: { arquivo: unknown; contentType: unknown; tamanho: unknown }):
  | { ok: true; arquivo: ArquivoDoVideo; contentType: string; limite: number }
  | { ok: false; mensagem: string } {
  const tamanho = Number(pedido.tamanho);
  if (pedido.arquivo === "video") {
    if (!ehTipoDeVideo(pedido.contentType)) return { ok: false, mensagem: "Envie o vídeo em MP4 (H.264) ou WebM." };
    if (!Number.isFinite(tamanho) || tamanho <= 0) return { ok: false, mensagem: "O arquivo de vídeo está vazio." };
    if (tamanho > LIMITE_DO_VIDEO_EM_BYTES) return { ok: false, mensagem: "O vídeo passa de 1 GB. Envie um arquivo menor ou use um link do YouTube." };
    return { ok: true, arquivo: "video", contentType: pedido.contentType, limite: LIMITE_DO_VIDEO_EM_BYTES };
  }
  if (pedido.arquivo === "legenda") {
    if (pedido.contentType !== TIPO_DA_LEGENDA) return { ok: false, mensagem: "A legenda precisa ser um arquivo .vtt (WebVTT)." };
    if (!Number.isFinite(tamanho) || tamanho <= 0) return { ok: false, mensagem: "O arquivo de legenda está vazio." };
    if (tamanho > LIMITE_DA_LEGENDA_EM_BYTES) return { ok: false, mensagem: "A legenda passa de 200 KB." };
    return { ok: true, arquivo: "legenda", contentType: TIPO_DA_LEGENDA, limite: LIMITE_DA_LEGENDA_EM_BYTES };
  }
  return { ok: false, mensagem: "Não foi possível preparar o envio. Recarregue a página e tente de novo." };
}

// Caminho próprio de cada envio (id novo a cada vez, nada reaproveitado).
export function caminhoDoEnvio(arquivo: ArquivoDoVideo, id: string, contentType: string): string {
  return arquivo === "video" ? `${PASTA_DOS_VIDEOS}/${id}/video.${TIPOS_DE_VIDEO[contentType as TipoDeVideo]}` : `${PASTA_DOS_VIDEOS}/${id}/legenda.vtt`;
}

// Condições da política de envio: só aquele tipo e no máximo o limite.
export function condicoesDoEnvio(contentType: string, limite: number): (string | number)[][] {
  return [
    ["content-length-range", 1, limite],
    ["eq", "$Content-Type", contentType],
  ];
}

// Objeto enviado: confere os metadados reais do bucket.
export function conferirMetadados(arquivo: ArquivoDoVideo, metadados: { tamanho: number; contentType: string | undefined }): { ok: true } | { ok: false; mensagem: string } {
  const limite = arquivo === "video" ? LIMITE_DO_VIDEO_EM_BYTES : LIMITE_DA_LEGENDA_EM_BYTES;
  if (!(metadados.tamanho > 0) || metadados.tamanho > limite) return { ok: false, mensagem: arquivo === "video" ? "O vídeo enviado passa do limite de 1 GB ou está vazio." : "A legenda enviada passa de 200 KB ou está vazia." };
  const tipoCerto = arquivo === "video" ? ehTipoDeVideo(metadados.contentType) : metadados.contentType === TIPO_DA_LEGENDA;
  if (!tipoCerto) return { ok: false, mensagem: arquivo === "video" ? "O arquivo enviado não é um vídeo MP4 ou WebM." : "O arquivo enviado não é uma legenda .vtt." };
  return { ok: true };
}

// Legenda WebVTT: começa com "WEBVTT" (com ou sem a marca de ordem de bytes).
export function legendaValida(texto: string): boolean {
  return /^﻿?WEBVTT(?:[ \t]|\r?\n|$)/.test(texto);
}

// Leitura tolerante do campo gravado; o que não tiver a forma esperada vale
// sem vídeo (a home mostra o padrão).
export function lerVideoQuemSomos(valor: unknown): VideoQuemSomos | null {
  if (!valor || typeof valor !== "object") return null;
  const campos = valor as Record<string, unknown>;
  const descricao = typeof campos.descricao === "string" ? campos.descricao.trim().slice(0, LIMITE_DA_DESCRICAO_DO_VIDEO) : "";
  if (!descricao) return null;
  const comum = {
    descricao,
    capaMidiaId: ehIdDeDocumentoValido(campos.capaMidiaId) ? campos.capaMidiaId : null,
    legendaCaminho: ehCaminhoDoArquivo("legenda", campos.legendaCaminho) ? campos.legendaCaminho : null,
    indicaMenor: campos.indicaMenor === true,
  };
  if (campos.tipo === "youtube" && typeof campos.youtubeId === "string" && ID_DO_YOUTUBE.test(campos.youtubeId)) return { ...comum, tipo: "youtube", youtubeId: campos.youtubeId };
  if (campos.tipo === "arquivo" && ehCaminhoDoArquivo("video", campos.caminho) && ehTipoDeVideo(campos.contentType)) {
    return { ...comum, tipo: "arquivo", caminho: campos.caminho, contentType: campos.contentType, tamanho: typeof campos.tamanho === "number" ? campos.tamanho : 0 };
  }
  return null;
}

export type CampoDoVideo = "forma" | "youtube" | "caminho" | "descricao" | "capaMidiaId" | "legendaCaminho" | "autorizacao";

// Formulário do vídeo. forma "nenhum": remove o vídeo (a home volta ao
// padrão). Erros por campo, em português.
export function lerVideoDoFormulario(campos: {
  forma: unknown;
  youtube: unknown;
  caminho: unknown;
  contentType: unknown;
  tamanho: unknown;
  descricao: unknown;
  capaMidiaId: unknown;
  legendaCaminho: unknown;
  indicaMenor: unknown;
  autorizacao: unknown;
}): { ok: true; video: VideoQuemSomos | null } | { ok: false; erros: Partial<Record<CampoDoVideo, string>>; mensagem: string } {
  if (campos.forma === "nenhum") return { ok: true, video: null };
  const erros: Partial<Record<CampoDoVideo, string>> = {};
  const descricao = typeof campos.descricao === "string" ? campos.descricao.trim().replace(/\s+/g, " ") : "";
  if (!descricao) erros.descricao = "Descreva o vídeo: a descrição é o nome dele para quem usa leitor de tela.";
  else if (descricao.length > LIMITE_DA_DESCRICAO_DO_VIDEO) erros.descricao = `A descrição aceita no máximo ${LIMITE_DA_DESCRICAO_DO_VIDEO} caracteres.`;
  const capa = campos.capaMidiaId === "" || campos.capaMidiaId === null || campos.capaMidiaId === undefined ? null : campos.capaMidiaId;
  if (capa !== null && !ehIdDeDocumentoValido(capa)) erros.capaMidiaId = "Imagem de capa inválida. Envie ou escolha a imagem de novo.";
  const legenda = campos.legendaCaminho === "" || campos.legendaCaminho === null || campos.legendaCaminho === undefined ? null : campos.legendaCaminho;
  if (legenda !== null && !ehCaminhoDoArquivo("legenda", legenda)) erros.legendaCaminho = "Legenda inválida. Envie o arquivo .vtt de novo.";
  const indicaMenor = campos.indicaMenor === "sim";
  if (indicaMenor && campos.autorizacao !== "sim") erros.autorizacao = "Confirme que a ABTE tem autorização por escrito dos responsáveis, ou desmarque o aviso.";
  const comum = { descricao, capaMidiaId: capa as string | null, legendaCaminho: legenda as string | null, indicaMenor };
  let video: VideoQuemSomos | null = null;
  if (campos.forma === "youtube") {
    const id = typeof campos.youtube === "string" ? idDoYoutubeDoLink(campos.youtube) : null;
    if (!id) erros.youtube = "Cole o link de um vídeo do YouTube (youtube.com ou youtu.be).";
    else video = { ...comum, tipo: "youtube", youtubeId: id };
  } else if (campos.forma === "arquivo") {
    if (!ehCaminhoDoArquivo("video", campos.caminho) || !ehTipoDeVideo(campos.contentType)) erros.caminho = "Envie o arquivo de vídeo antes de salvar.";
    else video = { ...comum, tipo: "arquivo", caminho: campos.caminho, contentType: campos.contentType, tamanho: Number(campos.tamanho) || 0 };
  } else {
    erros.forma = "Escolha como o vídeo entra: arquivo ou link do YouTube.";
  }
  if (Object.keys(erros).length > 0 || !video) return { ok: false, erros, mensagem: "Confira os campos marcados." };
  return { ok: true, video };
}

// Nomes (sem valores) do que mudou, para o registro de alterações.
export function camposAlteradosDoVideo(antes: VideoQuemSomos | null, depois: VideoQuemSomos | null): string[] {
  if (!antes && !depois) return [];
  if (!depois) return ["vídeo removido"];
  const alterados: string[] = [];
  const fonte = (video: VideoQuemSomos | null) => (video ? (video.tipo === "youtube" ? `y:${video.youtubeId}` : `a:${video.caminho}`) : "");
  if (fonte(antes) !== fonte(depois)) alterados.push("vídeo");
  if ((antes?.descricao ?? "") !== depois.descricao) alterados.push("descrição");
  if ((antes?.capaMidiaId ?? null) !== depois.capaMidiaId) alterados.push("capa");
  if ((antes?.legendaCaminho ?? null) !== depois.legendaCaminho) alterados.push("legenda");
  if ((antes?.indicaMenor ?? false) !== depois.indicaMenor) alterados.push("aviso de menores");
  return alterados;
}

// Miniatura do YouTube para a capa automática (30/10/2026): só com o id já
// validado (11 caracteres) e o host fixo i.ytimg.com; nunca uma URL vinda de
// fora. Primeiro a maior (maxresdefault) e, sem ela, a hqdefault.
export const QUALIDADES_DA_MINIATURA = ["maxresdefault", "hqdefault"] as const;
export const LIMITE_DA_MINIATURA_EM_BYTES = 2 * 1024 * 1024;
// Menor que isto (em largura) é a imagem de "sem miniatura" do YouTube.
export const LARGURA_MINIMA_DA_MINIATURA = 400;

export function urlDaMiniatura(youtubeId: string, qualidade: (typeof QUALIDADES_DA_MINIATURA)[number]): string | null {
  if (!ID_DO_YOUTUBE.test(youtubeId) || !QUALIDADES_DA_MINIATURA.includes(qualidade)) return null;
  return `https://i.ytimg.com/vi/${youtubeId}/${qualidade}.jpg`;
}
