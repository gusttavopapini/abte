// Monta as imagens da biblioteca para as telas (site e painel). SOMENTE no
// servidor: lê o Firestore e monta os endereços públicos das variantes.
import "server-only";

import { lerMidias } from "@/lib/dados/colecoes";
import type { Midia } from "@/lib/dados/tipos";
import { ehIdDeDocumentoValido } from "@/lib/validacao";
import { urlPublicaDoArquivo } from "./servicos";
import type { ImagemNaTela, MidiaNaTela, VarianteNaTela } from "./tela";

// Endereços públicos (publico/). Só para imagens fora da lixeira.
function variantesPublicas(midia: Midia): VarianteNaTela[] {
  return midia.variantes.map((variante) => ({ largura: variante.largura, url: urlPublicaDoArquivo(variante.caminho) }));
}

export function midiaNaTela(midia: Midia, variantes: VarianteNaTela[] = variantesPublicas(midia)): MidiaNaTela {
  return {
    id: midia.id,
    alt: midia.alt,
    largura: midia.largura,
    altura: midia.altura,
    variantes,
    indicaMenor: midia.indicaMenor,
    enviadaEm: midia.criadoEm ? midia.criadoEm.toLocaleDateString("pt-BR") : "",
  };
}

// Imagens fora da lixeira, mais recentes primeiro (biblioteca e seletor).
export async function listarMidiasAtivas(): Promise<MidiaNaTela[]> {
  return (await lerMidias().get()).docs
    .map((documento) => documento.data())
    .filter((midia) => !midia.excluidoEm && midia.variantes.length > 0)
    .sort((a, b) => (b.criadoEm?.getTime() ?? 0) - (a.criadoEm?.getTime() ?? 0))
    .map((midia) => midiaNaTela(midia));
}

// Imagens pelos ids gravados nos outros documentos (ex.: fotoMidiaId). Só
// entram as que existem e estão fora da lixeira; as outras ficam de fora do
// mapa, e quem exibe mostra o espaço de imagem (placeholder).
export async function imagensAtivasPorId(ids: (string | null | undefined)[]): Promise<Map<string, ImagemNaTela>> {
  const validos = [...new Set(ids.filter(ehIdDeDocumentoValido))];
  const mapa = new Map<string, ImagemNaTela>();
  if (validos.length === 0) return mapa;
  const documentos = await Promise.all(validos.map((id) => lerMidias().doc(id).get()));
  for (const documento of documentos) {
    const midia = documento.data();
    if (!midia || midia.excluidoEm || midia.variantes.length === 0) continue;
    mapa.set(midia.id, { alt: midia.alt, largura: midia.largura, altura: midia.altura, variantes: variantesPublicas(midia) });
  }
  return mapa;
}
