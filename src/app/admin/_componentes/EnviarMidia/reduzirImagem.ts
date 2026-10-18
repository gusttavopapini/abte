// Redução da imagem no navegador, antes do envio: lado maior até 2560 px,
// já na orientação certa (a rotação do EXIF é aplicada ao abrir a imagem) e
// recodificada em JPEG de qualidade alta (SAIDA_DO_NAVEGADOR). A cópia nova
// não leva os metadados da câmera. O servidor confere tudo de novo e gera WebP.
import { LADO_MAXIMO_NO_NAVEGADOR, MENSAGENS, SAIDA_DO_NAVEGADOR, conferirCopiaReduzida } from "@/lib/midia/regras";

type Resultado = { ok: true; arquivo: File } | { ok: false; mensagem: string };

// JPEG não tem transparência: as áreas transparentes de PNG e WebP ficam
// brancas, em vez de pretas (cor do canvas vazio).
const FUNDO_DAS_AREAS_TRANSPARENTES = "white";

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
  contexto.fillStyle = FUNDO_DAS_AREAS_TRANSPARENTES;
  contexto.fillRect(0, 0, canvas.width, canvas.height);
  contexto.imageSmoothingQuality = "high";
  contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolver) => canvas.toBlob(resolver, SAIDA_DO_NAVEGADOR.tipo, SAIDA_DO_NAVEGADOR.qualidade));
  if (!blob) return { ok: false, mensagem: MENSAGENS.ilegivel };
  const problema = conferirCopiaReduzida(blob.type, blob.size);
  if (problema) return { ok: false, mensagem: problema };

  return { ok: true, arquivo: new File([blob], `imagem.${SAIDA_DO_NAVEGADOR.extensao}`, { type: blob.type }) };
}
