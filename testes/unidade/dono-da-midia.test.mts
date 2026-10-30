// Dono da imagem (29/10/2026, src/lib/midia/dono.ts) e o texto alternativo
// obrigatório do envio pelo formulário de cada item.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  CAMPOS_POR_TIPO_DE_DONO,
  MENSAGEM_DONO_INVALIDO,
  descreverDono,
  donoDoDocumento,
  idsDasImagensNoTexto,
  lerDono,
  precisaCompletarDono,
} from "../../src/lib/midia/dono.ts";
import { validarAlt } from "../../src/lib/midia/regras.ts";

describe("Dono da imagem: leitura do formulário", () => {
  test("os três campos vazios: envio sem dono (biblioteca)", () => {
    assert.deepEqual(lerDono(null, null, null), { ok: true, dono: null });
    assert.deepEqual(lerDono("", "", ""), { ok: true, dono: null });
  });

  test("item novo: dono sem id, completado ao salvar", () => {
    assert.deepEqual(lerDono("post", "", "capa"), { ok: true, dono: { tipo: "post", id: null, campo: "capa" } });
  });

  test("item existente: dono com o id do documento", () => {
    assert.deepEqual(lerDono("produto", "abc123", "galeria"), { ok: true, dono: { tipo: "produto", id: "abc123", campo: "galeria" } });
  });

  test("home: o id é o identificador do espaço", () => {
    assert.deepEqual(lerDono("home", "secao-mutiroes", "secao"), { ok: true, dono: { tipo: "home", id: "secao-mutiroes", campo: "secao" } });
    assert.equal(lerDono("home", "Seção Mutirões", "secao").ok, false);
    // Uma versão por campo (30/10/2026).
    assert.deepEqual(lerDono("home", "banner-abcd1234", "bannerCelular"), { ok: true, dono: { tipo: "home", id: "banner-abcd1234", campo: "bannerCelular" } });
    assert.deepEqual(lerDono("home", "secao-mutiroes", "secaoCelular"), { ok: true, dono: { tipo: "home", id: "secao-mutiroes", campo: "secaoCelular" } });
    assert.equal(lerDono("home", "secao-mutiroes", "secao-mobile").ok, false);
  });

  test("tipo, campo ou id estranhos recusam o envio", () => {
    const recusado = { ok: false, mensagem: MENSAGEM_DONO_INVALIDO };
    assert.deepEqual(lerDono("usuario", "", "foto"), recusado);
    assert.deepEqual(lerDono("post", "", "galeria"), recusado);
    assert.deepEqual(lerDono("post", "", ""), recusado);
    assert.deepEqual(lerDono("post", "a/b", "capa"), recusado);
    assert.deepEqual(lerDono("post", "__x__", "capa"), recusado);
    assert.deepEqual(lerDono("constructor", "", "capa"), recusado);
    assert.deepEqual(lerDono("", "abc", ""), recusado);
  });

  test("todo tipo tem pelo menos um campo e um nome para a tela", () => {
    for (const [tipo, campos] of Object.entries(CAMPOS_POR_TIPO_DE_DONO)) {
      assert.ok(campos.length > 0, tipo);
      for (const campo of campos) assert.ok(descreverDono({ tipo: tipo as keyof typeof CAMPOS_POR_TIPO_DE_DONO, id: null, campo }).length > 0);
    }
    assert.equal(descreverDono({ tipo: "post", id: null, campo: "capa" }), "Post do blog (capa)");
  });
});

describe("Dono da imagem: documento e vínculo", () => {
  test("leitura tolerante do documento: valor estranho vale como sem dono", () => {
    assert.equal(donoDoDocumento(undefined), null);
    assert.equal(donoDoDocumento("post"), null);
    assert.equal(donoDoDocumento({ tipo: "x", id: null, campo: "capa" }), null);
    assert.deepEqual(donoDoDocumento({ tipo: "artigo", id: null, campo: "imagem" }), { tipo: "artigo", id: null, campo: "imagem" });
    assert.deepEqual(donoDoDocumento({ tipo: "artigo", id: "a1", campo: "imagem" }), { tipo: "artigo", id: "a1", campo: "imagem" });
  });

  test("só a mídia do mesmo tipo e campo, ainda sem id, é completada", () => {
    assert.equal(precisaCompletarDono({ tipo: "post", id: null, campo: "capa" }, "post", "capa"), true);
    assert.equal(precisaCompletarDono(null, "post", "capa"), false, "imagem antiga, sem dono");
    assert.equal(precisaCompletarDono({ tipo: "post", id: "p1", campo: "capa" }, "post", "capa"), false, "já ligada a outro item");
    assert.equal(precisaCompletarDono({ tipo: "post", id: null, campo: "corpo" }, "post", "capa"), false, "outro campo");
    assert.equal(precisaCompletarDono({ tipo: "artigo", id: null, campo: "imagem" }, "post", "capa"), false, "outro tipo");
  });

  test("ids das imagens no texto do post, sem repetir", () => {
    const texto = "Parágrafo.\n\n![Capa da cartilha](midia:abc123)\n\nOutro.\n\n![x](midia:def456)\n\n![y](midia:abc123)\n\n![z](https://exemplo.org/a.png)";
    assert.deepEqual(idsDasImagensNoTexto(texto), ["abc123", "def456"]);
    assert.deepEqual(idsDasImagensNoTexto("sem imagens"), []);
  });
});

describe("Texto alternativo obrigatório", () => {
  test("vazio ou só espaços é recusado em português", () => {
    assert.deepEqual(validarAlt(""), { ok: false, mensagem: "Descreva a imagem no texto alternativo." });
    assert.deepEqual(validarAlt("   "), { ok: false, mensagem: "Descreva a imagem no texto alternativo." });
    assert.equal(validarAlt(undefined).ok, false);
  });

  test("acima do limite é recusado; dentro dele, os espaços são normalizados", () => {
    assert.equal(validarAlt("a".repeat(201)).ok, false);
    assert.deepEqual(validarAlt("  Capa   da cartilha "), { ok: true, alt: "Capa da cartilha" });
  });
});
