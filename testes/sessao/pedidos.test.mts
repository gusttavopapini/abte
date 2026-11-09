// Testes dos pedidos e do webhook da Stripe no emulador do Firestore (npm run
// test:sessao, 08/11/2026), num projeto só deles (demo-abte-pedidos). Os
// eventos são montados aqui e assinados com o gerador de cabeçalho da própria
// biblioteca da Stripe (sem rede, sem chave real). Dados fictícios.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import Stripe from "stripe";
import { COLECAO_LOG } from "../../src/lib/log/alteracoes.ts";
import { COLECAO_EVENTOS_STRIPE, COLECAO_PEDIDOS } from "../../src/lib/loja/pagamento.ts";
import { criarPedido, gravarFreteFixo, lerPedido, marcarEnvioDoPedido } from "../../src/lib/loja/pedidos.ts";
import { processarWebhook } from "../../src/lib/loja/webhook.ts";
import { decidirAcessoAoPedido, gerarTokenDoPedido } from "../../src/lib/loja/carrinhoVisitante.ts";
import { mesclarNoCarrinhoDaConta } from "../../src/lib/loja/mesclagem.ts";
import type { ProdutoDoCarrinho } from "../../src/lib/loja/carrinho.ts";

const PROJETO = "demo-abte-pedidos";
const SEGREDO = "whsec_TESTE_pedidos";
const stripe = new Stripe("sk_test_TESTE");
const AUTOR = { uid: "admin-teste", nome: "TESTE Administrador", papel: "administrador" as const };
let app: App;
let db: Firestore;
let contador = 0;

before(() => {
  app = initializeApp({ projectId: PROJETO }, "testes-pedidos");
  db = getFirestore(app);
});

after(async () => {
  await deleteApp(app);
});

async function novoPedido(clienteUid = "cliente-teste"): Promise<string> {
  await db.doc(`carrinhos/${clienteUid}`).set({ itens: [{ produtoId: "p1", quantidade: 1 }] });
  return criarPedido(db, {
    clienteUid,
    email: "cliente@exemplo.invalid",
    itens: [{ produtoId: "p1", nome: "TESTE Cartilha", tipo: "fisico", precoUnitario: 3000, quantidade: 1 }],
    subtotal: 3000,
    frete: 0,
    freteCombinado: true,
    total: 3000,
    modo: "teste",
  });
}

// Envia um evento assinado ao processamento do webhook.
async function enviar(tipo: string, objeto: Record<string, unknown>, id = `evt_teste_${++contador}`, metodo: string | null = "card") {
  const corpo = JSON.stringify({ id, object: "event", type: tipo, data: { object: objeto } });
  const assinatura = stripe.webhooks.generateTestHeaderString({ payload: corpo, secret: SEGREDO });
  return processarWebhook({ corpo, assinatura, segredo: SEGREDO, stripe, db, metodoDoPagamento: async () => metodo });
}

const ler = async (id: string) => lerPedido(id, (await db.collection(COLECAO_PEDIDOS).doc(id).get()).data())!;
const sessao = (pedidoId: string, extra: Record<string, unknown> = {}) => ({
  id: `cs_test_${pedidoId}`,
  object: "checkout.session",
  client_reference_id: pedidoId,
  metadata: { pedidoId },
  payment_intent: `pi_test_${pedidoId}`,
  customer_details: { email: "comprador@exemplo.invalid", phone: "+5511900000000" },
  collected_information: { shipping_details: { name: "TESTE Cliente", address: { line1: "Rua de Teste, 1", line2: "", city: "São Paulo", state: "SP", postal_code: "01000-000", country: "BR" } } },
  ...extra,
});

describe("webhook da Stripe e pedidos", () => {
  test("pedido nasce aguardando pagamento, com o retrato dos itens", async () => {
    const id = await novoPedido();
    const pedido = await ler(id);
    assert.equal(pedido.status, "aguardando_pagamento");
    assert.equal(pedido.envio.situacao, "pendente");
    assert.equal(pedido.itens[0].precoUnitario, 3000);
  });

  test("assinatura inválida: 400 e nada muda", async () => {
    const id = await novoPedido();
    const corpo = JSON.stringify({ id: "evt_falso", type: "checkout.session.completed", data: { object: sessao(id, { payment_status: "paid" }) } });
    const resposta = await processarWebhook({ corpo, assinatura: stripe.webhooks.generateTestHeaderString({ payload: corpo, secret: "whsec_outro" }), segredo: SEGREDO, stripe, db });
    assert.equal(resposta.status, 400);
    assert.equal((await ler(id)).status, "aguardando_pagamento");
    assert.equal((await db.collection(COLECAO_EVENTOS_STRIPE).doc("evt_falso").get()).exists, false);
  });

  test("cartão aprovado: pago, com forma, contato e endereço; carrinho esvaziado", async () => {
    const id = await novoPedido("cliente-cartao");
    const resposta = await enviar("checkout.session.completed", sessao(id, { payment_status: "paid" }));
    assert.equal(resposta.status, 200);
    assert.equal(resposta.resultado, "processado");
    const pedido = await ler(id);
    assert.equal(pedido.status, "pago");
    assert.equal(pedido.metodo, "card");
    assert.ok(pedido.pagoEm);
    assert.equal(pedido.telefone, "+5511900000000");
    assert.equal(pedido.endereco?.cidade, "São Paulo");
    assert.equal(pedido.stripePaymentIntentId, `pi_test_${id}`);
    assert.deepEqual((await db.doc("carrinhos/cliente-cartao").get()).get("itens"), []);
  });

  test("Pix ou boleto: aguardando no completed, pago no async_payment_succeeded", async () => {
    const id = await novoPedido("cliente-pix");
    await enviar("checkout.session.completed", sessao(id, { payment_status: "unpaid" }), undefined, "pix");
    assert.equal((await ler(id)).status, "aguardando_pagamento");
    assert.equal((await ler(id)).metodo, "pix");
    assert.equal((await db.doc("carrinhos/cliente-pix").get()).get("itens").length, 1);
    await enviar("checkout.session.async_payment_succeeded", sessao(id, { payment_status: "paid" }), undefined, "pix");
    assert.equal((await ler(id)).status, "pago");
  });

  test("boleto vencido sem pagamento: falhou; sessão expirada: expirado", async () => {
    const falhou = await novoPedido();
    await enviar("checkout.session.async_payment_failed", sessao(falhou), undefined, "boleto");
    assert.equal((await ler(falhou)).status, "falhou");
    const expirado = await novoPedido();
    await enviar("checkout.session.expired", sessao(expirado, { payment_intent: null }));
    assert.equal((await ler(expirado)).status, "expirado");
  });

  test("reembolso pelo pagamento: reembolsado; evento atrasado não volta atrás", async () => {
    const id = await novoPedido();
    await enviar("checkout.session.completed", sessao(id, { payment_status: "paid" }));
    await enviar("checkout.session.expired", sessao(id));
    assert.equal((await ler(id)).status, "pago");
    await enviar("charge.refunded", { id: "ch_teste", object: "charge", payment_intent: `pi_test_${id}` });
    assert.equal((await ler(id)).status, "reembolsado");
  });

  test("evento repetido não é processado duas vezes", async () => {
    const id = await novoPedido();
    const primeira = await enviar("checkout.session.completed", sessao(id, { payment_status: "paid" }), "evt_repetido");
    const pagoEm = (await ler(id)).pagoEm?.getTime();
    const segunda = await enviar("checkout.session.completed", sessao(id, { payment_status: "paid" }), "evt_repetido");
    assert.equal(primeira.resultado, "processado");
    assert.equal(segunda.resultado, "repetido");
    assert.equal((await ler(id)).pagoEm?.getTime(), pagoEm);
  });

  test("evento sem pedido ou de outro tipo: 200 sem gravar pedido", async () => {
    assert.equal((await enviar("checkout.session.completed", { id: "cs_x", payment_status: "paid" })).resultado, "sem-pedido");
    assert.equal((await enviar("customer.created", { id: "cus_x" })).resultado, "ignorado");
  });

  test("envio só em pedido pago, com o registro de alterações", async () => {
    const id = await novoPedido();
    assert.match((await marcarEnvioDoPedido(db, id, "enviado", AUTOR)) ?? "", /pago/);
    await enviar("checkout.session.completed", sessao(id, { payment_status: "paid" }));
    assert.equal(await marcarEnvioDoPedido(db, id, "enviado", AUTOR), null);
    assert.equal((await ler(id)).envio.situacao, "enviado");
    assert.equal(await marcarEnvioDoPedido(db, id, "entregue", AUTOR), null);
    assert.equal((await ler(id)).envio.situacao, "entregue");
    const registros = await db.collection(COLECAO_LOG).where("documentoId", "==", id).get();
    assert.equal(registros.size, 2);
    assert.deepEqual(registros.docs[0].get("campos"), ["envio"]);
  });

  test("frete fixo gravado e removido, com o registro", async () => {
    await gravarFreteFixo(db, 2500, AUTOR);
    assert.equal((await db.doc("configuracoes/loja").get()).get("freteFixo"), 2500);
    await gravarFreteFixo(db, null, AUTOR);
    assert.equal((await db.doc("configuracoes/loja").get()).get("freteFixo"), null);
    const registros = await db.collection(COLECAO_LOG).where("documentoId", "==", "loja").get();
    assert.equal(registros.size, 2);
  });

  // ---------- Compra sem conta (08/11/2026) ----------

  test("pedido de visitante: clienteUid null, só o hash do token, pago pelo webhook com nome e contato", async () => {
    const { token, hash } = gerarTokenDoPedido();
    const id = await criarPedido(db, {
      clienteUid: null,
      email: "",
      itens: [{ produtoId: "p1", nome: "TESTE Cartilha", tipo: "fisico", precoUnitario: 3000, quantidade: 2 }],
      subtotal: 6000,
      frete: 0,
      freteCombinado: true,
      total: 6000,
      modo: "teste",
      tokenHash: hash,
      origem: "carrinho",
    });
    const bruto = (await db.collection(COLECAO_PEDIDOS).doc(id).get()).data()!;
    assert.equal(bruto.clienteUid, null);
    assert.equal(bruto.tokenHash, hash);
    assert.ok(!JSON.stringify(bruto).includes(token), "o token não é guardado");
    const resposta = await enviar("checkout.session.completed", sessao(id, { payment_status: "paid", customer_details: { email: "visitante@exemplo.invalid", phone: "+5511900000001", name: "TESTE Visitante" } }));
    assert.equal(resposta.status, 200);
    const pedido = await ler(id);
    assert.equal(pedido.status, "pago");
    assert.equal(pedido.clienteUid, null);
    assert.equal(pedido.email, "visitante@exemplo.invalid");
    assert.equal(pedido.nome, "TESTE Visitante");
    // Página do pedido: token certo abre, errado não, ausente manda entrar.
    assert.equal(decidirAcessoAoPedido({ pedido, clienteUid: null, token }), "ver");
    assert.equal(decidirAcessoAoPedido({ pedido, clienteUid: null, token: gerarTokenDoPedido().token }), "nao-encontrado");
    assert.equal(decidirAcessoAoPedido({ pedido, clienteUid: null, token: undefined }), "entrar");
  });

  test("Comprar agora logado: pago não esvazia o carrinho da conta", async () => {
    await db.doc("carrinhos/cliente-comprar-agora").set({ itens: [{ produtoId: "p2", quantidade: 3 }] });
    const id = await criarPedido(db, {
      clienteUid: "cliente-comprar-agora",
      email: "cliente@exemplo.invalid",
      itens: [{ produtoId: "p1", nome: "TESTE Cartilha", tipo: "fisico", precoUnitario: 3000, quantidade: 1 }],
      subtotal: 3000,
      frete: 0,
      freteCombinado: true,
      total: 3000,
      modo: "teste",
      origem: "comprar-agora",
    });
    await enviar("checkout.session.completed", sessao(id, { payment_status: "paid" }));
    assert.equal((await ler(id)).status, "pago");
    assert.equal((await db.doc("carrinhos/cliente-comprar-agora").get()).get("itens").length, 1);
  });

  test("mesclagem do carrinho de visitante na conta, com os produtos conferidos", async () => {
    await db.doc("carrinhos/cliente-mesclar").set({ itens: [{ produtoId: "p1", quantidade: 9 }] });
    const produtos = new Map<string, ProdutoDoCarrinho>([
      ["p1", { id: "p1", nome: "TESTE p1", slug: "p1", preco: 1000, precoPromocional: null, tipo: "fisico", status: "disponivel", publicado: true, excluido: false }],
      ["p2", { id: "p2", nome: "TESTE p2", slug: "p2", preco: 1000, precoPromocional: null, tipo: "digital", status: "disponivel", publicado: true, excluido: false }],
      ["p3", { id: "p3", nome: "TESTE p3", slug: "p3", preco: 1000, precoPromocional: null, tipo: "fisico", status: "disponivel", publicado: false, excluido: false }],
    ]);
    const itens = await mesclarNoCarrinhoDaConta(db, "cliente-mesclar", [{ produtoId: "p1", quantidade: 4 }, { produtoId: "p2", quantidade: 1 }, { produtoId: "p3", quantidade: 2 }], async () => produtos);
    assert.deepEqual(itens, [{ produtoId: "p1", quantidade: 10 }, { produtoId: "p2", quantidade: 1 }]);
    assert.deepEqual((await db.doc("carrinhos/cliente-mesclar").get()).get("itens"), itens);
  });
});
