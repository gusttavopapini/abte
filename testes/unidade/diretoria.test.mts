// Testes das regras de exibição da página pública /diretoria (npm run
// test:unidade): quem aparece, agrupamento por período e ordem. Só dados
// fictícios.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { diretoriaPorPeriodo, membroVisivelNoSite, tituloDoPeriodo } from "../../src/lib/diretoria.ts";

const membro = (id: string, campos: Partial<{ ativo: boolean; excluidoEm: Date | null; periodo: string; ordem: number; nome: string }> = {}) => ({
  id,
  ativo: true,
  excluidoEm: null,
  periodo: "2025-2027",
  ordem: 1,
  nome: `TESTE ${id}`,
  ...campos,
});

describe("Diretoria: regras de exibição", () => {
  test("aparece só o ativo e fora da lixeira", () => {
    assert.equal(membroVisivelNoSite(membro("a")), true);
    assert.equal(membroVisivelNoSite(membro("b", { ativo: false })), false);
    assert.equal(membroVisivelNoSite(membro("c", { excluidoEm: new Date() })), false);
    assert.equal(membroVisivelNoSite(membro("d", { ativo: false, excluidoEm: new Date() })), false);
  });

  test("agrupa pelo período, o mais recente primeiro, e o sem período por último", () => {
    const grupos = diretoriaPorPeriodo([membro("a", { periodo: "2021-2023" }), membro("b", { periodo: "" }), membro("c"), membro("d", { periodo: " 2025-2027 " })]);
    assert.deepEqual(grupos.map((grupo) => grupo.periodo), ["2025-2027", "2021-2023", ""]);
    assert.deepEqual(grupos[0].membros.map((item) => item.id).sort(), ["c", "d"]);
  });

  test("dentro do período, pela ordem e, no empate, pelo nome", () => {
    const grupos = diretoriaPorPeriodo([membro("x", { ordem: 3 }), membro("y", { ordem: 1, nome: "TESTE Zeta" }), membro("z", { ordem: 1, nome: "TESTE Alfa" })]);
    assert.deepEqual(grupos[0].membros.map((item) => item.id), ["z", "y", "x"]);
  });

  test("os ocultos não entram e um período sem visíveis não vira grupo", () => {
    const grupos = diretoriaPorPeriodo([membro("a"), membro("b", { periodo: "2021-2023", ativo: false }), membro("c", { periodo: "2019-2021", excluidoEm: new Date() })]);
    assert.deepEqual(grupos.map((grupo) => grupo.periodo), ["2025-2027"]);
    assert.deepEqual(diretoriaPorPeriodo([membro("b", { ativo: false })]), []);
  });

  test("título do período: o valor como está; sem período, texto próprio", () => {
    assert.equal(tituloDoPeriodo("2025-2027"), "Período 2025-2027");
    assert.equal(tituloDoPeriodo(""), "Período não informado");
  });
});
