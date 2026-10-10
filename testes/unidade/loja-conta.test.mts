// Testes do cadastro de cliente e do destino depois do login da loja (npm run test:unidade).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DESTINO_PADRAO_DA_LOJA, destinoSeguroNaLoja } from "../../src/lib/auth/destino.ts";
import { validarCadastroDeCliente } from "../../src/lib/loja/cadastro.ts";

describe("Destino depois do login da loja", () => {
  test("aceita caminhos da loja", () => {
    for (const caminho of ["/loja", "/loja/carrinho", "/loja/produto/teste?x=1", "/loja?categoria=a"]) {
      assert.equal(destinoSeguroNaLoja(caminho), caminho);
    }
  });

  test("recusa outro site, outra área e truques de endereço", () => {
    for (const caminho of ["https://exemplo.invalid", "//exemplo.invalid", "/admin", "/lojafalsa", "/loja//exemplo.invalid", "/loja\\..\\admin", "/loja/entrar", "/loja/cadastro?voltar=/admin", undefined, 42]) {
      assert.equal(destinoSeguroNaLoja(caminho), DESTINO_PADRAO_DA_LOJA, String(caminho));
    }
  });
});

function formulario(campos: Record<string, string>) {
  const dados = new FormData();
  for (const [campo, valor] of Object.entries(campos)) dados.set(campo, valor);
  return dados;
}
const BASE = { nome: " TESTE Cliente ", email: " TESTE@Exemplo.Invalid ", senha: "senha-de-teste", confirmacao: "senha-de-teste", consentimento: "sim" };

describe("Cadastro de cliente", () => {
  test("dados mínimos, e-mail em minúsculas", () => {
    const resultado = validarCadastroDeCliente(formulario(BASE));
    assert.deepEqual(resultado, { ok: true, dados: { nome: "TESTE Cliente", email: "teste@exemplo.invalid", senha: "senha-de-teste" } });
  });

  test("exige consentimento, senha mínima e confirmação igual", () => {
    const resultado = validarCadastroDeCliente(formulario({ ...BASE, consentimento: "", senha: "curta", confirmacao: "outra" }));
    assert.equal(resultado.ok, false);
    if (resultado.ok) return;
    assert.ok(resultado.erros.consentimento && resultado.erros.senha && resultado.erros.confirmacao);
  });

  test("campo escondido preenchido indica robô", () => {
    const resultado = validarCadastroDeCliente(formulario({ ...BASE, site: "https://spam.invalid" }));
    assert.equal(resultado.ok, false);
    if (!resultado.ok) assert.equal(resultado.robo, true);
  });

  test("e-mail inválido e nome vazio", () => {
    const resultado = validarCadastroDeCliente(formulario({ ...BASE, nome: "  ", email: "sem-arroba" }));
    assert.equal(resultado.ok, false);
    if (!resultado.ok) assert.ok(resultado.erros.nome && resultado.erros.email);
  });
});
