"use server";

// Finalizar compra (08/11/2026, Stripe Checkout em modo de teste). Desde a
// mesma data vale também sem conta: o pedido de visitante nasce com
// clienteUid null e um token aleatório (só o hash fica guardado) que abre a
// página do pedido na volta da Stripe. Lê o carrinho (da conta ou do cookie
// de visitante) ou o produto do "Comprar agora", e cada produto no Firestore
// (preço do servidor), calcula subtotal, frete e total em centavos, grava o
// pedido "aguardando_pagamento" e manda para o Checkout hospedado da Stripe.
// Nenhum dado de cartão passa pelo site.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { lerSessaoCliente, type ClienteDaSessao } from "@/lib/auth/sessao-cliente";
import { apagarCarrinhoDoVisitante, lerCarrinhoAtual, lerProdutosDoCarrinho } from "@/lib/dados/carrinho";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { lerQuantidade, type ItemDoCarrinho } from "@/lib/loja/carrinho";
import { gerarTokenDoPedido, tokenConfere } from "@/lib/loja/carrinhoVisitante";
import { calcularPedido, COLECAO_PEDIDOS, DOCUMENTO_DA_LOJA, lerFreteFixo, mensagemDeErroDaStripe } from "@/lib/loja/pagamento";
import { criarPedido, lerPedido, marcarPedidoSemSessao, registrarSessaoDoPedido, type OrigemDoPedido } from "@/lib/loja/pedidos";
import { criarSessaoDeCheckout, liberacaoAtual } from "@/lib/stripe/servidor";
import { ehIdDeDocumentoValido } from "@/lib/validacao";

export type RespostaDaCompra = { ok: false; mensagem: string } | null;

const MOTIVOS = {
  desligado: "A compra online ainda não está disponível.",
  "sem-chave": "O pagamento ainda não foi configurado. Avise a ABTE.",
  "producao-nao-confirmada": "O pagamento real ainda não foi liberado pela ABTE.",
} as const;

const FALHA = "Não foi possível iniciar o pagamento agora. Tente de novo em instantes.";

// Endereço do próprio site (para a volta da Stripe), pelo cabeçalho do pedido.
async function origemDoSite(): Promise<string | null> {
  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host") ?? "";
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) return null;
  const protocolo = cabecalhos.get("x-forwarded-proto") === "http" || /^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https";
  return `${protocolo}://${host}`;
}

// Grava o pedido e cria a sessão da Stripe. Devolve o endereço do Checkout
// ou a mensagem de erro.
async function iniciarCheckout(itens: ItemDoCarrinho[], cliente: ClienteDaSessao | null, origemDoPedido: OrigemDoPedido): Promise<{ url: string } | { erro: string }> {
  const liberacao = liberacaoAtual();
  if (!liberacao.ok) return { erro: MOTIVOS[liberacao.motivo] };
  const origem = await origemDoSite();
  if (!origem) return { erro: FALHA };

  const db = firestoreAdmin();
  try {
    const [produtos, loja] = await Promise.all([lerProdutosDoCarrinho(itens.map((item) => item.produtoId)), db.collection("configuracoes").doc(DOCUMENTO_DA_LOJA).get()]);
    const calculo = calcularPedido(itens, produtos, lerFreteFixo(loja.get("freteFixo")));
    if (!calculo.ok) return { erro: calculo.erro };

    const { token, hash } = gerarTokenDoPedido();
    const pedidoId = await criarPedido(db, {
      clienteUid: cliente?.uid ?? null,
      email: cliente?.email ?? "",
      itens: calculo.itens,
      subtotal: calculo.subtotal,
      frete: calculo.frete,
      freteCombinado: calculo.freteCombinado,
      total: calculo.total,
      modo: liberacao.modo,
      tokenHash: hash,
      origem: origemDoPedido,
    });
    try {
      const sessao = await criarSessaoDeCheckout({
        pedidoId,
        email: cliente?.email ?? "",
        itens: calculo.itens,
        frete: calculo.frete,
        freteCombinado: calculo.freteCombinado,
        temFisico: calculo.temFisico,
        origem,
        token,
        visitante: !cliente,
      });
      await registrarSessaoDoPedido(db, pedidoId, sessao.id);
      return { url: sessao.url };
    } catch (erro) {
      const tipo = (erro as { type?: string }).type;
      // Só o tipo e o código vão para o log; nunca chaves nem dados do cliente.
      console.error(`Pedido ${pedidoId}: a Stripe recusou a sessão (${tipo ?? "erro"} ${(erro as { code?: string }).code ?? ""}).`);
      await marcarPedidoSemSessao(db, pedidoId).catch(() => {});
      return { erro: mensagemDeErroDaStripe(tipo) };
    }
  } catch (falha) {
    console.error("Finalizar compra: falha ao preparar o pedido.", falha instanceof Error ? falha.message : falha);
    return { erro: FALHA };
  }
}

// "Finalizar compra" no carrinho (com ou sem conta).
export async function finalizarCompra(): Promise<RespostaDaCompra> {
  const { cliente, itens } = await lerCarrinhoAtual();
  const resultado = await iniciarCheckout(itens, cliente, "carrinho");
  if ("erro" in resultado) return { ok: false, mensagem: resultado.erro };
  redirect(resultado.url);
}

// "Comprar agora" na página do produto: vai direto ao Checkout só com aquele
// produto e quantidade, sem mexer no carrinho.
export async function comprarAgora(_anterior: RespostaDaCompra, dados: FormData): Promise<RespostaDaCompra> {
  const produtoId = dados.get("produtoId");
  const quantidade = lerQuantidade(dados.get("quantidade"));
  if (!ehIdDeDocumentoValido(produtoId)) return { ok: false, mensagem: "Produto não encontrado." };
  if (quantidade === null || quantidade < 1) return { ok: false, mensagem: "Escolha uma quantidade de 1 a 10." };
  const cliente = await lerSessaoCliente();
  const resultado = await iniciarCheckout([{ produtoId, quantidade }], cliente, "comprar-agora");
  if ("erro" in resultado) return { ok: false, mensagem: resultado.erro };
  redirect(resultado.url);
}

// Visitante que pagou: a página do pedido chama esta ação para esvaziar o
// carrinho do cookie (o webhook não alcança o navegador). Só com o token
// certo, pedido de visitante, vindo do carrinho e já pago.
export async function limparCarrinhoDoVisitantePago(pedidoId: string, token: string): Promise<void> {
  if (!ehIdDeDocumentoValido(pedidoId)) return;
  const pedido = lerPedido(pedidoId, (await firestoreAdmin().collection(COLECAO_PEDIDOS).doc(pedidoId).get()).data());
  if (!pedido || pedido.clienteUid || pedido.origem !== "carrinho" || pedido.status !== "pago") return;
  if (!tokenConfere(token, pedido.tokenHash)) return;
  await apagarCarrinhoDoVisitante();
}
