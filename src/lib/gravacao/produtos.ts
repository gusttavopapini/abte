// Conferência das imagens da galeria do produto no Firestore. Sem sessão e
// sem "server-only", como os outros módulos de gravação: usada por
// acoes-produtos.ts (que confere sessão e papel antes) e pelos testes no
// emulador. Ainda sem registro de alterações (fica para a etapa 3).
import type { Firestore } from "firebase-admin/firestore";
import { escolhasDeMidiaValidas } from "../midia/biblioteca.ts";
import type { ImagemDoProduto } from "../produtos.ts";

export const COLECAO_PRODUTOS = "produtos";

export const MENSAGEM_IMAGEM_DO_PRODUTO_INDISPONIVEL = "Uma das imagens escolhidas não está mais na biblioteca (foi para a lixeira ou excluída). Remova-a ou escolha outra.";

// Imagens novas da galeria precisam existir e estar fora da lixeira; as que
// já estavam gravadas no produto podem ficar (voltam se forem restauradas).
// Ids repetidos e o limite são conferidos antes, em lerImagensDoProduto.
export async function imagensDoProdutoValidas(db: Firestore, id: string | null, imagens: ImagemDoProduto[]): Promise<boolean> {
  const gravadas = id ? (await db.collection(COLECAO_PRODUTOS).doc(id).get()).get("imagens") : [];
  const anteriores = Array.isArray(gravadas) ? gravadas.map((imagem) => String(imagem?.midiaId ?? "")) : [];
  return escolhasDeMidiaValidas(db, imagens.map((imagem) => imagem.midiaId), anteriores);
}
