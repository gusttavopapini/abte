// Leitura do carrinho do cliente e dos produtos dele. SOMENTE no servidor.
import "server-only";

import { cookies } from "next/headers";
import { lerSessaoCliente, type ClienteDaSessao } from "@/lib/auth/sessao-cliente";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import {
  escreverCarrinhoDoVisitante,
  lerCarrinhoDoVisitante,
  NOME_COOKIE_CARRINHO_VISITANTE,
  opcoesDoCookieDoVisitante,
  CAMINHO_COOKIE_CARRINHO_VISITANTE,
} from "@/lib/loja/carrinhoVisitante";
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

// ---------- Carrinho de visitante (cookie, 08/11/2026) ----------

export async function lerItensDoVisitante(): Promise<ItemDoCarrinho[]> {
  return lerCarrinhoDoVisitante((await cookies()).get(NOME_COOKIE_CARRINHO_VISITANTE)?.value);
}

// Só em ação de servidor ou rota (páginas não gravam cookies).
export async function gravarItensDoVisitante(itens: ItemDoCarrinho[]): Promise<void> {
  const loja = await cookies();
  const valor = escreverCarrinhoDoVisitante(itens);
  if (!valor) {
    loja.delete({ name: NOME_COOKIE_CARRINHO_VISITANTE, path: CAMINHO_COOKIE_CARRINHO_VISITANTE });
    return;
  }
  loja.set(NOME_COOKIE_CARRINHO_VISITANTE, valor, opcoesDoCookieDoVisitante(process.env.NODE_ENV === "production"));
}

export async function apagarCarrinhoDoVisitante(): Promise<void> {
  (await cookies()).delete({ name: NOME_COOKIE_CARRINHO_VISITANTE, path: CAMINHO_COOKIE_CARRINHO_VISITANTE });
}

// Carrinho de quem está na página: o da conta, se houver sessão de cliente;
// senão, o do cookie de visitante.
export async function lerCarrinhoAtual(): Promise<{ cliente: ClienteDaSessao | null; itens: ItemDoCarrinho[] }> {
  const cliente = await lerSessaoCliente();
  return { cliente, itens: cliente ? await lerItensDoCarrinho(cliente.uid) : await lerItensDoVisitante() };
}
