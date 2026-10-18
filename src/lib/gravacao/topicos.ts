// Imagem das categorias (de artigos e de produtos) no Firestore. Sem sessão e
// sem "server-only", como os outros módulos de gravação: recebe o Firestore
// por parâmetro e é usada por acoes-topicos.ts (que confere sessão e papel
// antes) e pelos testes no emulador. Tags não têm imagem.
import type { Firestore } from "firebase-admin/firestore";
import { escolhaDeMidiaValida } from "../midia/biblioteca.ts";

export const MENSAGEM_IMAGEM_DA_CATEGORIA_INDISPONIVEL = "A imagem escolhida não está mais na biblioteca (foi para a lixeira ou excluída). Escolha outra ou remova a imagem.";

// Confere a imagem escolhida para a categoria antes de gravar: sem imagem, a
// mesma que já estava gravada (mesmo na lixeira da biblioteca) ou uma imagem
// que existe e está fora da lixeira.
export async function imagemDaCategoriaValida(db: Firestore, colecao: string, id: string, escolhida: string | null): Promise<boolean> {
  const atual = await db.collection(colecao).doc(id).get();
  return escolhaDeMidiaValida(db, escolhida, atual.get("imagemMidiaId") ?? null);
}
