"use server";

// Finalizar compra (08/11/2026, Stripe Checkout em modo de teste). Confere a
// sessão do cliente, lê o carrinho e cada produto no Firestore (preço do
// servidor), calcula subtotal, frete e total em centavos, grava o pedido
// "aguardando_pagamento" e manda o cliente para o Checkout hospedado da
// Stripe. Nenhum dado de cartão passa pelo site.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { lerSessaoCliente } from "@/lib/auth/sessao-cliente";
import { lerItensDoCarrinho, lerProdutosDoCarrinho } from "@/lib/dados/carrinho";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { calcularPedido, DOCUMENTO_DA_LOJA, lerFreteFixo, mensagemDeErroDaStripe } from "@/lib/loja/pagamento";
import { criarPedido, marcarPedidoSemSessao, registrarSessaoDoPedido } from "@/lib/loja/pedidos";
import { criarSessaoDeCheckout, liberacaoAtual } from "@/lib/stripe/servidor";

export type RespostaDaCompra = { ok: false; mensagem: string } | null;

const MOTIVOS = {
  desligado: "A compra online ainda não está disponível.",
  "sem-chave": "O pagamento ainda não foi configurado. Avise a ABTE.",
  "producao-nao-confirmada": "O pagamento real ainda não foi liberado pela ABTE.",
} as const;

// Endereço do próprio site (para a volta da Stripe), pelo cabeçalho do pedido.
async function origemDoSite(): Promise<string | null> {
  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host") ?? "";
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) return null;
  const protocolo = cabecalhos.get("x-forwarded-proto") === "http" || /^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https";
  return `${protocolo}://${host}`;
}

export async function finalizarCompra(): Promise<RespostaDaCompra> {
  const liberacao = liberacaoAtual();
  if (!liberacao.ok) return { ok: false, mensagem: MOTIVOS[liberacao.motivo] };
  const cliente = await lerSessaoCliente();
  if (!cliente) return { ok: false, mensagem: "Entre na sua conta da loja para finalizar a compra." };
  const origem = await origemDoSite();
  if (!origem) return { ok: false, mensagem: "Não foi possível iniciar o pagamento agora. Tente de novo em instantes." };

  const db = firestoreAdmin();
  let url: string;
  try {
    const itens = await lerItensDoCarrinho(cliente.uid);
    const [produtos, loja] = await Promise.all([lerProdutosDoCarrinho(itens.map((item) => item.produtoId)), db.collection("configuracoes").doc(DOCUMENTO_DA_LOJA).get()]);
    const calculo = calcularPedido(itens, produtos, lerFreteFixo(loja.get("freteFixo")));
    if (!calculo.ok) return { ok: false, mensagem: calculo.erro };

    const pedidoId = await criarPedido(db, {
      clienteUid: cliente.uid,
      email: cliente.email,
      itens: calculo.itens,
      subtotal: calculo.subtotal,
      frete: calculo.frete,
      freteCombinado: calculo.freteCombinado,
      total: calculo.total,
      modo: liberacao.modo,
    });
    try {
      const sessao = await criarSessaoDeCheckout({ pedidoId, email: cliente.email, itens: calculo.itens, frete: calculo.frete, freteCombinado: calculo.freteCombinado, temFisico: calculo.temFisico, origem });
      await registrarSessaoDoPedido(db, pedidoId, sessao.id);
      url = sessao.url;
    } catch (erro) {
      const tipo = (erro as { type?: string }).type;
      // Só o tipo e o código vão para o log; nunca chaves nem dados do cliente.
      console.error(`Pedido ${pedidoId}: a Stripe recusou a sessão (${tipo ?? "erro"} ${(erro as { code?: string }).code ?? ""}).`);
      await marcarPedidoSemSessao(db, pedidoId).catch(() => {});
      return { ok: false, mensagem: mensagemDeErroDaStripe(tipo) };
    }
  } catch (falha) {
    console.error("Finalizar compra: falha ao preparar o pedido.", falha instanceof Error ? falha.message : falha);
    return { ok: false, mensagem: "Não foi possível iniciar o pagamento agora. Tente de novo em instantes." };
  }
  redirect(url);
}
