// Regras da visão geral do painel (etapa 3, 04/11/2026).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { contarLixeira, contarSituacoes, rotuloDaColecaoNoRegistro } from "../../src/lib/painel/visaoGeral.ts";

describe("Visão geral do painel", () => {
  test("conta publicados, rascunhos e lixeira pela situação de cada coleção", () => {
    const posts = [{ status: "publicado" }, { status: "rascunho" }, { status: "rascunho", excluidoEm: new Date() }, { status: "publicado", excluidoEm: null }];
    assert.deepEqual(contarSituacoes("posts", posts), { publicados: 2, rascunhos: 1, lixeira: 1 });
    assert.deepEqual(contarSituacoes("profissionais", [{ ativo: true }, { ativo: false }, { ativo: true, excluidoEm: new Date() }]), { publicados: 1, rascunhos: 1, lixeira: 1 });
    assert.deepEqual(contarSituacoes("produtos", []), { publicados: 0, rascunhos: 0, lixeira: 0 });
    assert.equal(contarLixeira([{ excluidoEm: new Date() }, { excluidoEm: null }, {}]), 1);
  });

  test("nome da coleção nas últimas alterações", () => {
    assert.equal(rotuloDaColecaoNoRegistro("posts"), "Blog");
    assert.equal(rotuloDaColecaoNoRegistro("configuracoes"), "Home e configurações");
    assert.equal(rotuloDaColecaoNoRegistro("__proto__"), "Outro");
    assert.equal(rotuloDaColecaoNoRegistro(undefined), "Outro");
  });
});
