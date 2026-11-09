// Campos extras dos profissionais e importação do site antigo e dos mini
// currículos (08/11/2026). Funções puras, dados fictícios marcados como TESTE.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validarEmailsExtras, validarOutrosPerfis, validarSite } from "../../src/lib/contatos.ts";
import { camposEditadosPorPessoa, extrasDoRegistro, limparTexto, nomeParaComparar, planejarCamposExtras } from "../../src/lib/migracao/camposExtras.ts";
import type { RegistroDeOrigem } from "../../src/lib/migracao/profissionais.ts";
import { validarProfissional } from "../../src/lib/profissionais.ts";

function formulario(campos: Record<string, string>) {
  const dados = new FormData();
  for (const [campo, valor] of Object.entries(campos)) dados.append(campo, valor);
  return dados;
}

const BASE = { tipo: "Fisioterapeutas", nome: "TESTE Profissional", pais: "BR", uf: "SP", cidades: "Cidade Um", whatsapp: "(11) 91234-5678" };

describe("validação dos campos extras no painel", () => {
  test("site: sem protocolo vira https; contato no campo errado e endereço sem domínio são recusados", () => {
    assert.deepEqual(validarSite("www.clinica-teste.com.br"), { ok: true, valor: "https://www.clinica-teste.com.br/" });
    assert.equal(validarSite("").ok, true);
    assert.equal(validarSite("javascript:alert(1)").ok, false);
    assert.equal(validarSite("https://instagram.com/teste").ok, false);
    assert.equal(validarSite("nome@exemplo.invalid").ok, false);
    assert.equal(validarSite("sem-dominio").ok, false);
    assert.equal(validarSite("https://usuario:senha@exemplo.invalid").ok, false);
  });

  test("outros perfis: rótulo | link, @usuario como Instagram, até 5", () => {
    const resultado = validarOutrosPerfis("Clínica | https://www.clinica-teste.com.br/equipe\n@perfil.teste\nperfil_dois");
    assert.ok(resultado.ok);
    if (resultado.ok) {
      assert.deepEqual(resultado.valor, [
        { rotulo: "Clínica", url: "https://www.clinica-teste.com.br/equipe" },
        { rotulo: "Instagram", url: "https://www.instagram.com/perfil.teste/" },
        { rotulo: "Instagram", url: "https://www.instagram.com/perfil_dois/" },
      ]);
    }
    assert.equal(validarOutrosPerfis("javascript:alert(1)").ok, false);
    assert.equal(validarOutrosPerfis(Array.from({ length: 6 }, (_, i) => `@p${i}`).join("\n")).ok, false);
  });

  test("e-mails extras: até 3, validados, sem repetidos", () => {
    assert.deepEqual(validarEmailsExtras("A@exemplo.invalid; b@exemplo.invalid, a@exemplo.invalid"), { ok: true, valor: ["a@exemplo.invalid", "b@exemplo.invalid"] });
    assert.equal(validarEmailsExtras("sem-arroba").ok, false);
    assert.equal(validarEmailsExtras("a@x.invalid,b@x.invalid,c@x.invalid,d@x.invalid").ok, false);
  });

  test("apresentação aceita até 3.000 caracteres", () => {
    assert.equal(validarProfissional(formulario({ ...BASE, bio: "a".repeat(3000) })).ok, true);
    const longa = validarProfissional(formulario({ ...BASE, bio: "a".repeat(3001) }));
    assert.equal(longa.ok, false);
    if (!longa.ok) assert.match(longa.erros.bio ?? "", /3000/);
  });

  test("formulário com os campos extras", () => {
    const resultado = validarProfissional(formulario({ ...BASE, endereco: "  Rua Teste,   10  ", site: "clinica-teste.com.br", outrosPerfis: "@outro.teste", emailsExtras: "extra@exemplo.invalid" }));
    assert.ok(resultado.ok);
    if (!resultado.ok) return;
    assert.equal(resultado.dados.endereco, "Rua Teste, 10");
    assert.equal(resultado.dados.site, "https://clinica-teste.com.br/");
    assert.deepEqual(resultado.dados.outrosPerfis, [{ rotulo: "Instagram", url: "https://www.instagram.com/outro.teste/" }]);
    assert.deepEqual(resultado.dados.emailsExtras, ["extra@exemplo.invalid"]);
  });
});

const registro = (posicao: number, chave: string, bruto: Record<string, unknown>): RegistroDeOrigem => ({ posicao, chave, bruto, fotos: [], pontosDeRevisao: 0 });
const doc = (id: string, dados: Record<string, unknown>) => ({ id, dados });

describe("importação dos campos extras", () => {
  test("texto limpo só nos espaços e quebras, sem mudar palavras", () => {
    assert.equal(limparTexto("  Linha  um\r\n\r\n\r\n  linha\tdois   "), "Linha um\n\nlinha dois");
  });

  test("valores do arquivo validados; inválidos ficam de fora e são contados", () => {
    const { valores, descartes } = extrasDoRegistro({
      endereco: "Rua Teste, 1",
      site: "clinica-teste.com.br",
      outrosPerfis: ["perfil.teste", "javascript:alert(1)"],
      emailsExtras: ["extra@exemplo.invalid", "invalido"],
      cidades: ["Cidade Um", "Cidade Dois"],
      bio: "a".repeat(3001),
      email: "principal@exemplo.invalid",
    });
    assert.equal(valores.endereco, "Rua Teste, 1");
    assert.equal(valores.site, "https://clinica-teste.com.br/");
    assert.deepEqual(valores.outrosPerfis, [{ rotulo: "Instagram", url: "https://www.instagram.com/perfil.teste/" }]);
    assert.deepEqual(valores.emailsExtras, ["extra@exemplo.invalid"]);
    assert.deepEqual(valores.cidades, ["Cidade Um", "Cidade Dois"]);
    assert.equal(valores.bio, undefined, "texto acima do limite não é cortado: fica de fora");
    assert.deepEqual(descartes, { outrosPerfis: 1, emailsExtras: 1, bio: 1 });
  });

  test("nunca sobrescreve campo preenchido nem editado no painel", () => {
    const registros = [registro(1, "chave-um", { endereco: "Rua Teste, 1", site: "clinica-teste.com.br", bio: "Apresentação do site antigo.", cidades: ["Cidade Um"] })];
    const documentos = [doc("d1", { origem: { sistema: "wix", chave: "chave-um" }, endereco: "Endereço digitado", bio: "", cidades: [] })];
    const editados = camposEditadosPorPessoa([
      { colecao: "profissionais", documentoId: "d1", campos: ["bio"], acao: "editar" },
      { colecao: "profissionais", documentoId: "d1", campos: ["cidades"], origem: "migracao" },
    ]);
    const { plano } = planejarCamposExtras(registros, documentos, editados);
    assert.equal(plano.length, 1);
    assert.deepEqual(Object.keys(plano[0].gravar).sort(), ["cidades", "site"]);
    assert.deepEqual(plano[0].jaPreenchidos, ["endereco"]);
    assert.deepEqual(plano[0].editadosNoPainel, ["bio"]);
  });

  test("registro sem documento e documento na lixeira", () => {
    const registros = [registro(1, "sem-doc", { site: "a-teste.com.br" }), registro(2, "na-lixeira", { site: "b-teste.com.br" })];
    const documentos = [doc("d2", { origem: { sistema: "wix", chave: "na-lixeira" }, excluidoEm: new Date() })];
    const { plano } = planejarCamposExtras(registros, documentos, new Map());
    assert.deepEqual(plano.map((item) => item.situacao), ["semDocumento", "naLixeira"]);
  });

  test("mini currículos do lote 1: conferidos pelo nome, só onde a bio está vazia; lista de quem ficou sem", () => {
    const documentos = [
      doc("l1", { origem: { sistema: "cadastro-lote" }, nome: "Fulana Teste da Silva", bio: "" }),
      doc("l2", { origem: { sistema: "cadastro-lote" }, nome: "Beltrano Teste", bio: "Já tem." }),
      doc("l3", { origem: { sistema: "cadastro-lote" }, nome: "Ciclana Teste", bio: "" }),
    ];
    const { plano, semMiniCurriculo, miniCurriculosSemProfissional } = planejarCamposExtras([], documentos, new Map(), [
      { arquivo: "Fulana Teste da Silva.txt", texto: "  Fisioterapeuta.\r\n\r\nAtende   adultos. " },
      { arquivo: "beltrano-teste.txt", texto: "Outro texto." },
      { arquivo: "Pessoa Inexistente.txt", texto: "x" },
    ]);
    assert.equal(plano.find((item) => item.documentoId === "l1")?.gravar.bio, "Fisioterapeuta.\n\nAtende adultos.");
    assert.deepEqual(plano.find((item) => item.documentoId === "l2")?.jaPreenchidos, ["bio"]);
    assert.deepEqual(semMiniCurriculo, ["l3"]);
    assert.deepEqual(miniCurriculosSemProfissional, ["Pessoa Inexistente.txt"]);
    assert.equal(nomeParaComparar("Dra. Fulana  Téste"), "fulana teste");
  });
});
