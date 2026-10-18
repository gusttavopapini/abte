// Redução da imagem no navegador, antes do envio: lado maior até 2560 px,
// já na orientação certa (a rotação do EXIF é aplicada ao abrir a imagem) e
// recodificada em WebP (ou JPEG, no navegador que não gera WebP). A cópia
// nova não leva os metadados da câmera. O servidor confere tudo de novo.
import { LADO_MAXIMO_NO_NAVEGADOR, LIMITE_DO_ARQUIVO_EM_BYTES, MENSAGENS } from "@/lib/midia/regras";

type Resultado = { ok: true; arquivo: File } | { ok: false; mensagem: string };

const QUALIDADE_NO_NAVEGADOR = 0.9;

function gerar(canvas: HTMLCanvasElement, tipo: string): Promise<Blob | null> {
  return new Promise((resolver) => canvas.toBlob(resolver, tipo, QUALIDADE_NO_NAVEGADOR));
}

// Recusa cedo o que dá para reconhecer pelo tipo ou pela extensão.
function recusaPrevia(arquivo: File): string | null {
  const tipo = arquivo.type.toLowerCase();
  const nome = arquivo.name.toLowerCase();
  if (tipo === "image/svg+xml" || nome.endsWith(".svg")) return MENSAGENS.svg;
  if (tipo === "image/heic" || tipo === "image/heif" || /\.(heic|heif)$/.test(nome)) return MENSAGENS.heic;
  return null;
}

export async function reduzirImagem(arquivo: File): Promise<Resultado> {
  const recusa = recusaPrevia(arquivo);
  if (recusa) return { ok: false, mensagem: recusa };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  } catch {
    return { ok: false, mensagem: MENSAGENS.outroFormato };
  }

  const escala = Math.min(1, LADO_MAXIMO_NO_NAVEGADOR / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * escala));
  canvas.height = Math.max(1, Math.round(bitmap.height * escala));
  const contexto = canvas.getContext("2d");
  if (!contexto) {
    bitmap.close();
    return { ok: false, mensagem: MENSAGENS.ilegivel };
  }
  contexto.imageSmoothingQuality = "high";
  contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let blob = await gerar(canvas, "image/webp");
  if (!blob || blob.type !== "image/webp") blob = await gerar(canvas, "image/jpeg");
  if (!blob) return { ok: false, mensagem: MENSAGENS.ilegivel };
  if (blob.size > LIMITE_DO_ARQUIVO_EM_BYTES) return { ok: false, mensagem: MENSAGENS.grande };

  const extensao = blob.type === "image/webp" ? "webp" : "jpg";
  return { ok: true, arquivo: new File([blob], `imagem.${extensao}`, { type: blob.type }) };
}
