// Regras puras do pagamento da loja (08/11/2026, Stripe Checkout em modo de
// teste, pedido do responsável). Sem segredos e sem dependências: usadas pela
// ação de finalizar compra, pelo webhook, pelas páginas e pelos testes.
// Valores sempre em centavos; preço, nome e situação vêm do Firestore no
// servidor, nunca do navegador.
import { precoAtual } from "../produtos.ts";
import { quantidadeMaxima, situacaoDoProduto, type ItemDoCarrinho, type ProdutoDoCarrinho } from "./carrinho.ts";

export const COLECAO_PEDIDOS = "pedidos";
// Ids dos eventos da Stripe já processados (idempotência do webhook).
export const COLECAO_EVENTOS_STRIPE = "eventosStripe";
// configuracoes/loja: frete fixo em centavos (só o administrador edita).
export const DOCUMENTO_DA_LOJA = "loja";
export const MOEDA = "brl";

export const TEXTO_FRETE_COMBINADO = "Frete combinado pela ABTE após a compra";
export const TEXTO_MODO_DE_TESTE = "Modo de teste: nenhum valor é cobrado";
export const TEXTO_PAGAMENTO_SEGURO = "Pagamento seguro pela Stripe: cartão, Pix ou boleto";

// ---------- Ligar e desligar ----------

type Ambiente = Record<string, string | undefined>;

export type ModoDaChave = "teste" | "producao" | "ausente";

// Pela chave secreta: sk_test_ é teste, sk_live_ é produção. Chaves restritas
// (rk_) seguem a mesma regra.
export function modoDaChave(chave: string | undefined): ModoDaChave {
  const valor = (chave ?? "").trim();
  if (/^(sk|rk)_test_/.test(valor)) return "teste";
  if (/^(sk|rk)_live_/.test(valor)) return "producao";
  return "ausente";
}

// Pagamento ligado só com PAGAMENTO_HABILITADO=sim. Desligado, o site fica
// como antes ("Em breve").
export function pagamentoHabilitado(ambiente: Ambiente): boolean {
  return (ambiente.PAGAMENTO_HABILITADO ?? "").trim().toLowerCase() === "sim";
}

export type Liberacao = { ok: true; modo: "teste" | "producao" } | { ok: false; motivo: "desligado" | "sem-chave" | "producao-nao-confirmada" };

// Pode criar sessão de pagamento? Ligado, com chave, e chave de produção só
// com PAGAMENTO_PRODUCAO_CONFIRMADO=sim.
export function liberacaoDoPagamento(ambiente: Ambiente): Liberacao {
  if (!pagamentoHabilitado(ambiente)) return { ok: false, motivo: "desligado" };
  const modo = modoDaChave(ambiente.STRIPE_SECRET_KEY);
  if (modo === "ausente") return { ok: false, motivo: "sem-chave" };
  if (modo === "producao" && (ambiente.PAGAMENTO_PRODUCAO_CONFIRMADO ?? "").trim().toLowerCase() !== "sim") {
    return { ok: false, motivo: "producao-nao-confirmada" };
  }
  return { ok: true, modo };
}

// ---------- Frete ----------

// Frete fixo gravado em configuracoes/loja (centavos, inteiro >= 0); qualquer
// outra coisa vale como "sem valor cadastrado".
export function lerFreteFixo(valor: unknown): number | null {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0 && valor <= 10_000_000 ? valor : null;
}

// ---------- Pedido ----------

export type ItemDoPedido = { produtoId: string; nome: string; tipo: "fisico" | "digital"; precoUnitario: number; quantidade: number };

export type CalculoDoPedido =
  | {
      ok: true;
      itens: ItemDoPedido[];
      subtotal: number;
      frete: number;
      total: number;
      temFisico: boolean;
      // Produto físico sem frete cadastrado: frete 0 e "combinado pela ABTE".
      freteCombinado: boolean;
    }
  | { ok: false; erro: string };

// Monta o pedido a partir do carrinho e dos produtos lidos agora no servidor.
// Recusa o carrinho vazio e qualquer item fora da loja ou esgotado (a pessoa
// precisa tirar o item antes de pagar). Frete só com produto físico.
export function calcularPedido(itens: ItemDoCarrinho[], produtos: Map<string, ProdutoDoCarrinho>, freteFixo: number | null): CalculoDoPedido {
  if (itens.length === 0) return { ok: false, erro: "Seu carrinho está vazio." };
  const linhas: ItemDoPedido[] = [];
  for (const item of itens) {
    const produto = produtos.get(item.produtoId);
    const situacao = situacaoDoProduto(produto);
    if (!produto || situacao === "indisponivel") return { ok: false, erro: "Um produto do carrinho não está mais na loja. Remova-o para finalizar a compra." };
    if (situacao === "esgotado") return { ok: false, erro: `O produto "${produto.nome}" está esgotado. Remova-o para finalizar a compra.` };
    const precoUnitario = precoAtual(produto);
    if (!Number.isInteger(precoUnitario) || precoUnitario <= 0) return { ok: false, erro: `O produto "${produto.nome}" está sem preço. Fale com a ABTE.` };
    const quantidade = Math.min(item.quantidade, quantidadeMaxima(produto.tipo));
    if (!Number.isInteger(quantidade) || quantidade < 1) return { ok: false, erro: "Quantidade inválida no carrinho." };
    linhas.push({ produtoId: produto.id, nome: produto.nome, tipo: produto.tipo, precoUnitario, quantidade });
  }
  const subtotal = linhas.reduce((soma, linha) => soma + linha.precoUnitario * linha.quantidade, 0);
  const temFisico = linhas.some((linha) => linha.tipo === "fisico");
  const frete = temFisico ? (freteFixo ?? 0) : 0;
  return { ok: true, itens: linhas, subtotal, frete, total: subtotal + frete, temFisico, freteCombinado: temFisico && freteFixo === null };
}

// ---------- Situação do pedido ----------

export const STATUS_DO_PEDIDO = ["aguardando_pagamento", "pago", "falhou", "expirado", "reembolsado"] as const;
export type StatusDoPedido = (typeof STATUS_DO_PEDIDO)[number];

export const ROTULOS_DO_STATUS: Record<StatusDoPedido, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  falhou: "Pagamento não aprovado",
  expirado: "Expirado",
  reembolsado: "Reembolsado",
};

export const SITUACOES_DE_ENVIO = ["pendente", "enviado", "entregue"] as const;
export type SituacaoDeEnvio = (typeof SITUACOES_DE_ENVIO)[number];
export const ROTULOS_DO_ENVIO: Record<SituacaoDeEnvio, string> = { pendente: "Envio pendente", enviado: "Enviado", entregue: "Entregue" };

export function ehStatusDoPedido(valor: unknown): valor is StatusDoPedido {
  return typeof valor === "string" && (STATUS_DO_PEDIDO as readonly string[]).includes(valor);
}

// Eventos da Stripe que o webhook trata.
export const EVENTOS_TRATADOS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "charge.refunded",
] as const;

// Nova situação pelo evento. checkout.session.completed só vale como pago com
// payment_status "paid" (cartão); Pix e boleto chegam como "unpaid" e ficam
// aguardando até o async_payment_succeeded. null: o evento não muda nada.
export function statusPeloEvento(tipo: string, pagamentoDaSessao?: string | null): StatusDoPedido | null {
  switch (tipo) {
    case "checkout.session.completed":
      return pagamentoDaSessao === "paid" || pagamentoDaSessao === "no_payment_required" ? "pago" : "aguardando_pagamento";
    case "checkout.session.async_payment_succeeded":
      return "pago";
    case "checkout.session.async_payment_failed":
      return "falhou";
    case "checkout.session.expired":
      return "expirado";
    case "charge.refunded":
      return "reembolsado";
    default:
      return null;
  }
}

// Um evento atrasado não desfaz um estado mais adiantado: pedido pago não
// volta a aguardando nem expira; reembolsado é final.
export function podeMudarStatus(atual: StatusDoPedido, novo: StatusDoPedido): boolean {
  if (atual === novo) return false;
  if (atual === "reembolsado") return false;
  if (atual === "pago") return novo === "reembolsado";
  if (novo === "reembolsado") return false;
  return true;
}

// Texto da página do pedido para o cliente.
export function textoDoPedido(status: StatusDoPedido, metodo: string | null): string {
  switch (status) {
    case "pago":
      return "Pagamento confirmado. Obrigado! A ABTE vai preparar o envio dos seus produtos.";
    case "aguardando_pagamento":
      if (metodo === "pix") return "Aguardando o pagamento do Pix. Assim que a Stripe confirmar, esta página mostra o pedido como pago.";
      if (metodo === "boleto") return "Aguardando o pagamento do boleto. A confirmação pode levar até 3 dias úteis depois do pagamento.";
      return "Aguardando a confirmação do pagamento pela Stripe. Atualize esta página em alguns instantes.";
    case "falhou":
      return "O pagamento não foi aprovado. Seu carrinho continua guardado: você pode tentar de novo.";
    case "expirado":
      return "O prazo para pagar este pedido terminou. Seu carrinho continua guardado: você pode finalizar a compra de novo.";
    case "reembolsado":
      return "Este pedido foi reembolsado.";
  }
}

// Forma de pagamento como a Stripe informa (card, pix, boleto), em português.
export const ROTULOS_DO_METODO: Record<string, string> = { card: "Cartão", pix: "Pix", boleto: "Boleto" };
export function rotuloDoMetodo(metodo: string | null): string {
  if (!metodo) return "Ainda não informado";
  return ROTULOS_DO_METODO[metodo] ?? metodo;
}

// Erros da Stripe em português simples (o detalhe técnico fica só no log do servidor).
export function mensagemDeErroDaStripe(tipo: string | undefined): string {
  switch (tipo) {
    case "StripeAuthenticationError":
      return "O pagamento está mal configurado no servidor. Avise a ABTE.";
    case "StripeRateLimitError":
      return "Muitos pedidos ao mesmo tempo. Tente de novo em instantes.";
    case "StripeConnectionError":
    case "StripeAPIError":
      return "Não foi possível falar com a Stripe agora. Tente de novo em instantes.";
    case "StripeInvalidRequestError":
      return "A Stripe recusou o pedido. Tente de novo ou fale com a ABTE.";
    default:
      return "Não foi possível iniciar o pagamento agora. Tente de novo em instantes.";
  }
}
