// Testes da decisão de acesso ao painel (npm run test:unidade).
// A função é pura: não precisa de Firebase nem de emulador.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { decidirAcessoAoPainel } from "../../src/lib/auth/papeis.ts";

describe("Decisão de acesso ao painel", () => {
  test("sem sessão: nega com motivo sem-sessao", () => {
    assert.deepEqual(decidirAcessoAoPainel(null), { permitido: false, motivo: "sem-sessao" });
  });

  test("sessão sem papel: nega com motivo sem-papel", () => {
    assert.deepEqual(decidirAcessoAoPainel({ papel: null }), { permitido: false, motivo: "sem-papel" });
    assert.deepEqual(decidirAcessoAoPainel({}), { permitido: false, motivo: "sem-papel" });
  });

  test("papel inválido: nega com motivo sem-papel", () => {
    for (const papel of ["visitante", "Administrador", " editor", "", 1, true, ["editor"], { papel: "editor" }]) {
      assert.deepEqual(decidirAcessoAoPainel({ papel }), { permitido: false, motivo: "sem-papel" }, String(papel));
    }
  });

  test("editor: permite", () => {
    assert.deepEqual(decidirAcessoAoPainel({ papel: "editor" }), { permitido: true, papel: "editor" });
  });

  test("administrador: permite", () => {
    assert.deepEqual(decidirAcessoAoPainel({ papel: "administrador" }), { permitido: true, papel: "administrador" });
  });
});
