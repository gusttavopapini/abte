// Testes dos telefones dos profissionais (06/11/2026): validação, leitura do
// formulário do painel e plano do importador. Números fictícios.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { LIMITE_DE_TELEFONES, ehFixoBrasileiro, telefoneParaLeitura, validarEmailDeContato, validarTelefone, validarTelefones } from "../../src/lib/contatos.ts";
import type { RegistroDeOrigem } from "../../src/lib/migracao/profissionais.ts";
import { planejarTelefones, type DocumentoDoProfissional } from "../../src/lib/migracao/telefones.ts";
import { validarProfissional } from "../../src/lib/profissionais.ts";

type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string };
const valor = <T,>(r: Resultado<T>): T => { assert.ok(r.ok); return r.valor; };
const erro = <T,>(r: Resultado<T>): string => { assert.equal(r.ok, false); return r.ok ? "" : r.erro; };

describe("validarTelefone", () => {
  test("fixo e celular brasileiros com DDD viram só dígitos com 55", () => {
    assert.equal(valor(validarTelefone("(11) 3333-4444", "BR")), "551133334444");
    assert.equal(valor(validarTelefone("011 93333-4444", "BR")), "5511933334444");
    assert.equal(valor(validarTelefone("+55 21 2222-3333", "BR")), "552122223333");
  });
  test("outro país pelo código do profissional ou pelo +", () => {
    assert.equal(valor(validarTelefone("021 123 456", "PY")), "59521123456");
    assert.equal(valor(validarTelefone("+591 2 1234567", "BR")), "59121234567");
  });
  test("vazio vale; inválido e contato trocado são recusados em português", () => {
    assert.equal(valor(validarTelefone("  ", "BR")), "");
    assert.match(erro(validarTelefone("3333-4444", "BR")), /Telefone inválido/);
    assert.match(erro(validarTelefone("ramal 12", "BR")), /Use só números/);
    assert.match(erro(validarTelefone("contato@exemplo.invalid", "BR")), /campo E-mail/);
    assert.match(erro(validarTelefone("https://wa.me/5511933334444", "BR")), /campo WhatsApp/);
  });
  test("telefone colado no e-mail sugere WhatsApp ou Telefones", () => {
    assert.match(erro(validarEmailDeContato("(11) 3333-4444")), /campo WhatsApp ou Telefones/);
  });
});

describe("validarTelefones", () => {
  test("separa por vírgula, ponto e vírgula ou linha, sem repetir", () => {
    assert.deepEqual(valor(validarTelefones("(11) 3333-4444\n(11) 93333-4444; (11) 3333-4444", "BR")), ["551133334444", "5511933334444"]);
    assert.deepEqual(valor(validarTelefones("", "BR")), []);
  });
  test(`até ${LIMITE_DE_TELEFONES} números; o erro cita a posição`, () => {
    assert.match(erro(validarTelefones("1133334444, 1133334445, 1133334446, 1133334447", "BR")), /no máximo 3/);
    assert.match(erro(validarTelefones("(11) 3333-4444, 999", "BR")), /^Telefone 2: /);
  });
});

test("leitura do número e fixo brasileiro", () => {
  assert.equal(telefoneParaLeitura("551133334444"), "(11) 3333-4444");
  assert.equal(telefoneParaLeitura("5511933334444"), "(11) 93333-4444");
  assert.equal(telefoneParaLeitura("59521123456"), "+59521123456");
  assert.equal(ehFixoBrasileiro("551133334444"), true);
  assert.equal(ehFixoBrasileiro("5511933334444"), false);
  assert.equal(ehFixoBrasileiro("551193334444"), false);
});

describe("formulário do profissional com telefones", () => {
  const base = { tipo: "Fisioterapeutas", nome: "TESTE Profissional", pais: "BR", uf: "SP", cidades: "Cidade Um" };
  const formulario = (extra: Record<string, string>) => {
    const dados = new FormData();
    for (const [campo, v] of Object.entries({ ...base, ...extra })) dados.set(campo, v);
    return dados;
  };
  test("só telefone já conta como contato", () => {
    const r = validarProfissional(formulario({ telefones: "(11) 3333-4444" }));
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.dados.telefones, ["551133334444"]);
  });
  test("sem nenhum contato, a mensagem cita o telefone", () => {
    const r = validarProfissional(formulario({}));
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.erros.contatos ?? "", /telefone/);
  });
  test("telefone inválido marca o campo telefones", () => {
    const r = validarProfissional(formulario({ telefones: "999", email: "contato@exemplo.invalid" }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.erros.telefones ?? "", /Telefone inválido/);
  });
});

describe("plano do importador", () => {
  const registro = (posicao: number, chave: string, telefones: string[]): RegistroDeOrigem => ({ posicao, chave, bruto: { telefones }, fotos: [], pontosDeRevisao: 0 });
  const doc = (id: string, dados: Record<string, unknown>): DocumentoDoProfissional => ({ id, dados: { pais: "BR", whatsapp: "", ...dados } });

  test("site antigo: grava os válidos, tira o igual ao WhatsApp e respeita quem já tem telefone", () => {
    const plano = planejarTelefones(
      [registro(1, "a", ["(11) 3333-4444", "(11) 93333-4444", "999"]), registro(2, "b", ["(21) 2222-3333"]), registro(3, "c", ["123"]), registro(4, "sem-doc", ["(11) 3333-4444"])],
      [
        doc("A", { origem: { sistema: "wix", chave: "a" }, whatsapp: "5511933334444" }),
        doc("B", { origem: { sistema: "wix", chave: "b" }, telefones: ["552100000000"] }),
        doc("C", { origem: { sistema: "wix", chave: "c" } }),
      ],
    );
    const por = (posicao: number) => plano.find((item) => item.posicao === posicao);
    assert.equal(por(1)?.situacao, "aGravar");
    assert.deepEqual(por(1)?.telefones, ["551133334444"]);
    assert.equal(por(1)?.deFora, 2);
    assert.equal(por(2)?.situacao, "jaTemTelefone");
    assert.equal(por(3)?.situacao, "semNumeroValido");
    assert.equal(por(4)?.situacao, "semDocumento");
  });
  test("fixo no campo WhatsApp do cadastro em lote passa para Telefones; celular e fixo do site antigo ficam", () => {
    const plano = planejarTelefones([], [
      doc("F", { origem: { sistema: "cadastro-lote", chave: "lote1-x" }, whatsapp: "553133334444" }),
      doc("G", { origem: { sistema: "cadastro-lote", chave: "lote1-y" }, whatsapp: "5531933334444" }),
      doc("W", { origem: { sistema: "wix", chave: "sem-telefones" }, whatsapp: "553133335555" }),
    ]);
    assert.equal(plano.length, 1);
    assert.equal(plano[0].documentoId, "F");
    assert.equal(plano[0].esvaziarWhatsapp, true);
    assert.deepEqual(plano[0].telefones, ["553133334444"]);
  });
  test("na lixeira fica de fora", () => {
    const plano = planejarTelefones([registro(1, "a", ["(11) 3333-4444"])], [doc("A", { origem: { sistema: "wix", chave: "a" }, excluidoEm: new Date() })]);
    assert.equal(plano[0].situacao, "naLixeira");
  });
});
