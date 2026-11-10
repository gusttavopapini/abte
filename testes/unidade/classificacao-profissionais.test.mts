// Auditoria da classificação dos profissionais (10/11/2026). Dados fictícios.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { auditarClassificacao, decidirTipo, pareceEmpresaDeOrteses, tipoPeloConselho, tipoPelaPagina, tipoPelaPlanilha } from "../../src/lib/migracao/classificacaoProfissionais.ts";

describe("fontes do tipo", () => {
  test("conselho do registro", () => {
    assert.equal(tipoPeloConselho("CRM/MG 48775"), "Médicos");
    assert.equal(tipoPeloConselho("CRM-PE 13.282"), "Médicos");
    assert.equal(tipoPeloConselho("Crefito 3/64352F"), "Fisioterapeutas");
    assert.equal(tipoPeloConselho("CRFITO11 - 26260 F"), "Fisioterapeutas");
    assert.equal(tipoPeloConselho("CRP 06/170006"), "Psicólogos");
    assert.equal(tipoPeloConselho("CREF 012345-G/SP"), null, "CREF é educação física");
    assert.equal(tipoPeloConselho("34261-F"), null);
    assert.equal(tipoPeloConselho(""), null);
  });

  test("página do site antigo e planilha", () => {
    assert.equal(tipoPelaPagina("https://exemplo.invalid/medicos"), "Médicos");
    assert.equal(tipoPelaPagina("https://exemplo.invalid/ortesistas/"), "Ortesistas");
    assert.equal(tipoPelaPagina("https://exemplo.invalid/team"), null);
    assert.equal(tipoPelaPlanilha("Psicólogos"), "Psicólogos");
    assert.equal(tipoPelaPlanilha("psicologo"), null);
  });

  test("empresa de órteses pelo nome", () => {
    assert.ok(pareceEmpresaDeOrteses("Ortopedia Teste"));
    assert.ok(pareceEmpresaDeOrteses("Teste Órteses e Próteses Ltda"));
    assert.ok(!pareceEmpresaDeOrteses("Ana Ortiz"));
  });
});

describe("decisão do tipo", () => {
  test("corrige só com duas fontes de acordo e nenhuma contra", () => {
    assert.deepEqual(decidirTipo("Outros", { conselho: "Médicos", pagina: "Médicos", planilha: null }), { decisao: "corrigir", para: "Médicos" });
    assert.deepEqual(decidirTipo("Médicos", { conselho: "Médicos", pagina: null, planilha: null }), { decisao: "confere" });
  });

  test("conflito, fonte única contra e falta de fonte viram dúvida", () => {
    assert.equal(decidirTipo("Outros", { conselho: "Médicos", pagina: "Fisioterapeutas", planilha: null }).decisao, "duvida");
    assert.equal(decidirTipo("Outros", { conselho: "Médicos", pagina: null, planilha: null }).decisao, "duvida");
    assert.equal(decidirTipo("Médicos", { conselho: null, pagina: null, planilha: null }).decisao, "duvida");
    assert.equal(decidirTipo("", { conselho: null, pagina: null, planilha: null }).decisao, "duvida");
    assert.equal(decidirTipo("Nutricionistas", { conselho: "Médicos", pagina: null, planilha: null }).decisao, "duvida");
  });
});

describe("auditoria", () => {
  const base = { registro: "", pais: "BR", uf: "SP", cidades: ["Cidade"], ativo: true, excluido: false, origem: null };
  test("correções, dúvidas e pontos de local e duplicado", () => {
    const r = auditarClassificacao({
      profissionais: [
        { ...base, id: "a", tipo: "Outros", nome: "Teste Um", registro: "CRM 1234", origem: { sistema: "wix", chave: "um" } },
        { ...base, id: "b", tipo: "Fisioterapeutas", nome: "Teste Dois", registro: "Crefito 99999-F" },
        { ...base, id: "c", tipo: "Fisioterapeutas", nome: "Teste Dois", registro: "Crefito 99999-F", pais: "BO", uf: "SP" },
        { ...base, id: "d", tipo: "Fisioterapeutas", nome: "Ortopedia Exemplo", registro: "Crefito 1-F", uf: "", cidades: [] },
      ],
      origem: new Map([["um", { fonte: "https://exemplo.invalid/medicos" }]]),
      planilha: new Map(),
    });
    assert.equal(r.total, 4);
    assert.deepEqual(r.correcoes.map((c) => [c.id, c.de, c.para]), [["a", "Outros", "Médicos"]]);
    assert.equal(r.confere, 3);
    assert.ok(r.pontos.some((p) => p.id === "c" && p.assunto === "local" && /fora do Brasil/.test(p.motivo)));
    assert.ok(r.pontos.some((p) => p.id === "d" && p.assunto === "empresa"));
    assert.ok(r.pontos.some((p) => p.id === "d" && /sem UF/.test(p.motivo)));
    assert.ok(r.pontos.some((p) => p.id === "b" && p.assunto === "duplicado" && /Mesmo nome/.test(p.motivo)));
  });
});
