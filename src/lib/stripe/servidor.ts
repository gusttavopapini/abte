// Cliente da Stripe (08/11/2026). SOMENTE no servidor: a chave secreta vem do
// ambiente (STRIPE_SECRET_KEY, no .env.local e na Vercel) e nunca é exibida
// nem registrada.
import "server-only";

import Stripe from "stripe";
import { liberacaoDoPagamento, TEXTO_FRETE_COMBINADO, type ItemDoPedido } from "@/lib/loja/pagamento";

let cliente: Stripe | null = null;

export function clienteStripe(): Stripe {
  const chave = process.env.STRIPE_SECRET_KEY;
  if (!chave) throw new Error("STRIPE_SECRET_KEY ausente.");
  cliente ??= new Stripe(chave, { appInfo: { name: "ABTE loja" }, maxNetworkRetries: 2 });
  return cliente;
}

export function liberacaoAtual() {
  return liberacaoDoPagamento(process.env);
}

// Formas de pagamento pedidas (cartão, Pix e boleto). Na API atual da
// Stripe é um filtro sobre as formas ativas na conta: a que não estiver
// ativada no painel da Stripe simplesmente não aparece no Checkout.
const FORMAS: Stripe.Checkout.SessionCreateParams.AllowedPaymentMethodType[] = ["card", "pix", "boleto"];

// Cria a sessão do Stripe Checkout hospedado para um pedido já gravado.
// Nenhum dado de cartão passa pelo site.
export async function criarSessaoDeCheckout({
  pedidoId,
  email,
  itens,
  frete,
  freteCombinado,
  temFisico,
  origem,
}: {
  pedidoId: string;
  email: string;
  itens: ItemDoPedido[];
  frete: number;
  freteCombinado: boolean;
  temFisico: boolean;
  origem: string;
}): Promise<{ id: string; url: string }> {
  const stripe = clienteStripe();
  const base: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    locale: "pt-BR",
    allowed_payment_method_types: FORMAS,
    currency: "brl",
    line_items: itens.map((item) => ({
      quantity: item.quantidade,
      price_data: {
        currency: "brl",
        unit_amount: item.precoUnitario,
        product_data: {
          name: item.nome.slice(0, 250),
          ...(item.tipo === "digital" ? { description: "Produto digital: a ABTE envia depois da compra." } : {}),
        },
      },
    })),
    customer_email: email || undefined,
    client_reference_id: pedidoId,
    metadata: { pedidoId },
    payment_intent_data: { metadata: { pedidoId } },
    ...(temFisico
      ? {
          shipping_address_collection: { allowed_countries: ["BR"] },
          phone_number_collection: { enabled: true },
          shipping_options: [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: { amount: frete, currency: "brl" },
                display_name: freteCombinado ? TEXTO_FRETE_COMBINADO : "Frete fixo",
              },
            },
          ],
        }
      : {}),
    success_url: `${origem}/loja/pedido/${pedidoId}?retorno=sucesso`,
    cancel_url: `${origem}/loja/carrinho?pagamento=cancelado`,
  };
  const sessao = await stripe.checkout.sessions.create(base, { idempotencyKey: `pedido-${pedidoId}` });
  if (!sessao.url) throw new Error("Sessão da Stripe sem endereço.");
  return { id: sessao.id, url: sessao.url };
}

// Forma de pagamento usada (card, pix, boleto), lida do pagamento na Stripe.
export async function metodoDoPagamento(pagamentoId: string): Promise<string | null> {
  const intencao = await clienteStripe().paymentIntents.retrieve(pagamentoId, { expand: ["payment_method"] });
  const metodo = intencao.payment_method;
  if (metodo && typeof metodo === "object") return metodo.type;
  return intencao.payment_method_types[0] ?? null;
}
