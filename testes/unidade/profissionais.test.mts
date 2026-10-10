// Testes da validação do cadastro de profissional (npm run test:unidade).
// Os dados abaixo são de exemplo, marcados como TESTE, e não existem.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validarProfissional } from "../../src/lib/profissionais.ts";

function formulario(campos: Record<string, string | string[]>) {
  const dados = new FormData();
  for (const [campo, valor] of Object.entries(campos)) {
    for (const item of Array.isArray(valor) ? valor : [valor]) dados.append(campo, item);
  }
  return dados;
}

const BASE = {
  tipo: "Fisioterapeutas",
  tratamento: "Dra.",
  nome: "TESTE Profissional",
  registro: "TESTE 000",
  metodos: ["SEAS", "Schroth ISST"],
  pais: "BR",
  uf: "sp",
  cidades: "Cidade Um, Cidade Dois\nCidade Um",
  whatsapp: "(11) 91234-5678",
  ativo: "sim",
  ordem: "3",
};

describe("Cadastro de profissional", () => {
  test("dados completos viram o registro pronto para gravar", () => {
    const resultado = validarProfissional(formulario(BASE));
    assert.equal(resultado.ok, true);
    if (!resultado.ok) return;
    assert.deepEqual(resultado.dados.metodos, ["Schroth ISST", "SEAS"]);
    assert.equal(resultado.dados.uf, "SP");
    assert.deepEqual(resultado.dados.cidades, ["Cidade Um", "Cidade Dois"]);
    assert.equal(resultado.dados.whatsapp, "5511912345678");
    assert.equal(resultado.dados.ativo, true);
    assert.equal(resultado.dados.telerreabilitacao, false);
    assert.equal(resultado.dados.ordem, 3);
  });

  test("UF é obrigatória no Brasil e some nos outros países", () => {
    const semUf = validarProfissional(formulario({ ...BASE, uf: "" }));
    assert.equal(semUf.ok, false);
    if (!semUf.ok) assert.match(semUf.erros.uf ?? "", /UF/);
    const paraguai = validarProfissional(formulario({ ...BASE, pais: "PY", uf: "SP", whatsapp: "0981 123 456" }));
    assert.equal(paraguai.ok, true);
    if (paraguai.ok) assert.equal(paraguai.dados.uf, "");
  });

  test("exige nome, tipo e país válidos e recusa método desconhecido", () => {
    const resultado = validarProfissional(formulario({ ...BASE, nome: " ", tipo: "Astronautas", pais: "AR", metodos: ["Inventado"] }));
    assert.equal(resultado.ok, false);
    if (resultado.ok) return;
    assert.ok(resultado.erros.nome && resultado.erros.tipo && resultado.erros.pais && resultado.erros.metodos);
  });

  test("exige pelo menos um contato e uma cidade (ou telerreabilitação)", () => {
    const resultado = validarProfissional(formulario({ ...BASE, whatsapp: "", cidades: "" }));
    assert.equal(resultado.ok, false);
    if (resultado.ok) return;
    assert.match(resultado.erros.contatos ?? "", /pelo menos um contato/);
    assert.match(resultado.erros.local ?? "", /pelo menos uma cidade/);
    const remoto = validarProfissional(formulario({ ...BASE, cidades: "", telerreabilitacao: "sim" }));
    assert.equal(remoto.ok, true);
  });

  test("contato no campo errado aparece como erro do campo", () => {
    const resultado = validarProfissional(formulario({ ...BASE, whatsapp: "contato@exemplo.com.br", instagram: "facebook.com/pagina.exemplo" }));
    assert.equal(resultado.ok, false);
    if (resultado.ok) return;
    assert.match(resultado.erros.whatsapp ?? "", /campo E-mail/);
    assert.match(resultado.erros.instagram ?? "", /campo Facebook/);
  });

  test("limites de tamanho e ordem", () => {
    const resultado = validarProfissional(formulario({ ...BASE, tratamento: "x".repeat(21), cidades: Array.from({ length: 11 }, (_, i) => `C${i}`).join(","), ordem: "1000" }));
    assert.equal(resultado.ok, false);
    if (resultado.ok) return;
    assert.ok(resultado.erros.tratamento && resultado.erros.cidades && resultado.erros.ordem);
  });
});
