"use server";

// Ações de servidor do carrinho da loja. Desde 08/11/2026 valem para todos:
// com sessão de cliente, o carrinho fica na conta (Firestore); sem sessão, no
// cookie de visitante (só ids e quantidades). Preço e disponibilidade são
// sempre lidos do produto aqui no servidor; do navegador só vêm o id do
// produto e a quantidade.
import { revalidatePath } from "next/cache";
import { lerSessaoCliente } from "@/lib/auth/sessao-cliente";
import { documentoDoCarrinho, gravarItensDoVisitante, lerItensDoVisitante, lerProdutosDoCarrinho } from "@/lib/dados/carrinho";
import { adicionarItem, definirQuantidade, lerItensGuardados, lerQuantidade, type Alteracao, type ItemDoCarrinho } from "@/lib/loja/carrinho";
import { ehIdDeDocumentoValido } from "@/lib/validacao";

export type RespostaDoCarrinho = { ok: boolean; mensagem: string };

// Lê o carrinho, aplica a alteração e grava: na conta, numa transação (dois
// cliques seguidos não se perdem); sem conta, no cookie de visitante.
async function alterarCarrinho(uid: string | null, alterar: (itens: ItemDoCarrinho[]) => Promise<Alteracao>): Promise<string | null> {
  if (!uid) {
    const resultado = await alterar(await lerItensDoVisitante());
    if (!resultado.ok) return resultado.erro;
    await gravarItensDoVisitante(resultado.itens);
    return null;
  }
  const referencia = documentoDoCarrinho(uid);
  return referencia.firestore.runTransaction(async (transacao) => {
    const itens = lerItensGuardados((await transacao.get(referencia)).get("itens"));
    const resultado = await alterar(itens);
    if (!resultado.ok) return resultado.erro;
    transacao.set(referencia, { itens: resultado.itens, atualizadoEm: new Date() });
    return null;
  });
}

function atualizarPaginas() {
  revalidatePath("/loja", "layout");
}

export async function adicionarAoCarrinho(_anterior: RespostaDoCarrinho | null, dados: FormData): Promise<RespostaDoCarrinho> {
  const cliente = await lerSessaoCliente();
  const produtoId = dados.get("produtoId");
  const quantidade = lerQuantidade(dados.get("quantidade"));
  if (!ehIdDeDocumentoValido(produtoId)) return { ok: false, mensagem: "Produto não encontrado." };
  if (quantidade === null || quantidade < 1) return { ok: false, mensagem: "Escolha uma quantidade de 1 a 10." };
  try {
    const erro = await alterarCarrinho(cliente?.uid ?? null, async (itens) => {
      const produto = (await lerProdutosDoCarrinho([produtoId])).get(produtoId);
      if (!produto) return { ok: false, erro: "Este produto não está mais na loja." };
      return adicionarItem(itens, produto, quantidade);
    });
    if (erro) return { ok: false, mensagem: erro };
  } catch (falha) {
    console.error("Falha ao adicionar ao carrinho:", falha);
    return { ok: false, mensagem: "Não foi possível adicionar agora. Tente de novo em instantes." };
  }
  atualizarPaginas();
  return { ok: true, mensagem: "Adicionado ao carrinho." };
}

// Troca a quantidade (0 remove). O botão "Remover" envia quantidade 0.
export async function alterarItemDoCarrinho(_anterior: RespostaDoCarrinho | null, dados: FormData): Promise<RespostaDoCarrinho> {
  const cliente = await lerSessaoCliente();
  const produtoId = dados.get("produtoId");
  const quantidade = lerQuantidade(dados.get("quantidade"));
  if (typeof produtoId !== "string" || !produtoId) return { ok: false, mensagem: "Produto não encontrado." };
  if (quantidade === null) return { ok: false, mensagem: "Escolha uma quantidade de 0 a 10." };
  try {
    const erro = await alterarCarrinho(cliente?.uid ?? null, async (itens) => {
      const produto = quantidade > 0 && ehIdDeDocumentoValido(produtoId) ? (await lerProdutosDoCarrinho([produtoId])).get(produtoId) : undefined;
      return definirQuantidade(itens, produtoId, quantidade, produto);
    });
    if (erro) return { ok: false, mensagem: erro };
  } catch (falha) {
    console.error("Falha ao alterar o carrinho:", falha);
    return { ok: false, mensagem: "Não foi possível alterar agora. Tente de novo em instantes." };
  }
  atualizarPaginas();
  return { ok: true, mensagem: quantidade === 0 ? "Removido do carrinho." : "Quantidade atualizada." };
}
