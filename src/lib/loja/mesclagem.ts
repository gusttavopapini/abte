// Mesclagem do carrinho de visitante no carrinho da conta (08/11/2026), ao
// entrar ou criar a conta. Firestore e a leitura dos produtos chegam por
// parâmetro, sem server-only, para servir à ação de servidor e aos testes no
// emulador.
import type { Firestore } from "firebase-admin/firestore";
import { lerItensGuardados, type ItemDoCarrinho, type ProdutoDoCarrinho } from "./carrinho.ts";
import { mesclarCarrinhos } from "./carrinhoVisitante.ts";
import { COLECAO_CARRINHOS } from "./contas.ts";

export async function mesclarNoCarrinhoDaConta(
  db: Firestore,
  uid: string,
  doVisitante: ItemDoCarrinho[],
  lerProdutos: (ids: string[]) => Promise<Map<string, ProdutoDoCarrinho>>,
): Promise<ItemDoCarrinho[]> {
  if (doVisitante.length === 0) return lerItensGuardados((await db.collection(COLECAO_CARRINHOS).doc(uid).get()).get("itens"));
  const produtos = await lerProdutos(doVisitante.map((item) => item.produtoId));
  const referencia = db.collection(COLECAO_CARRINHOS).doc(uid);
  return db.runTransaction(async (transacao) => {
    const daConta = lerItensGuardados((await transacao.get(referencia)).get("itens"));
    const itens = mesclarCarrinhos(daConta, doVisitante, produtos);
    transacao.set(referencia, { itens, atualizadoEm: new Date() });
    return itens;
  });
}
