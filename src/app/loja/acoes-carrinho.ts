"use server";

// Ações de servidor do carrinho da loja. Exigem sessão de cliente. Preço e
// disponibilidade são sempre lidos do produto aqui no servidor; do navegador
// só vêm o id do produto e a quantidade. Não há pagamento nem pedido.
import { revalidatePath } from "next/cache";
import { lerSessaoCliente } from "@/lib/auth/sessao-cliente";
import { documentoDoCarrinho, lerProdutosDoCarrinho } from "@/lib/dados/carrinho";
import { adicionarItem, definirQuantidade, lerItensGuardados, lerQuantidade, type Alteracao, type ItemDoCarrinho } from "@/lib/loja/carrinho";
import { ehIdDeDocumentoValido } from "@/lib/validacao";

export type RespostaDoCarrinho = { ok: boolean; mensagem: string };

const SEM_SESSAO: RespostaDoCarrinho = { ok: false, mensagem: "Entre na sua conta da loja para usar o carrinho." };

// Lê o carrinho, aplica a alteração e grava, numa transação (dois cliques
// seguidos não se perdem).
async function alterarCarrinho(uid: string, alterar: (itens: ItemDoCarrinho[]) => Promise<Alteracao>): Promise<string | null> {
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
  if (!cliente) return SEM_SESSAO;
  const produtoId = dados.get("produtoId");
  const quantidade = lerQuantidade(dados.get("quantidade"));
  if (!ehIdDeDocumentoValido(produtoId)) return { ok: false, mensagem: "Produto não encontrado." };
  if (quantidade === null || quantidade < 1) return { ok: false, mensagem: "Escolha uma quantidade de 1 a 10." };
  try {
    const erro = await alterarCarrinho(cliente.uid, async (itens) => {
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
  if (!cliente) return SEM_SESSAO;
  const produtoId = dados.get("produtoId");
  const quantidade = lerQuantidade(dados.get("quantidade"));
  if (typeof produtoId !== "string" || !produtoId) return { ok: false, mensagem: "Produto não encontrado." };
  if (quantidade === null) return { ok: false, mensagem: "Escolha uma quantidade de 0 a 10." };
  try {
    const erro = await alterarCarrinho(cliente.uid, async (itens) => {
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
