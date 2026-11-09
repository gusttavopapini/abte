// Gravação dos pedidos da loja (08/11/2026). Firestore recebido por
// parâmetro, sem server-only, para servir à ação, ao webhook e aos testes no
// emulador. Só o servidor grava; as regras negam tudo ao navegador.
import { FieldValue, type Firestore, type Timestamp } from "firebase-admin/firestore";
import { registrarNaTransacao, type AutorDaAlteracao } from "../log/alteracoes.ts";
import { COLECAO_CARRINHOS } from "./contas.ts";
import {
  COLECAO_EVENTOS_STRIPE,
  COLECAO_PEDIDOS,
  DOCUMENTO_DA_LOJA,
  MOEDA,
  ROTULOS_DO_ENVIO,
  ehStatusDoPedido,
  podeMudarStatus,
  statusPeloEvento,
  type ItemDoPedido,
  type SituacaoDeEnvio,
  type StatusDoPedido,
} from "./pagamento.ts";

export type EnderecoDoPedido = { nome: string; linha1: string; linha2: string; bairro: string; cidade: string; estado: string; cep: string; pais: string };

// clienteUid null: pedido de visitante (sem conta, desde 08/11/2026).
// tokenHash: hash do token da volta da Stripe (o token nunca é guardado).
// origem: "carrinho" (finalizar compra) ou "comprar-agora" (um produto só,
// sem mexer no carrinho).
export type OrigemDoPedido = "carrinho" | "comprar-agora";

export type Pedido = {
  id: string;
  clienteUid: string | null;
  tokenHash: string | null;
  origem: OrigemDoPedido;
  nome: string | null;
  itens: ItemDoPedido[];
  subtotal: number;
  frete: number;
  freteCombinado: boolean;
  total: number;
  moeda: string;
  status: StatusDoPedido;
  envio: { situacao: SituacaoDeEnvio; atualizadoEm: Date | null };
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  metodo: string | null;
  email: string;
  telefone: string | null;
  endereco: EnderecoDoPedido | null;
  modo: "teste" | "producao";
  criadoEm: Date | null;
  atualizadoEm: Date | null;
  pagoEm: Date | null;
};

const data = (valor: unknown): Date | null => (valor && typeof (valor as Timestamp).toDate === "function" ? (valor as Timestamp).toDate() : null);
const texto = (valor: unknown): string => (typeof valor === "string" ? valor : "");

// Leitura tolerante de um documento de pedido.
export function lerPedido(id: string, dados: Record<string, unknown> | undefined): Pedido | null {
  if (!dados) return null;
  const itens = Array.isArray(dados.itens) ? (dados.itens as ItemDoPedido[]) : [];
  const envio = (dados.envio ?? {}) as { situacao?: unknown; atualizadoEm?: unknown };
  const situacao = envio.situacao === "enviado" || envio.situacao === "entregue" ? envio.situacao : "pendente";
  return {
    id,
    clienteUid: texto(dados.clienteUid) || null,
    tokenHash: texto(dados.tokenHash) || null,
    origem: dados.origem === "comprar-agora" ? "comprar-agora" : "carrinho",
    nome: texto(dados.nome) || null,
    itens,
    subtotal: Number(dados.subtotal) || 0,
    frete: Number(dados.frete) || 0,
    freteCombinado: dados.freteCombinado === true,
    total: Number(dados.total) || 0,
    moeda: texto(dados.moeda) || MOEDA,
    status: ehStatusDoPedido(dados.status) ? dados.status : "aguardando_pagamento",
    envio: { situacao, atualizadoEm: data(envio.atualizadoEm) },
    stripeSessionId: texto(dados.stripeSessionId) || null,
    stripePaymentIntentId: texto(dados.stripePaymentIntentId) || null,
    metodo: texto(dados.metodo) || null,
    email: texto(dados.email),
    telefone: texto(dados.telefone) || null,
    endereco: (dados.endereco as EnderecoDoPedido | null) ?? null,
    modo: dados.modo === "producao" ? "producao" : "teste",
    criadoEm: data(dados.criadoEm),
    atualizadoEm: data(dados.atualizadoEm),
    pagoEm: data(dados.pagoEm),
  };
}

// Cria o pedido "aguardando_pagamento" com o retrato dos itens e dos valores.
export async function criarPedido(
  db: Firestore,
  dados: {
    clienteUid: string | null;
    email: string;
    itens: ItemDoPedido[];
    subtotal: number;
    frete: number;
    freteCombinado: boolean;
    total: number;
    modo: "teste" | "producao";
    tokenHash?: string | null;
    origem?: OrigemDoPedido;
  },
): Promise<string> {
  const referencia = db.collection(COLECAO_PEDIDOS).doc();
  await referencia.set({
    clienteUid: dados.clienteUid,
    tokenHash: dados.tokenHash ?? null,
    origem: dados.origem ?? "carrinho",
    nome: null,
    itens: dados.itens,
    subtotal: dados.subtotal,
    frete: dados.frete,
    freteCombinado: dados.freteCombinado,
    total: dados.total,
    moeda: MOEDA,
    status: "aguardando_pagamento",
    envio: { situacao: "pendente", atualizadoEm: null },
    stripeSessionId: null,
    stripePaymentIntentId: null,
    metodo: null,
    email: dados.email,
    telefone: null,
    endereco: null,
    modo: dados.modo,
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
    pagoEm: null,
  });
  return referencia.id;
}

export async function registrarSessaoDoPedido(db: Firestore, pedidoId: string, stripeSessionId: string): Promise<void> {
  await db.collection(COLECAO_PEDIDOS).doc(pedidoId).update({ stripeSessionId, atualizadoEm: FieldValue.serverTimestamp() });
}

// Pedido que não chegou à Stripe (erro ao criar a sessão): fica como falhou.
export async function marcarPedidoSemSessao(db: Firestore, pedidoId: string): Promise<void> {
  await db.collection(COLECAO_PEDIDOS).doc(pedidoId).update({ status: "falhou", atualizadoEm: FieldValue.serverTimestamp() });
}

// ---------- Evento da Stripe (webhook) ----------

// O mínimo que o processamento lê do evento (formato da API da Stripe).
export type EventoDaStripe = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

export type ResultadoDoEvento = "processado" | "repetido" | "ignorado" | "sem-pedido" | "sem-mudanca";

const objeto = (valor: unknown): Record<string, unknown> => (valor && typeof valor === "object" ? (valor as Record<string, unknown>) : {});

// Endereço de entrega e contato informados no Checkout (formato atual,
// collected_information.shipping_details, e o antigo, shipping_details).
function enderecoDaSessao(sessao: Record<string, unknown>): EnderecoDoPedido | null {
  const entrega = objeto(objeto(sessao.collected_information).shipping_details ?? sessao.shipping_details);
  const endereco = objeto(entrega.address);
  if (!endereco.line1) return null;
  return {
    nome: texto(entrega.name),
    linha1: texto(endereco.line1),
    linha2: texto(endereco.line2),
    bairro: "",
    cidade: texto(endereco.city),
    estado: texto(endereco.state),
    cep: texto(endereco.postal_code),
    pais: texto(endereco.country),
  };
}

// Aplica um evento já verificado (assinatura conferida antes). Idempotente: o
// id do evento é gravado em eventosStripe na mesma transação; repetido não
// faz nada. O retorno do navegador nunca passa por aqui.
// metodoDoPagamento: forma de pagamento usada (card, pix, boleto), lida da
// Stripe pelo webhook quando o evento não traz; nos testes, um valor fixo.
export async function aplicarEventoDaStripe(db: Firestore, evento: EventoDaStripe, metodoDoPagamento: string | null = null): Promise<ResultadoDoEvento> {
  const novo = statusPeloEvento(evento.type, texto(evento.data.object.payment_status) || null);
  const refEvento = db.collection(COLECAO_EVENTOS_STRIPE).doc(evento.id);
  const pedidos = db.collection(COLECAO_PEDIDOS);
  const obj = evento.data.object;

  return db.runTransaction(async (transacao) => {
    if ((await transacao.get(refEvento)).exists) return "repetido";
    const marcar = (resultado: ResultadoDoEvento, pedidoId: string | null) => {
      transacao.set(refEvento, { tipo: evento.type, pedidoId, resultado, processadoEm: FieldValue.serverTimestamp() });
      return resultado;
    };
    if (!novo) return marcar("ignorado", null);

    // Qual pedido: pela sessão (client_reference_id ou metadata) ou, no
    // reembolso, pelo pagamento.
    let pedidoId = texto(obj.client_reference_id) || texto(objeto(obj.metadata).pedidoId);
    if (!pedidoId && evento.type === "charge.refunded") {
      const intencao = texto(obj.payment_intent);
      if (intencao) {
        const achados = await transacao.get(pedidos.where("stripePaymentIntentId", "==", intencao).limit(1));
        pedidoId = achados.docs[0]?.id ?? "";
      }
    }
    if (!pedidoId || pedidoId.includes("/")) return marcar("sem-pedido", null);
    const refPedido = pedidos.doc(pedidoId);
    const pedido = lerPedido(pedidoId, (await transacao.get(refPedido)).data());
    if (!pedido) return marcar("sem-pedido", pedidoId);

    const mudancas: Record<string, unknown> = { atualizadoEm: FieldValue.serverTimestamp() };
    if (evento.type.startsWith("checkout.session.")) {
      const intencao = texto(obj.payment_intent);
      if (intencao) mudancas.stripePaymentIntentId = intencao;
      if (texto(obj.id)) mudancas.stripeSessionId = texto(obj.id);
      const contato = objeto(obj.customer_details);
      if (texto(contato.email)) mudancas.email = texto(contato.email);
      if (texto(contato.phone)) mudancas.telefone = texto(contato.phone);
      if (texto(contato.name)) mudancas.nome = texto(contato.name).slice(0, 120);
      const endereco = enderecoDaSessao(obj);
      if (endereco) mudancas.endereco = endereco;
      if (metodoDoPagamento) mudancas.metodo = metodoDoPagamento;
    }
    const mudaStatus = podeMudarStatus(pedido.status, novo);
    if (mudaStatus) {
      mudancas.status = novo;
      if (novo === "pago") {
        mudancas.pagoEm = FieldValue.serverTimestamp();
        // Pago: o carrinho do cliente é esvaziado (só quando o pedido veio
        // do carrinho; "Comprar agora" não mexe nele). O carrinho de visitante
        // fica num cookie e é limpo pela página do pedido.
        if (pedido.clienteUid && pedido.origem === "carrinho") transacao.set(db.collection(COLECAO_CARRINHOS).doc(pedido.clienteUid), { itens: [], atualizadoEm: new Date() });
      }
    }
    transacao.update(refPedido, mudancas);
    return marcar(mudaStatus ? "processado" : "sem-mudanca", pedidoId);
  });
}

// ---------- Painel ----------

// Envio (só pedido pago): pendente, enviado ou entregue, com o registro.
export async function marcarEnvioDoPedido(db: Firestore, pedidoId: string, situacao: Exclude<SituacaoDeEnvio, "pendente">, autor: AutorDaAlteracao): Promise<string | null> {
  const referencia = db.collection(COLECAO_PEDIDOS).doc(pedidoId);
  return db.runTransaction(async (transacao) => {
    const pedido = lerPedido(pedidoId, (await transacao.get(referencia)).data());
    if (!pedido) return "Pedido não encontrado.";
    if (pedido.status !== "pago") return "Só pedido pago pode ser marcado como enviado ou entregue.";
    if (pedido.envio.situacao === situacao) return null;
    transacao.update(referencia, { envio: { situacao, atualizadoEm: FieldValue.serverTimestamp() }, atualizadoEm: FieldValue.serverTimestamp() });
    registrarNaTransacao(db, transacao, autor, {
      colecao: COLECAO_PEDIDOS,
      documentoId: pedidoId,
      acao: "editar",
      campos: ["envio"],
      resumo: `Pedido marcado como ${ROTULOS_DO_ENVIO[situacao].toLowerCase()}.`,
    });
    return null;
  });
}

// Frete fixo da loja (centavos; null apaga o valor), com o registro.
export async function gravarFreteFixo(db: Firestore, centavos: number | null, autor: AutorDaAlteracao): Promise<void> {
  const referencia = db.collection("configuracoes").doc(DOCUMENTO_DA_LOJA);
  await db.runTransaction(async (transacao) => {
    await transacao.get(referencia);
    transacao.set(referencia, { freteFixo: centavos, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    registrarNaTransacao(db, transacao, autor, {
      colecao: "configuracoes",
      documentoId: DOCUMENTO_DA_LOJA,
      acao: "editar",
      campos: ["freteFixo"],
      resumo: centavos === null ? "Frete fixo removido (frete combinado pela ABTE)." : "Frete fixo alterado.",
    });
  });
}
