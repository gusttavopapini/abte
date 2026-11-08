// Processamento do webhook da Stripe (08/11/2026), sem Next.js e sem
// server-only, para os testes no emulador: confere a assinatura com o
// segredo do endpoint e aplica o evento ao pedido. Assinatura ausente ou
// inválida: 400, nada gravado.
import type Stripe from "stripe";
import type { Firestore } from "firebase-admin/firestore";
import { aplicarEventoDaStripe, type EventoDaStripe, type ResultadoDoEvento } from "./pedidos.ts";

export type RespostaDoWebhook = { status: 200 | 400 | 500; mensagem: string; resultado?: ResultadoDoEvento };

export async function processarWebhook({
  corpo,
  assinatura,
  segredo,
  stripe,
  db,
  metodoDoPagamento,
}: {
  // Corpo bruto, exatamente como chegou (a assinatura é calculada sobre ele).
  corpo: string;
  assinatura: string | null;
  segredo: string | undefined;
  stripe: Pick<Stripe, "webhooks">;
  db: Firestore;
  // Forma de pagamento usada (card, pix, boleto), lida da Stripe; opcional.
  metodoDoPagamento?: (evento: EventoDaStripe) => Promise<string | null>;
}): Promise<RespostaDoWebhook> {
  if (!segredo) return { status: 500, mensagem: "Webhook sem segredo configurado." };
  if (!assinatura) return { status: 400, mensagem: "Assinatura ausente." };
  let evento: EventoDaStripe;
  try {
    evento = stripe.webhooks.constructEvent(corpo, assinatura, segredo) as unknown as EventoDaStripe;
  } catch {
    return { status: 400, mensagem: "Assinatura inválida." };
  }
  const metodo = metodoDoPagamento ? await metodoDoPagamento(evento).catch(() => null) : null;
  const resultado = await aplicarEventoDaStripe(db, evento, metodo);
  return { status: 200, mensagem: "Recebido.", resultado };
}
