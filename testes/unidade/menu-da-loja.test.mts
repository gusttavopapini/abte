import assert from "node:assert/strict";
import { test } from "node:test";
import { opcoesDoMenuDaLoja } from "../../src/lib/loja/menu.ts";

const atual = (caminho: string, logado = false) => opcoesDoMenuDaLoja(caminho, { logado, unidades: 0 }).filter((o) => o.atual).map((o) => o.chave);

test("ordem e destinos: Produtos, Carrinho e Entrar ou Minha conta", () => {
  assert.deepEqual(opcoesDoMenuDaLoja("/loja", { logado: false, unidades: 0 }).map((o) => [o.rotulo, o.href]), [["Produtos", "/loja"], ["Carrinho", "/loja/carrinho"], ["Entrar", "/loja/entrar"]]);
  assert.deepEqual(opcoesDoMenuDaLoja("/loja", { logado: true, unidades: 3 }).map((o) => [o.rotulo, o.href]), [["Produtos", "/loja"], ["Carrinho (3)", "/loja/carrinho"], ["Minha conta", "/loja/conta"]]);
});

test("a opção da página atual fica marcada, inclusive nas rotas filhas", () => {
  assert.deepEqual(atual("/loja"), ["produtos"]);
  assert.deepEqual(atual("/loja/produto/kit"), ["produtos"]);
  assert.deepEqual(atual("/loja/carrinho"), ["carrinho"]);
  assert.deepEqual(atual("/loja/entrar/recuperar-senha"), ["entrar"]);
  assert.deepEqual(atual("/loja/cadastro"), ["entrar"]);
  assert.deepEqual(atual("/loja/conta", true), ["conta"]);
  assert.deepEqual(atual("/lojas"), []);
  assert.deepEqual(atual("/loja/produtos-falsos"), []);
});
