// Testes das validações usadas pelas ações do painel (npm run test:unidade).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ehIdDeDocumentoValido, lerTextoDoFormulario } from "../../src/lib/validacao.ts";

describe("Id de documento do Firestore", () => {
  test("aceita ids comuns", () => {
    for (const id of ["abc123", "Xy9_-", "a", "a".repeat(1500)]) {
      assert.equal(ehIdDeDocumentoValido(id), true, id);
    }
  });

  test("recusa o que não é texto ou está vazio", () => {
    for (const id of [undefined, null, 1, {}, [], ""]) {
      assert.equal(ehIdDeDocumentoValido(id), false, String(id));
    }
  });

  test("recusa barra, ponto, dois pontos e formato reservado", () => {
    for (const id of ["a/b", ".", "..", "__reservado__"]) {
      assert.equal(ehIdDeDocumentoValido(id), false, id);
    }
  });

  test("recusa id acima de 1.500 bytes", () => {
    assert.equal(ehIdDeDocumentoValido("a".repeat(1501)), false);
    // "é" ocupa 2 bytes: 751 caracteres passam do limite.
    assert.equal(ehIdDeDocumentoValido("é".repeat(751)), false);
  });
});

describe("Leitura de campo do formulário", () => {
  const opcoes = { rotulo: "Título", limite: 5 };

  test("devolve o texto como veio, sem cortar espaços", () => {
    const dados = new FormData();
    dados.set("titulo", " Olá ");
    assert.equal(lerTextoDoFormulario(dados, "titulo", opcoes), " Olá ");
  });

  test("campo ausente ou arquivo viram texto vazio", () => {
    const dados = new FormData();
    dados.set("arquivo", new Blob(["x"]), "x.txt");
    assert.equal(lerTextoDoFormulario(dados, "titulo", opcoes), "");
    assert.equal(lerTextoDoFormulario(dados, "arquivo", opcoes), "");
  });

  test("aceita exatamente o limite e recusa acima dele, com mensagem em português", () => {
    const dados = new FormData();
    dados.set("titulo", "12345");
    assert.equal(lerTextoDoFormulario(dados, "titulo", opcoes), "12345");
    dados.set("titulo", "123456");
    assert.throws(() => lerTextoDoFormulario(dados, "titulo", opcoes), {
      message: 'O campo "Título" aceita no máximo 5 caracteres.',
    });
  });

  test("sem limite, aceita textos longos", () => {
    const dados = new FormData();
    dados.set("conteudo", "x".repeat(100_000));
    assert.equal(lerTextoDoFormulario(dados, "conteudo", { rotulo: "Conteúdo" }).length, 100_000);
  });
});
