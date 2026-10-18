// Regras puras da biblioteca de mídia (etapa 4d), sem dependências externas:
// usadas no servidor, no navegador (limites e mensagens) e nos testes de unidade.
import { ehIdDeDocumentoValido } from "../validacao.ts";

// Larguras das variantes WebP. Nunca se amplia: só entram as larguras que não
// passam da largura da imagem; abaixo da menor, uma variante na largura original.
// Quando a imagem tem menos de 1600 px e é pelo menos 15% mais larga que a
// maior variante da lista que coube, entra também uma variante na largura
// original (ex.: 900 px gera 480 e 900, em vez de só 480; 1000 px gera 480 e
// 960). Com 1600 px ou mais, só 480, 960 e 1600. Decidido em 18/10/2026.
export const LARGURAS_DAS_VARIANTES = [480, 960, 1600] as const;
export const FOLGA_PARA_VARIANTE_ORIGINAL = 1.15;
export const QUALIDADE_WEBP = 78;

// Lado maior da imagem depois da redução no navegador, antes do envio.
export const LADO_MAXIMO_NO_NAVEGADOR = 2560;

// Formato da cópia reduzida no navegador: JPEG de qualidade alta, que todos os
// navegadores geram no canvas. WebP não: o Safari não gera WebP e devolveria
// PNG, bem maior. O servidor recodifica tudo em WebP de qualquer forma.
export const SAIDA_DO_NAVEGADOR = { tipo: "image/jpeg", extensao: "jpg", qualidade: 0.92 } as const;

// O envio vai por ação de servidor com limite de 4 MB (serverActions.bodySizeLimit
// no next.config.ts). O arquivo fica 64 KB abaixo disso, para caber o resto do
// formulário (texto alternativo e caixas de seleção).
export const LIMITE_DO_ARQUIVO_EM_BYTES = 4 * 1024 * 1024 - 64 * 1024;

// Medida máxima aceita na entrada (largura x altura), contra imagens que
// ocupariam memória demais ao abrir.
export const PIXELS_MAXIMOS_NA_ENTRADA = 10_000 * 10_000;

export const LIMITE_DO_ALT = 200;

// Cache das imagens públicas: os nomes nunca são reaproveitados (cada envio
// ganha um id novo), então o navegador pode guardar por um ano.
export const CACHE_DAS_IMAGENS = "public, max-age=31536000, immutable";

export const MENSAGENS = {
  semArquivo: "Escolha uma imagem para enviar.",
  grande: "A imagem ficou maior que 4 MB depois de reduzida. Escolha outra imagem.",
  svg: "Imagens SVG não são aceitas. Envie JPEG, PNG ou WebP.",
  heic: "Imagens HEIC (formato do iPhone) não são aceitas. Envie JPEG, PNG ou WebP.",
  outroFormato: "Este arquivo não é uma imagem aceita. Envie JPEG, PNG ou WebP.",
  ilegivel: "Não foi possível abrir esta imagem. O arquivo pode estar corrompido.",
  medidas: "A imagem é grande demais para processar. Envie uma imagem com menos de 10.000 pixels de lado.",
} as const;

export type FormatoAceito = "jpeg" | "png" | "webp";
type FormatoDetectado = FormatoAceito | "svg" | "heic" | "outro";

function comecaCom(bytes: Uint8Array, assinatura: number[], deslocamento = 0): boolean {
  return assinatura.every((valor, i) => bytes[deslocamento + i] === valor);
}

function texto(bytes: Uint8Array, inicio: number, fim: number): string {
  return String.fromCharCode(...bytes.subarray(inicio, fim));
}

// Tipo REAL do arquivo pelos primeiros bytes (assinatura), sem olhar a
// extensão nem o tipo informado pelo navegador.
export function detectarFormato(bytes: Uint8Array): FormatoDetectado {
  if (comecaCom(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (comecaCom(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (texto(bytes, 0, 4) === "RIFF" && texto(bytes, 8, 12) === "WEBP") return "webp";
  // HEIC/HEIF: caixa "ftyp" com marca do formato (AVIF fica em "outro").
  if (texto(bytes, 4, 8) === "ftyp" && ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(texto(bytes, 8, 12))) {
    return "heic";
  }
  // SVG é texto: procura a tag no começo do arquivo.
  const inicio = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 1024)).trimStart().toLowerCase();
  if (inicio.startsWith("<svg") || ((inicio.startsWith("<?xml") || inicio.startsWith("<!doctype svg")) && inicio.includes("<svg"))) return "svg";
  return "outro";
}

// Confere a cópia reduzida no navegador antes do envio: precisa ser JPEG (um
// navegador que não gera o tipo pedido devolve PNG) e caber no limite.
export function conferirCopiaReduzida(tipo: string, tamanho: number): string | null {
  if (tipo !== SAIDA_DO_NAVEGADOR.tipo) return MENSAGENS.ilegivel;
  if (tamanho > LIMITE_DO_ARQUIVO_EM_BYTES) return MENSAGENS.grande;
  return null;
}

// Recusa com a mensagem certa, ou null quando o formato é aceito.
export function mensagemDoFormato(formato: FormatoDetectado): string | null {
  if (formato === "jpeg" || formato === "png" || formato === "webp") return null;
  if (formato === "svg") return MENSAGENS.svg;
  if (formato === "heic") return MENSAGENS.heic;
  return MENSAGENS.outroFormato;
}

// Larguras a gerar para uma imagem (já na orientação certa), sem ampliar.
export function escolherLarguras(larguraDaImagem: number): number[] {
  const original = Math.max(1, Math.round(larguraDaImagem));
  const larguras: number[] = LARGURAS_DAS_VARIANTES.filter((largura) => largura <= larguraDaImagem);
  if (larguras.length === 0) return [original];
  const maior = larguras[larguras.length - 1];
  const maiorDaLista = LARGURAS_DAS_VARIANTES[LARGURAS_DAS_VARIANTES.length - 1];
  if (original < maiorDaLista && original >= maior * FOLGA_PARA_VARIANTE_ORIGINAL) larguras.push(original);
  return larguras;
}

// Texto alternativo obrigatório, sem espaços nas pontas e com limite.
export function validarAlt(valor: unknown): { ok: true; alt: string } | { ok: false; mensagem: string } {
  const alt = typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";
  if (!alt) return { ok: false, mensagem: "Descreva a imagem no texto alternativo." };
  if (alt.length > LIMITE_DO_ALT) return { ok: false, mensagem: `O texto alternativo aceita no máximo ${LIMITE_DO_ALT} caracteres.` };
  return { ok: true, alt };
}

// Aviso de menores (texto PROVISÓRIO, ver CLAUDE.md): se a imagem mostra
// criança ou adolescente, a confirmação de autorização é obrigatória.
export function validarAvisoDeMenor(indicaMenor: boolean, autorizacaoConfirmada: boolean): string | null {
  return indicaMenor && !autorizacaoConfirmada ? "Confirme que a ABTE tem autorização por escrito dos responsáveis." : null;
}

export type PastaDaMidia = "publico" | "lixeira";

// Pasta de uma mídia no Storage: publico/ (o site lê) ou lixeira/ (fechada).
export function pastaDaMidia(pasta: PastaDaMidia, id: string): string {
  return `${pasta}/midias/${id}`;
}

export function caminhoDaVariante(pasta: PastaDaMidia, id: string, largura: number): string {
  return `${pastaDaMidia(pasta, id)}/${largura}.webp`;
}

// Endereço público de um arquivo em publico/ (download direto do bucket,
// liberado pela regra de leitura do storage.rules). O documento guarda só o
// caminho; o endereço é montado aqui, com o bucket da configuração.
// A origem muda só nos testes com o emulador do Storage (ver servicos.ts).
export function urlPublica(bucket: string, caminho: string, origem = "https://firebasestorage.googleapis.com"): string {
  return `${origem}/v0/b/${bucket}/o/${encodeURIComponent(caminho)}?alt=media`;
}

// Variante mais leve que cobre a largura pedida; se nenhuma cobre, a maior.
export function escolherVariante<V extends { largura: number }>(variantes: V[], larguraPedida: number): V | undefined {
  const ordenadas = [...variantes].sort((a, b) => a.largura - b.largura);
  return ordenadas.find((variante) => variante.largura >= larguraPedida) ?? ordenadas.at(-1);
}

// Id de mídia escolhido num formulário (campo escondido do seletor de mídia):
// vazio vira null (sem imagem); um valor que não pode ser id é recusado.
export function lerIdDaMidiaEscolhida(valor: unknown): { ok: true; id: string | null } | { ok: false } {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (texto === "") return { ok: true, id: null };
  return ehIdDeDocumentoValido(texto) ? { ok: true, id: texto } : { ok: false };
}
