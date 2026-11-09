// Caixa de compra da página do produto (08/11/2026, noite): conta do resumo
// (só para exibir) e resumo da descrição sem terminar em ":". Puras.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resumirCompra, rotuloDoSubtotal, TEXTO_FRETE_A_COMBINAR, TEXTO_SEM_FRETE_DIGITAL } from "../../src/lib/loja/resumoDaCompra.ts";
import { formatarPreco, precoAtual, resumoDaDescricao } from "../../src/lib/produtos.ts";

describe("resumo de valores da caixa de compra", () => {
  test("1 e 4 itens, sem promoção, com frete cadastrado", () => {
    const preco = precoAtual({ preco: 3500, precoPromocional: null });
    assert.deepEqual(resumirCompra(preco, 1, "fisico", 2500), { quantidade: 1, subtotal: 3500, frete: 2500, textoDoFrete: null, total: 6000 });
    assert.deepEqual(resumirCompra(preco, 4, "fisico", 2500), { quantidade: 4, subtotal: 14000, frete: 2500, textoDoFrete: null, total: 16500 });
  });

  test("com promoção usa o preço promocional; frete uma vez por pedido", () => {
    const preco = precoAtual({ preco: 4999, precoPromocional: 3999 });
    assert.equal(resumirCompra(preco, 4, "fisico", 1000).total, 3999 * 4 + 1000);
  });

  test("sem frete cadastrado: combinado após a compra, total só com o subtotal", () => {
    const resumo = resumirCompra(45000, 4, "fisico", null);
    assert.equal(resumo.frete, null);
    assert.equal(resumo.textoDoFrete, TEXTO_FRETE_A_COMBINAR);
    assert.equal(resumo.total, 180000);
  });

  test("produto digital: sem frete mesmo com valor cadastrado", () => {
    const resumo = resumirCompra(990, 1, "digital", 2500);
    assert.deepEqual([resumo.frete, resumo.textoDoFrete, resumo.total], [null, TEXTO_SEM_FRETE_DIGITAL, 990]);
  });

  test("rótulos e formato pt-BR", () => {
    assert.equal(rotuloDoSubtotal(1), "Subtotal (1 item)");
    assert.equal(rotuloDoSubtotal(4), "Subtotal (4 itens)");
    assert.match(formatarPreco(16500), /^R\$\s165,00$/);
    assert.equal(resumirCompra(1000, 0, "fisico", null).quantidade, 1, "quantidade inválida vale 1");
  });
});

describe("resumo da descrição", () => {
  test("termina em 'Contém:': entra a lista logo abaixo, até 5 itens curtos", () => {
    const paragrafos = ["Kit de exemplo.", "Contém:", "Item um", "Item dois", "Item três", "Item quatro", "Item cinco", "Item seis", "Fim."];
    const resumo = resumoDaDescricao(paragrafos, 2);
    assert.deepEqual(resumo.paragrafos, ["Kit de exemplo.", "Contém:"]);
    assert.deepEqual(resumo.lista, ["Item um", "Item dois", "Item três", "Item quatro", "Item cinco"]);
    assert.equal(resumo.temMais, true);
  });

  test("lista para no parágrafo longo", () => {
    const resumo = resumoDaDescricao(["Contém:", "Item um", "x".repeat(200)], 1);
    assert.deepEqual(resumo.lista, ["Item um"]);
  });

  test("sem lista abaixo: para no parágrafo anterior", () => {
    const resumo = resumoDaDescricao(["Kit de exemplo.", "Contém:", "y".repeat(300)], 2);
    assert.deepEqual(resumo.paragrafos, ["Kit de exemplo."]);
    assert.deepEqual(resumo.lista, []);
    assert.equal(resumo.temMais, true);
  });

  test("resumo comum fica igual", () => {
    assert.deepEqual(resumoDaDescricao(["Um.", "Dois.", "Três."], 2), { paragrafos: ["Um.", "Dois."], lista: [], temMais: true });
    assert.deepEqual(resumoDaDescricao(["Um."], 2), { paragrafos: ["Um."], lista: [], temMais: false });
  });
});
