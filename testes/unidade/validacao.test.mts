// Testes das validações usadas pelas ações do painel (npm run test:unidade).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ehEmailValido,
  ehIdDeDocumentoValido,
  lerInteiroDoFormulario,
  lerListaDoFormulario,
  lerTextoDoFormulario,
} from "../../src/lib/validacao.ts";

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

describe("Validação de e-mail", () => {
  test("aceita e-mails comuns", () => {
    for (const email of ["nome@exemplo.com", "a.b+c@sub.dominio.com.br", "x@y.z"]) {
      assert.equal(ehEmailValido(email), true, email);
    }
  });

  test("recusa sem arroba, sem domínio, sem ponto no domínio ou com espaço", () => {
    for (const email of ["", "nome", "nome@", "@exemplo.com", "nome@exemplo", "nome @exemplo.com", "nome@exem plo.com", "a@b@c.com"]) {
      assert.equal(ehEmailValido(email), false, email);
    }
  });

  test("não corta espaços: quem chama passa o valor já sem espaços nas pontas", () => {
    assert.equal(ehEmailValido(" nome@exemplo.com "), false);
    assert.equal(ehEmailValido(" nome@exemplo.com ".trim()), true);
  });
});

describe("Leitura de número inteiro do formulário", () => {
  const opcoes = { rotulo: "Ordem", minimo: 0, maximo: 999, padrao: 0 };
  const formulario = (valor?: string) => {
    const dados = new FormData();
    if (valor !== undefined) dados.set("ordem", valor);
    return dados;
  };

  test("campo ausente ou vazio usa o padrão", () => {
    assert.equal(lerInteiroDoFormulario(formulario(), "ordem", opcoes), 0);
    assert.equal(lerInteiroDoFormulario(formulario("  "), "ordem", opcoes), 0);
  });

  test("aceita inteiros dentro do intervalo, inclusive os limites", () => {
    assert.equal(lerInteiroDoFormulario(formulario("0"), "ordem", opcoes), 0);
    assert.equal(lerInteiroDoFormulario(formulario(" 12 "), "ordem", opcoes), 12);
    assert.equal(lerInteiroDoFormulario(formulario("999"), "ordem", opcoes), 999);
  });

  test("recusa decimal, texto e fora do intervalo, com mensagem em português", () => {
    assert.throws(() => lerInteiroDoFormulario(formulario("1.5"), "ordem", opcoes), /só números inteiros/);
    assert.throws(() => lerInteiroDoFormulario(formulario("dez"), "ordem", opcoes), /só números inteiros/);
    assert.throws(() => lerInteiroDoFormulario(formulario("1000"), "ordem", opcoes), /de 0 a 999/);
    assert.throws(() => lerInteiroDoFormulario(formulario("-1"), "ordem", opcoes), /de 0 a 999/);
  });
});

describe("Leitura de lista do formulário", () => {
  test("junta os valores repetidos, sem duplicar e sem vazios", () => {
    const dados = new FormData();
    for (const valor of ["a", "b", "a", ""]) dados.append("tags", valor);
    assert.deepEqual(lerListaDoFormulario(dados, "tags", { rotulo: "Tags", limite: 5 }), ["a", "b"]);
  });

  test("ignora arquivos e recusa acima do limite", () => {
    const dados = new FormData();
    dados.append("tags", new Blob(["x"]));
    assert.deepEqual(lerListaDoFormulario(dados, "tags", { rotulo: "Tags", limite: 5 }), []);
    for (const valor of ["a", "b", "c"]) dados.append("tags", valor);
    assert.throws(() => lerListaDoFormulario(dados, "tags", { rotulo: "Tags", limite: 2 }), /no máximo 2 itens/);
  });
});
