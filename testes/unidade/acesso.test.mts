// Testes da decisão de acesso ao painel (npm run test:unidade).
// A função é pura: não precisa de Firebase nem de emulador.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { decidirAcessoAoPainel, papelPodeExecutar } from "../../src/lib/auth/papeis.ts";

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

describe("Permissões por ação (tabela provisória, P7)", () => {
  test("editor envia, edita, exclui e restaura mídia, mas não exclui de vez", () => {
    for (const acao of ["midia.enviar", "midia.editar", "midia.excluir", "midia.restaurar"] as const) {
      assert.equal(papelPodeExecutar("editor", acao), true, acao);
      assert.deepEqual(decidirAcessoAoPainel({ papel: "editor" }, acao), { permitido: true, papel: "editor" }, acao);
    }
    assert.equal(papelPodeExecutar("editor", "midia.excluirDeVez"), false);
    assert.deepEqual(decidirAcessoAoPainel({ papel: "editor" }, "midia.excluirDeVez"), { permitido: false, motivo: "sem-permissao" });
  });

  test("administrador executa todas as ações de mídia", () => {
    for (const acao of ["midia.enviar", "midia.editar", "midia.excluir", "midia.restaurar", "midia.excluirDeVez"] as const) {
      assert.deepEqual(decidirAcessoAoPainel({ papel: "administrador" }, acao), { permitido: true, papel: "administrador" }, acao);
    }
  });

  test("sem sessão ou sem papel, a ação não muda o motivo da recusa", () => {
    assert.deepEqual(decidirAcessoAoPainel(null, "midia.enviar"), { permitido: false, motivo: "sem-sessao" });
    assert.deepEqual(decidirAcessoAoPainel({ papel: "visitante" }, "midia.enviar"), { permitido: false, motivo: "sem-papel" });
  });
});
