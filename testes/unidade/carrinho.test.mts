// Testes das regras do carrinho (npm run test:unidade). Produtos e preços de exemplo, marcados como TESTE.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ITENS_MAXIMOS,
  adicionarItem,
  definirQuantidade,
  lerItensGuardados,
  lerQuantidade,
  montarResumoDoCarrinho,
  type ProdutoDoCarrinho,
} from "../../src/lib/loja/carrinho.ts";

const produto = (dados: Partial<ProdutoDoCarrinho> & { id: string }): ProdutoDoCarrinho => ({
  nome: `TESTE ${dados.id}`, slug: `teste-${dados.id}`, preco: 3000, precoPromocional: null, tipo: "fisico", status: "disponivel", publicado: true, excluido: false, ...dados,
});

describe("Resumo do carrinho", () => {
  test("usa o preço atual do servidor (promoção) e soma só o que está disponível", () => {
    const produtos = new Map([
      ["a", produto({ id: "a", precoPromocional: 2500 })],
      ["b", produto({ id: "b", status: "esgotado" })],
      ["c", produto({ id: "c", publicado: false })],
      ["d", produto({ id: "d", excluido: true })],
    ]);
    const resumo = montarResumoDoCarrinho(
      [{ produtoId: "a", quantidade: 2 }, { produtoId: "b", quantidade: 1 }, { produtoId: "c", quantidade: 1 }, { produtoId: "d", quantidade: 1 }, { produtoId: "removido", quantidade: 1 }],
      produtos,
    );
    assert.equal(resumo.total, 5000);
    assert.equal(resumo.unidades, 2);
    assert.equal(resumo.temProblema, true);
    assert.deepEqual(resumo.linhas.map((linha) => linha.situacao), ["ok", "esgotado", "indisponivel", "indisponivel", "indisponivel"]);
    assert.equal(resumo.linhas[1].subtotal, 0);
    assert.equal(resumo.linhas[4].nome, "Produto fora da loja");
    assert.equal(resumo.linhas[2].precoUnitario, null, "despublicado não mostra preço");
  });

  test("produto que virou digital fica com uma unidade", () => {
    const resumo = montarResumoDoCarrinho([{ produtoId: "a", quantidade: 5 }], new Map([["a", produto({ id: "a", tipo: "digital" })]]));
    assert.equal(resumo.linhas[0].quantidade, 1);
    assert.equal(resumo.total, 3000);
  });
});

describe("Alterações do carrinho", () => {
  test("adiciona e soma até o limite do produto", () => {
    const a = produto({ id: "a" });
    let resultado = adicionarItem([], a, 3);
    assert.ok(resultado.ok);
    if (!resultado.ok) return;
    resultado = adicionarItem(resultado.itens, a, 7);
    assert.deepEqual(resultado.ok && resultado.itens, [{ produtoId: "a", quantidade: 10 }]);
    if (!resultado.ok) return;
    assert.match((adicionarItem(resultado.itens, a, 1) as { erro: string }).erro, /até 10 unidades/);
  });

  test("recusa esgotado, fora da loja, quantidade zero e digital repetido", () => {
    assert.match((adicionarItem([], produto({ id: "e", status: "esgotado" }), 1) as { erro: string }).erro, /esgotado/);
    assert.match((adicionarItem([], produto({ id: "p", publicado: false }), 1) as { erro: string }).erro, /não está mais na loja/);
    assert.match((adicionarItem([], produto({ id: "a" }), 0) as { erro: string }).erro, /pelo menos uma/);
    const digital = produto({ id: "d", tipo: "digital" });
    const primeiro = adicionarItem([], digital, 1);
    assert.ok(primeiro.ok);
    if (primeiro.ok) assert.match((adicionarItem(primeiro.itens, digital, 1) as { erro: string }).erro, /já está no carrinho/);
  });

  test("limite de produtos diferentes", () => {
    const cheio = Array.from({ length: ITENS_MAXIMOS }, (_, i) => ({ produtoId: `p${i}`, quantidade: 1 }));
    assert.match((adicionarItem(cheio, produto({ id: "novo" }), 1) as { erro: string }).erro, /até 20 produtos/);
  });

  test("troca quantidade, remove com zero e só deixa remover o que está indisponível", () => {
    const itens = [{ produtoId: "a", quantidade: 2 }];
    assert.deepEqual(definirQuantidade(itens, "a", 4, produto({ id: "a" })), { ok: true, itens: [{ produtoId: "a", quantidade: 4 }] });
    assert.deepEqual(definirQuantidade(itens, "a", 0, undefined), { ok: true, itens: [] });
    assert.equal(definirQuantidade(itens, "a", 3, produto({ id: "a", status: "esgotado" })).ok, false);
    assert.equal(definirQuantidade(itens, "x", 1, produto({ id: "x" })).ok, false);
    assert.equal(definirQuantidade(itens, "a", 2, produto({ id: "a", tipo: "digital" })).ok, false);
  });
});

describe("Leitura de dados do navegador e do banco", () => {
  test("quantidade só inteira de 0 a 10", () => {
    assert.equal(lerQuantidade("3"), 3);
    assert.equal(lerQuantidade(" 0 "), 0);
    for (const valor of ["11", "-1", "1.5", "abc", "", null, 2]) assert.equal(lerQuantidade(valor), null, String(valor));
  });

  test("itens guardados inválidos são descartados", () => {
    assert.deepEqual(lerItensGuardados([{ produtoId: "a", quantidade: 1 }, { produtoId: 1, quantidade: 1 }, { produtoId: "b", quantidade: 0 }, { produtoId: "c", quantidade: 1.5 }, "x"]), [{ produtoId: "a", quantidade: 1 }]);
    assert.deepEqual(lerItensGuardados(undefined), []);
  });
});
