// Testes das regras puras do pagamento da loja (08/11/2026, npm run
// test:unidade). Produtos e valores fictícios, marcados como TESTE.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import Stripe from "stripe";
import { papelPodeExecutar } from "../../src/lib/auth/papeis.ts";
import type { ProdutoDoCarrinho } from "../../src/lib/loja/carrinho.ts";
import { calcularPedido, liberacaoDoPagamento, lerFreteFixo, modoDaChave, podeMudarStatus, statusPeloEvento, textoDoPedido } from "../../src/lib/loja/pagamento.ts";
import { processarWebhook } from "../../src/lib/loja/webhook.ts";

const produto = (id: string, extra: Partial<ProdutoDoCarrinho> = {}): ProdutoDoCarrinho => ({
  id,
  nome: `TESTE ${id}`,
  slug: id,
  preco: 5000,
  precoPromocional: null,
  tipo: "fisico",
  status: "disponivel",
  publicado: true,
  excluido: false,
  ...extra,
});
const mapa = (...lista: ProdutoDoCarrinho[]) => new Map(lista.map((item) => [item.id, item]));

describe("Liga e desliga do pagamento", () => {
  test("modo pela chave", () => {
    assert.equal(modoDaChave("sk_test_abc"), "teste");
    assert.equal(modoDaChave("rk_test_abc"), "teste");
    assert.equal(modoDaChave("sk_live_abc"), "producao");
    assert.equal(modoDaChave(""), "ausente");
    assert.equal(modoDaChave(undefined), "ausente");
    assert.equal(modoDaChave("pk_test_abc"), "ausente");
  });

  test("desligado sem PAGAMENTO_HABILITADO=sim; sem chave não libera", () => {
    assert.deepEqual(liberacaoDoPagamento({ STRIPE_SECRET_KEY: "sk_test_x" }), { ok: false, motivo: "desligado" });
    assert.deepEqual(liberacaoDoPagamento({ PAGAMENTO_HABILITADO: "sim" }), { ok: false, motivo: "sem-chave" });
    assert.deepEqual(liberacaoDoPagamento({ PAGAMENTO_HABILITADO: "sim", STRIPE_SECRET_KEY: "sk_test_x" }), { ok: true, modo: "teste" });
  });

  test("chave de produção só com a confirmação", () => {
    assert.deepEqual(liberacaoDoPagamento({ PAGAMENTO_HABILITADO: "sim", STRIPE_SECRET_KEY: "sk_live_x" }), { ok: false, motivo: "producao-nao-confirmada" });
    assert.deepEqual(liberacaoDoPagamento({ PAGAMENTO_HABILITADO: "sim", STRIPE_SECRET_KEY: "sk_live_x", PAGAMENTO_PRODUCAO_CONFIRMADO: "sim" }), { ok: true, modo: "producao" });
  });
});

describe("Cálculo do pedido em centavos", () => {
  test("preço do servidor (promocional quando houver), subtotal, frete e total", () => {
    const calculo = calcularPedido(
      [{ produtoId: "a", quantidade: 2 }, { produtoId: "b", quantidade: 1 }],
      mapa(produto("a", { preco: 4999, precoPromocional: 3999 }), produto("b", { preco: 1990 })),
      2500,
    );
    assert.equal(calculo.ok, true);
    if (!calculo.ok) return;
    assert.deepEqual(calculo.itens.map((item) => [item.produtoId, item.precoUnitario, item.quantidade]), [["a", 3999, 2], ["b", 1990, 1]]);
    assert.equal(calculo.subtotal, 3999 * 2 + 1990);
    assert.equal(calculo.frete, 2500);
    assert.equal(calculo.total, 3999 * 2 + 1990 + 2500);
    assert.equal(calculo.freteCombinado, false);
  });

  test("frete só com produto físico", () => {
    const calculo = calcularPedido([{ produtoId: "d", quantidade: 1 }], mapa(produto("d", { tipo: "digital", preco: 990 })), 2500);
    assert.ok(calculo.ok);
    if (!calculo.ok) return;
    assert.equal(calculo.frete, 0);
    assert.equal(calculo.total, 990);
    assert.equal(calculo.temFisico, false);
    assert.equal(calculo.freteCombinado, false);
  });

  test("sem frete cadastrado: frete 0 e combinado pela ABTE", () => {
    const calculo = calcularPedido([{ produtoId: "a", quantidade: 1 }], mapa(produto("a")), null);
    assert.ok(calculo.ok);
    if (!calculo.ok) return;
    assert.equal(calculo.frete, 0);
    assert.equal(calculo.total, 5000);
    assert.equal(calculo.freteCombinado, true);
  });

  test("recusa carrinho vazio e produto fora da loja, despublicado, na lixeira ou esgotado", () => {
    assert.deepEqual(calcularPedido([], mapa(), 0), { ok: false, erro: "Seu carrinho está vazio." });
    for (const extra of [{ publicado: false }, { excluido: true }]) {
      const calculo = calcularPedido([{ produtoId: "a", quantidade: 1 }], mapa(produto("a", extra)), 0);
      assert.equal(calculo.ok, false);
    }
    assert.equal(calcularPedido([{ produtoId: "x", quantidade: 1 }], mapa(), 0).ok, false);
    const esgotado = calcularPedido([{ produtoId: "a", quantidade: 1 }], mapa(produto("a", { status: "esgotado" })), 0);
    assert.ok(!esgotado.ok && /esgotado/.test(esgotado.erro));
  });

  test("produto digital: no máximo uma unidade", () => {
    const calculo = calcularPedido([{ produtoId: "d", quantidade: 3 }], mapa(produto("d", { tipo: "digital" })), null);
    assert.ok(calculo.ok && calculo.itens[0].quantidade === 1);
  });

  test("frete gravado: só inteiro não negativo", () => {
    assert.equal(lerFreteFixo(2500), 2500);
    assert.equal(lerFreteFixo(0), 0);
    for (const valor of [undefined, null, -1, 10.5, "2500"]) assert.equal(lerFreteFixo(valor), null);
  });
});

describe("Situação pelo evento da Stripe", () => {
  test("cada evento muda para a situação certa", () => {
    assert.equal(statusPeloEvento("checkout.session.completed", "paid"), "pago");
    assert.equal(statusPeloEvento("checkout.session.completed", "unpaid"), "aguardando_pagamento");
    assert.equal(statusPeloEvento("checkout.session.async_payment_succeeded"), "pago");
    assert.equal(statusPeloEvento("checkout.session.async_payment_failed"), "falhou");
    assert.equal(statusPeloEvento("checkout.session.expired"), "expirado");
    assert.equal(statusPeloEvento("charge.refunded"), "reembolsado");
    assert.equal(statusPeloEvento("customer.created"), null);
  });

  test("evento atrasado não desfaz pago nem reembolsado", () => {
    assert.equal(podeMudarStatus("pago", "aguardando_pagamento"), false);
    assert.equal(podeMudarStatus("pago", "expirado"), false);
    assert.equal(podeMudarStatus("pago", "reembolsado"), true);
    assert.equal(podeMudarStatus("reembolsado", "pago"), false);
    assert.equal(podeMudarStatus("aguardando_pagamento", "pago"), true);
    assert.equal(podeMudarStatus("aguardando_pagamento", "reembolsado"), false);
  });

  test("textos do pedido em português", () => {
    assert.match(textoDoPedido("aguardando_pagamento", "pix"), /Pix/);
    assert.match(textoDoPedido("aguardando_pagamento", "boleto"), /boleto/);
    assert.match(textoDoPedido("pago", "card"), /confirmado/);
  });
});

describe("Webhook: assinatura", () => {
  const stripe = new Stripe("sk_test_TESTE");
  const corpo = JSON.stringify({ id: "evt_teste", type: "checkout.session.expired", data: { object: {} } });
  const semBanco = {} as never;

  test("sem assinatura, assinatura inválida ou de outro segredo: 400, nada processado", async () => {
    assert.equal((await processarWebhook({ corpo, assinatura: null, segredo: "whsec_teste", stripe, db: semBanco })).status, 400);
    assert.equal((await processarWebhook({ corpo, assinatura: "t=1,v1=abc", segredo: "whsec_teste", stripe, db: semBanco })).status, 400);
    const deOutro = stripe.webhooks.generateTestHeaderString({ payload: corpo, secret: "whsec_outro" });
    assert.equal((await processarWebhook({ corpo, assinatura: deOutro, segredo: "whsec_teste", stripe, db: semBanco })).status, 400);
    const certo = stripe.webhooks.generateTestHeaderString({ payload: corpo, secret: "whsec_teste" });
    assert.equal((await processarWebhook({ corpo: corpo.replace("expired", "completed"), assinatura: certo, segredo: "whsec_teste", stripe, db: semBanco })).status, 400);
  });

  test("sem segredo configurado: 500", async () => {
    assert.equal((await processarWebhook({ corpo, assinatura: "x", segredo: undefined, stripe, db: semBanco })).status, 500);
  });
});

describe("Pedidos e frete só para o administrador", () => {
  test("tabela de permissões", () => {
    for (const acao of ["pedidos.ver", "pedidos.editar", "loja.configurar"] as const) {
      assert.equal(papelPodeExecutar("administrador", acao), true, acao);
      assert.equal(papelPodeExecutar("editor", acao), false, acao);
    }
  });

  test("páginas e ações começam pela checagem do papel", () => {
    const conferir = (arquivo: string, acoes: string[]) => {
      const codigo = readFileSync(arquivo, "utf8");
      for (const acao of acoes) assert.ok(codigo.includes(`exigirPapelDoPainel("${acao}")`), `${arquivo}: ${acao}`);
    };
    conferir("src/app/admin/(painel)/pedidos/page.tsx", ["pedidos.ver"]);
    conferir("src/app/admin/(painel)/pedidos/[id]/page.tsx", ["pedidos.ver"]);
    conferir("src/app/admin/(painel)/loja/frete/page.tsx", ["loja.configurar"]);
    conferir("src/app/admin/acoes-pedidos.ts", ["pedidos.editar", "loja.configurar"]);
  });

  test("Stripe só em arquivo de servidor", () => {
    const servidor = readFileSync("src/lib/stripe/servidor.ts", "utf8");
    assert.ok(servidor.includes('import "server-only"'));
  });
});
