// Qual capa o post mostra no site (npm run test:unidade).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { capaParaExibir } from "../../src/lib/capaDoPost.ts";

const IMAGEM = { alt: "Capa de teste" };
const ANTIGA = "https://exemplo.invalid/capa.jpg";

describe("Capa do post", () => {
  test("capa da biblioteca vence a antiga, na lista e na página", () => {
    for (const lugar of ["lista", "pagina"] as const) {
      assert.deepEqual(capaParaExibir({ capaMidiaId: "abc", imagem: ANTIGA }, IMAGEM, lugar), { tipo: "biblioteca", imagem: IMAGEM });
    }
  });

  test("sem capa da biblioteca, a capa antiga", () => {
    for (const lugar of ["lista", "pagina"] as const) {
      assert.deepEqual(capaParaExibir({ capaMidiaId: null, imagem: ANTIGA }, undefined, lugar), { tipo: "antiga", endereco: ANTIGA });
    }
  });

  test("sem imagem nenhuma: placeholder na lista, nenhum bloco na página do post", () => {
    assert.deepEqual(capaParaExibir({ capaMidiaId: null, imagem: "" }, undefined, "lista"), { tipo: "placeholder" });
    assert.deepEqual(capaParaExibir({ capaMidiaId: null, imagem: "" }, undefined, "pagina"), { tipo: "nenhuma" });
  });

  test("capa da biblioteca na lixeira: não volta para a antiga", () => {
    assert.deepEqual(capaParaExibir({ capaMidiaId: "abc", imagem: ANTIGA }, null, "lista"), { tipo: "placeholder" });
    assert.deepEqual(capaParaExibir({ capaMidiaId: "abc", imagem: ANTIGA }, null, "pagina"), { tipo: "nenhuma" });
  });
});
