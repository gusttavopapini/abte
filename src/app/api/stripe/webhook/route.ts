// Webhook da Stripe (08/11/2026): POST com o corpo bruto e a assinatura
// conferida pelo segredo do endpoint (STRIPE_WEBHOOK_SECRET). Fora de
// qualquer login (o proxy só cobre /admin). É o único caminho que marca um
// pedido como pago; o retorno do navegador nunca marca.
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { processarWebhook } from "@/lib/loja/webhook";
import { clienteStripe, metodoDoPagamento } from "@/lib/stripe/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const corpo = await request.text();
  try {
    const resposta = await processarWebhook({
      corpo,
      assinatura: request.headers.get("stripe-signature"),
      segredo: process.env.STRIPE_WEBHOOK_SECRET,
      stripe: clienteStripe(),
      db: firestoreAdmin(),
      metodoDoPagamento: async (evento) => {
        const pagamento = evento.data.object.payment_intent;
        return typeof pagamento === "string" && evento.type.startsWith("checkout.session.") ? metodoDoPagamento(pagamento) : null;
      },
    });
    if (resposta.status !== 200) console.error(`Webhook da Stripe recusado: ${resposta.mensagem}`);
    return Response.json({ recebido: resposta.status === 200 }, { status: resposta.status });
  } catch (falha) {
    // A Stripe tenta de novo depois; o evento só é marcado quando processado.
    console.error("Webhook da Stripe: falha ao processar.", falha instanceof Error ? falha.message : falha);
    return Response.json({ recebido: false }, { status: 500 });
  }
}
