// Testes das regras dos produtos da loja (npm run test:unidade).
// Preços e nomes abaixo são de exemplo, marcados como TESTE.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { escolherRelacionados, formatarPreco, lerPrecoEmCentavos, precoAtual, precoParaCampo, validarProduto } from "../../src/lib/produtos.ts";

describe("Preço digitado", () => {
  test("formatos brasileiros viram centavos", () => {
    const casos: [string, number][] = [["25", 2500], ["25,9", 2590], ["25,90", 2590], ["1.250,00", 125000], ["R$ 1.250,5", 125050], ["25.90", 2590], ["1.25", 125], ["0,01", 1]];
    for (const [entrada, esperado] of casos) assert.equal(lerPrecoEmCentavos(entrada), esperado, entrada);
  });

  test("vazio é undefined e formato estranho é null", () => {
    assert.equal(lerPrecoEmCentavos("  "), undefined);
    for (const entrada of ["25,999", "1,250.00", "abc", "-5", "12,3,4", "1.2345"]) assert.equal(lerPrecoEmCentavos(entrada), null, entrada);
  });

  test("formatação para a tela e para o campo", () => {
    assert.equal(formatarPreco(125050).replace(/\s/g, " "), "R$ 1.250,50");
    assert.equal(precoParaCampo(2590), "25,90");
    assert.equal(precoParaCampo(null), "");
    assert.equal(precoAtual({ preco: 3000, precoPromocional: 2500 }), 2500);
    assert.equal(precoAtual({ preco: 3000, precoPromocional: null }), 3000);
  });
});

function formulario(campos: Record<string, string>) {
  const dados = new FormData();
  for (const [campo, valor] of Object.entries(campos)) dados.set(campo, valor);
  return dados;
}
const BASE = { nome: "TESTE Produto", preco: "30,00", categoria: "cat1", tipo: "fisico", status: "disponivel", publicado: "sim" };

describe("Cadastro de produto", () => {
  test("dados válidos", () => {
    const resultado = validarProduto(formulario({ ...BASE, precoPromocional: "25", selo: "TESTE selo", ordem: "2" }));
    assert.equal(resultado.ok, true);
    if (!resultado.ok) return;
    assert.equal(resultado.dados.preco, 3000);
    assert.equal(resultado.dados.precoPromocional, 2500);
    assert.equal(resultado.dados.publicado, true);
    assert.equal(resultado.dados.ordem, 2);
  });

  test("promocional precisa ser menor que o preço normal", () => {
    for (const promocional of ["30,00", "35", "0"]) {
      const resultado = validarProduto(formulario({ ...BASE, precoPromocional: promocional }));
      assert.equal(resultado.ok, false, promocional);
      if (!resultado.ok) assert.match(resultado.erros.precoPromocional ?? "", /menor que o preço normal/);
    }
  });

  test("exige nome, preço, categoria, tipo e status válidos", () => {
    const resultado = validarProduto(formulario({ nome: "", preco: "", categoria: "a/b", tipo: "x", status: "y" }));
    assert.equal(resultado.ok, false);
    if (resultado.ok) return;
    assert.ok(resultado.erros.nome && resultado.erros.preco && resultado.erros.categoria && resultado.erros.tipo && resultado.erros.status);
  });

  test("preço zero ou acima do máximo é recusado", () => {
    for (const preco of ["0", "100.000,01"]) assert.equal(validarProduto(formulario({ ...BASE, preco })).ok, false, preco);
    assert.equal(validarProduto(formulario({ ...BASE, preco: "100.000,00" })).ok, true);
  });

  test("sem a caixa marcada, não é publicado", () => {
    const resultado = validarProduto(formulario({ ...BASE, publicado: "" }));
    assert.ok(resultado.ok && resultado.dados.publicado === false);
  });
});

describe("Produtos relacionados", () => {
  const lista = [
    { id: "a", categoria: "1" }, { id: "b", categoria: "2" }, { id: "c", categoria: "1" },
    { id: "d", categoria: "1" }, { id: "e", categoria: "1" },
  ];
  test("mesma categoria, sem o próprio, na ordem da lista, até 3", () => {
    assert.deepEqual(escolherRelacionados(lista[0], lista).map((p) => p.id), ["c", "d", "e"]);
    assert.deepEqual(escolherRelacionados(lista[1], lista), []);
    assert.deepEqual(escolherRelacionados(lista[2], lista, 2).map((p) => p.id), ["a", "d"]);
  });
});
