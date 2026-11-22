// Cupons de desconto da loja (21/11/2026): regras puras e cálculo do pedido.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ProdutoDoCarrinho } from "../../src/lib/loja/carrinho.ts";
import { calcularDesconto, codigoValido, lerCupom, lerPercentual, normalizarCodigo, validarCupom } from "../../src/lib/loja/cupons.ts";
import { calcularPedido } from "../../src/lib/loja/pagamento.ts";

const produto = (id: string, preco: number): ProdutoDoCarrinho =>
  ({ id, nome: `Produto ${id}`, slug: id, preco, precoPromocional: null, tipo: "fisico", status: "disponivel", publicado: true, excluido: false }) as unknown as ProdutoDoCarrinho;

function formulario(campos: Record<string, string>) {
  const dados = new FormData();
  for (const [campo, valor] of Object.entries(campos)) dados.append(campo, valor);
  return dados;
}

describe("Cupons", () => {
  test("código em maiúsculas, só letras sem acento, números, hífen e sublinhado", () => {
    assert.equal(normalizarCodigo("  abte10 "), "ABTE10");
    assert.equal(codigoValido("ABTE10"), true);
    assert.equal(codigoValido("ABTE-10_X"), true);
    assert.equal(codigoValido("AB"), false);
    assert.equal(codigoValido("ÇUPOM"), false);
    assert.equal(codigoValido("ABTE 10"), false);
    assert.equal(codigoValido("A/B"), false);
    assert.equal(codigoValido("X".repeat(21)), false);
  });

  test("percentual inteiro de 1 a 99", () => {
    assert.equal(lerPercentual("10"), 10);
    assert.equal(lerPercentual(" 15% "), 15);
    assert.equal(lerPercentual("0"), null);
    assert.equal(lerPercentual("100"), null);
    assert.equal(lerPercentual("10,5"), null);
    assert.equal(lerPercentual("abc"), null);
  });

  test("formulário do painel", () => {
    const ok = validarCupom(formulario({ codigo: "natal", percentual: "20", ativo: "sim" }));
    assert.deepEqual(ok, { ok: true, codigo: "NATAL", percentual: 20, ativo: true });
    const ruim = validarCupom(formulario({ codigo: "x", percentual: "200" }));
    assert.equal(ruim.ok, false);
    if (!ruim.ok) assert.ok(ruim.erros.codigo && ruim.erros.percentual);
  });

  test("leitura tolerante do documento", () => {
    assert.deepEqual(lerCupom("A10", { percentual: 10, ativo: true, usos: 3 }), { codigo: "A10", percentual: 10, ativo: true, usos: 3 });
    assert.equal(lerCupom("A10", { percentual: 150, ativo: true }), null);
    assert.equal(lerCupom("A10", undefined), null);
    assert.equal(lerCupom("A10", { percentual: 10 })?.ativo, false);
  });

  test("desconto arredondado para baixo e nunca zera os produtos", () => {
    assert.equal(calcularDesconto(10000, 10), 1000);
    assert.equal(calcularDesconto(999, 15), 149);
    assert.equal(calcularDesconto(1, 99), 0);
    assert.equal(calcularDesconto(1000, 0), 0);
  });

  test("pedido com cupom: desconto só nos produtos, frete inteiro", () => {
    const calculo = calcularPedido([{ produtoId: "a", quantidade: 2 }], new Map([["a", produto("a", 5000)]]), 2500, { codigo: "ABTE10", percentual: 10 });
    assert.equal(calculo.ok, true);
    if (!calculo.ok) return;
    assert.equal(calculo.subtotal, 10000);
    assert.equal(calculo.desconto, 1000);
    assert.equal(calculo.frete, 2500);
    assert.equal(calculo.total, 11500);
    assert.deepEqual(calculo.cupom, { codigo: "ABTE10", percentual: 10 });
  });

  test("pedido sem cupom continua igual", () => {
    const calculo = calcularPedido([{ produtoId: "a", quantidade: 1 }], new Map([["a", produto("a", 5000)]]), 2500);
    assert.ok(calculo.ok);
    if (!calculo.ok) return;
    assert.equal(calculo.desconto, 0);
    assert.equal(calculo.cupom, null);
    assert.equal(calculo.total, 7500);
  });
});
