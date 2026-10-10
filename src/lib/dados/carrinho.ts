// Leitura do carrinho do cliente e dos produtos dele. SOMENTE no servidor.
import "server-only";

import { firestoreAdmin } from "@/lib/firebase/servidor";
import { lerItensGuardados, type ItemDoCarrinho, type ProdutoDoCarrinho } from "@/lib/loja/carrinho";
import { COLECAO_CARRINHOS } from "@/lib/loja/contas";
import { lerProdutos } from "./colecoes";

export function documentoDoCarrinho(uid: string) {
  return firestoreAdmin().collection(COLECAO_CARRINHOS).doc(uid);
}

export async function lerItensDoCarrinho(uid: string): Promise<ItemDoCarrinho[]> {
  return lerItensGuardados((await documentoDoCarrinho(uid).get()).get("itens"));
}

// Produtos atuais (preço, situação), lidos do Firestore na hora.
export async function lerProdutosDoCarrinho(ids: string[]): Promise<Map<string, ProdutoDoCarrinho>> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return new Map();
  const colecao = lerProdutos();
  const documentos = await colecao.firestore.getAll(...unicos.map((id) => colecao.doc(id)));
  const mapa = new Map<string, ProdutoDoCarrinho>();
  for (const documento of documentos) {
    const produto = documento.data();
    if (!produto) continue;
    mapa.set(produto.id, {
      id: produto.id,
      nome: produto.nome,
      slug: produto.slug,
      preco: produto.preco,
      precoPromocional: produto.precoPromocional,
      tipo: produto.tipo,
      status: produto.status,
      publicado: produto.publicado,
      excluido: produto.excluidoEm !== null,
    });
  }
  return mapa;
}
