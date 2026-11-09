// Carrinho de visitante, mesclagem no login e acesso ao pedido sem conta
// (08/11/2026). Funções puras, sem emulador (npm run test:unidade).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { calcularPedido } from "../../src/lib/loja/pagamento.ts";
import type { ProdutoDoCarrinho } from "../../src/lib/loja/carrinho.ts";
import {
  decidirAcessoAoPedido,
  escreverCarrinhoDoVisitante,
  gerarTokenDoPedido,
  hashDoToken,
  lerCarrinhoDoVisitante,
  mesclarCarrinhos,
  opcoesDoCookieDoVisitante,
  tokenConfere,
} from "../../src/lib/loja/carrinhoVisitante.ts";

const produto = (id: string, extra: Partial<ProdutoDoCarrinho> = {}): ProdutoDoCarrinho => ({
  id,
  nome: `TESTE ${id}`,
  slug: id,
  preco: 3000,
  precoPromocional: null,
  tipo: "fisico",
  status: "disponivel",
  publicado: true,
  excluido: false,
  ...extra,
});

describe("cookie do carrinho de visitante", () => {
  test("só ids e quantidades, ida e volta", () => {
    const itens = [{ produtoId: "abc123", quantidade: 2 }, { produtoId: "def456", quantidade: 1 }];
    const valor = escreverCarrinhoDoVisitante(itens);
    assert.equal(valor, "abc123:2|def456:1");
    assert.deepEqual(lerCarrinhoDoVisitante(valor), itens);
  });

  test("cookie adulterado com preço, JSON ou campos extras é ignorado", () => {
    assert.deepEqual(lerCarrinhoDoVisitante('[{"produtoId":"abc","quantidade":1,"preco":1}]'), []);
    assert.deepEqual(lerCarrinhoDoVisitante("abc:1:1|def:2,preco=1"), []);
    assert.deepEqual(lerCarrinhoDoVisitante("abc:1|xyz:2|preco:0"), [{ produtoId: "abc", quantidade: 1 }, { produtoId: "xyz", quantidade: 2 }]);
  });

  test("quantidade fora de 1 a 10, id inválido, repetido ou reservado é ignorado", () => {
    assert.deepEqual(lerCarrinhoDoVisitante("a:0|b:11|c:99|../x:1|__x__:1|d:3|d:5"), [{ produtoId: "d", quantidade: 3 }]);
    assert.deepEqual(lerCarrinhoDoVisitante(undefined), []);
    assert.deepEqual(lerCarrinhoDoVisitante("x".repeat(2000)), []);
  });

  test("no máximo 20 produtos diferentes", () => {
    const valor = Array.from({ length: 30 }, (_, i) => `p${i}:1`).join("|");
    assert.equal(lerCarrinhoDoVisitante(valor).length, 20);
  });

  test("o preço vem sempre do produto: cookie com quantidade não muda o preço", () => {
    const itens = lerCarrinhoDoVisitante("p1:2");
    const calculo = calcularPedido(itens, new Map([["p1", produto("p1", { preco: 4500 })]]), null);
    assert.ok(calculo.ok);
    if (calculo.ok) assert.equal(calculo.total, 9000);
  });

  test("produto inválido no cookie não entra no pedido", () => {
    const itens = lerCarrinhoDoVisitante("inexistente:1");
    const calculo = calcularPedido(itens, new Map(), null);
    assert.equal(calculo.ok, false);
    const despublicado = calcularPedido(lerCarrinhoDoVisitante("p1:1"), new Map([["p1", produto("p1", { publicado: false })]]), null);
    assert.equal(despublicado.ok, false);
  });

  test("opções do cookie: httpOnly, lax, /loja, 30 dias, secure só em produção", () => {
    assert.deepEqual(opcoesDoCookieDoVisitante(true), { httpOnly: true, secure: true, sameSite: "lax", path: "/loja", maxAge: 2592000 });
    assert.equal(opcoesDoCookieDoVisitante(false).secure, false);
  });
});

describe("mesclagem do carrinho no login", () => {
  const produtos = new Map([
    ["p1", produto("p1")],
    ["p2", produto("p2", { tipo: "digital" })],
    ["p3", produto("p3", { status: "esgotado" })],
    ["p4", produto("p4", { excluido: true })],
  ]);

  test("soma quantidades, respeita o máximo e ignora o que saiu da loja", () => {
    const resultado = mesclarCarrinhos(
      [{ produtoId: "p1", quantidade: 8 }, { produtoId: "p2", quantidade: 1 }],
      [{ produtoId: "p1", quantidade: 5 }, { produtoId: "p2", quantidade: 1 }, { produtoId: "p3", quantidade: 1 }, { produtoId: "p4", quantidade: 1 }, { produtoId: "p9", quantidade: 1 }],
      produtos,
    );
    assert.deepEqual(resultado, [{ produtoId: "p1", quantidade: 10 }, { produtoId: "p2", quantidade: 1 }]);
  });

  test("carrinho da conta vazio recebe o do visitante", () => {
    assert.deepEqual(mesclarCarrinhos([], [{ produtoId: "p1", quantidade: 2 }], produtos), [{ produtoId: "p1", quantidade: 2 }]);
  });
});

describe("acesso à página do pedido", () => {
  const { token, hash } = gerarTokenDoPedido();
  const deVisitante = { clienteUid: null, tokenHash: hash };
  const daConta = { clienteUid: "uid-1", tokenHash: hash };

  test("token forte e só o hash guardado", () => {
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(hash, hashDoToken(token));
    assert.notEqual(hash, token);
    assert.notEqual(gerarTokenDoPedido().token, token);
  });

  test("token certo abre; errado ou ausente não", () => {
    assert.equal(decidirAcessoAoPedido({ pedido: deVisitante, clienteUid: null, token }), "ver");
    assert.equal(decidirAcessoAoPedido({ pedido: deVisitante, clienteUid: null, token: gerarTokenDoPedido().token }), "nao-encontrado");
    assert.equal(decidirAcessoAoPedido({ pedido: deVisitante, clienteUid: null, token: "curto" }), "nao-encontrado");
    assert.equal(decidirAcessoAoPedido({ pedido: deVisitante, clienteUid: null, token: undefined }), "entrar");
    assert.equal(decidirAcessoAoPedido({ pedido: deVisitante, clienteUid: "uid-2", token: undefined }), "nao-encontrado");
    assert.equal(decidirAcessoAoPedido({ pedido: null, clienteUid: null, token }), "nao-encontrado");
  });

  test("dono logado abre sem token; outro cliente não", () => {
    assert.equal(decidirAcessoAoPedido({ pedido: daConta, clienteUid: "uid-1", token: undefined }), "ver");
    assert.equal(decidirAcessoAoPedido({ pedido: daConta, clienteUid: "uid-2", token: undefined }), "nao-encontrado");
    assert.equal(decidirAcessoAoPedido({ pedido: daConta, clienteUid: null, token }), "ver");
  });

  test("pedido sem hash (antigo) não abre por token", () => {
    assert.equal(tokenConfere(token, null), false);
    assert.equal(decidirAcessoAoPedido({ pedido: { clienteUid: "uid-1", tokenHash: null }, clienteUid: null, token }), "nao-encontrado");
  });
});
