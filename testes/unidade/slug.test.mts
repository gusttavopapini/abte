// Testes do gerador de slug dos posts (npm run test:unidade).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { escolherSlugUnico, gerarSlug } from "../../src/lib/slug.ts";

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

describe("Slug único", () => {
  test("usa o próprio slug quando está livre", () => {
    assert.equal(escolherSlugUnico("coletes", new Set(["cirurgia"])), "coletes");
  });

  test("acrescenta -2, -3... quando já está em uso", () => {
    assert.equal(escolherSlugUnico("coletes", new Set(["coletes"])), "coletes-2");
    assert.equal(escolherSlugUnico("coletes", new Set(["coletes", "coletes-2", "coletes-3"])), "coletes-4");
  });

  test("um número livre no meio da sequência é reaproveitado", () => {
    assert.equal(escolherSlugUnico("coletes", new Set(["coletes", "coletes-3"])), "coletes-2");
  });
});
