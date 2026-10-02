// Testes do gerador de slug dos posts (npm run test:unidade).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { gerarSlug } from "../../src/lib/slug.ts";

describe("Geração de slug", () => {
  test("minúsculas e hífen no lugar dos espaços", () => {
    assert.equal(gerarSlug("Meu Post Legal"), "meu-post-legal");
  });

  test("remove acentos e cedilha", () => {
    assert.equal(gerarSlug("Coração, Atenção e Ação"), "coracao-atencao-e-acao");
    assert.equal(gerarSlug("Escoliose idiopática do adolescente"), "escoliose-idiopatica-do-adolescente");
  });

  test("troca qualquer sequência de símbolos por um único hífen", () => {
    assert.equal(gerarSlug("Pais & filhos: 2ª edição!!"), "pais-filhos-2-edicao");
    assert.equal(gerarSlug("a   --   b"), "a-b");
  });

  test("tira hífens do começo e do fim", () => {
    assert.equal(gerarSlug("  (Novo) post  "), "novo-post");
    assert.equal(gerarSlug("!!!"), "");
  });

  test("mantém números", () => {
    assert.equal(gerarSlug("Mutirão 2024"), "mutirao-2024");
  });

  test("título vazio gera slug vazio", () => {
    assert.equal(gerarSlug(""), "");
  });
});
