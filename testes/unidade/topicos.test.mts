// Testes do campo ativa das categorias de artigo (npm run test:unidade):
// leitura (ausente vale true), o que o /artigos público mostra, as opções do
// seletor do painel e a leitura do formulário. Só dados fictícios.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { categoriaVisivelNoSite, lerAtiva, lerAtivaDoFormulario, opcoesDeCategoriaNoPainel } from "../../src/lib/topicos.ts";

const categoria = (id: string, ativa: boolean, excluidoEm: Date | null = null) => ({ id, nome: `Categoria ${id}`, ativa, excluidoEm });

describe("Categorias de artigo: campo ativa", () => {
  test("ausente ou qualquer valor que não seja false vale true", () => {
    assert.equal(lerAtiva(undefined), true);
    assert.equal(lerAtiva(null), true);
    assert.equal(lerAtiva(true), true);
    assert.equal(lerAtiva("false"), true, "só o booleano false desliga");
    assert.equal(lerAtiva(false), false);
  });

  test("/artigos público: inativa não aparece; sem o campo aparece; na lixeira não aparece", () => {
    assert.equal(categoriaVisivelNoSite(categoria("inativa", false)), false);
    assert.equal(categoriaVisivelNoSite({ ativa: lerAtiva(undefined), excluidoEm: null }), true);
    assert.equal(categoriaVisivelNoSite(categoria("lixeira", true, new Date())), false);
    assert.equal(categoriaVisivelNoSite(categoria("lixeira-inativa", false, new Date())), false);
  });

  test("seletor do painel: inativa aparece marcada; na lixeira não aparece", () => {
    assert.deepEqual(opcoesDeCategoriaNoPainel([categoria("a", true), categoria("b", false), categoria("c", true, new Date())]), [
      { id: "a", nome: "Categoria a" },
      { id: "b", nome: "Categoria b (inativa)" },
    ]);
  });

  test("formulário: marcada é true, desmarcada é false, sem o controle não muda, outro valor é recusado", () => {
    const formulario = (campos: Record<string, string>) => {
      const dados = new FormData();
      for (const [nome, valor] of Object.entries(campos)) dados.set(nome, valor);
      return dados;
    };
    assert.deepEqual(lerAtivaDoFormulario(formulario({ ativaNoFormulario: "sim", ativa: "sim" })), { ok: true, ativa: true });
    assert.deepEqual(lerAtivaDoFormulario(formulario({ ativaNoFormulario: "sim" })), { ok: true, ativa: false });
    assert.deepEqual(lerAtivaDoFormulario(formulario({ nome: "x" })), { ok: true, ativa: null });
    const recusado = lerAtivaDoFormulario(formulario({ ativaNoFormulario: "sim", ativa: "talvez" }));
    assert.equal(recusado.ok, false);
    assert.match(recusado.ok ? "" : recusado.mensagem, /Valor inválido para Ativa/);
  });
});
