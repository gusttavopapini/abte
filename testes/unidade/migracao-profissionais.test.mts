// Testes da conversão dos profissionais do site antigo (npm run
// test:unidade): estrutura do arquivo e conversão de cada campo para o modelo
// atual, com a mesma validação do painel. Os registros aqui são fictícios.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { converterProfissional, validarProfissionaisOrigem, type RegistroDeOrigem } from "../../src/lib/migracao/profissionais.ts";

const HEX = "0123456789abcdef0123456789abcdef";

function bruto(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "pessoa-ficticia",
    tipo: "fisioterapeuta",
    grupo: "membro",
    tratamento: "Dra.",
    nome: "Pessoa Fictícia",
    conselho: "CREFITO",
    registro: "Registro de exemplo",
    metodos: ["Schroth ISST", "BSPTS (Conceito Rigo)"],
    pais: "Brasil",
    uf: "SP",
    cidades: ["Cidade Exemplo"],
    telerreabilitacao: false,
    endereco: "Endereço que não entra no modelo",
    telefones: ["5511900000000"],
    whatsapp: "5511912345678",
    instagram: "perfil.exemplo",
    facebook: "pagina.exemplo",
    email: "contato@exemplo.invalid",
    site: "https://exemplo.invalid",
    fotoOrigemWixId: [`7dce06_${HEX}~mv2.jpg`],
    bio: "Apresentação de exemplo.",
    ativo: true,
    ordem: 7,
    revisar: [],
    ...extra,
  };
}

function registro(extra: Record<string, unknown> = {}): RegistroDeOrigem {
  const validacao = validarProfissionaisOrigem({ versao: 1, profissionais: [bruto(extra)] });
  assert.ok(validacao.ok, JSON.stringify(!validacao.ok && validacao.erros));
  return validacao.registros[0];
}

describe("Estrutura do profissionais.json", () => {
  test("aceita o arquivo e guarda posição, chave, fotos e pontos de revisão", () => {
    const resultado = validarProfissionaisOrigem({ versao: 1, profissionais: [bruto({ revisar: ["a", "b"] }), bruto({ id: "outra-pessoa", fotoOrigemWixId: [] })] });
    assert.ok(resultado.ok);
    assert.deepEqual(
      resultado.registros.map((r) => [r.posicao, r.chave, r.fotos.length, r.pontosDeRevisao]),
      [
        [1, "pessoa-ficticia", 1, 2],
        [2, "outra-pessoa", 0, 0],
      ],
    );
  });

  test("recusa versão errada, lista vazia, id repetido, id inválido, nome ausente e foto fora do formato", () => {
    const casos: unknown[] = [
      { versao: 2, profissionais: [bruto()] },
      { versao: 1, profissionais: [] },
      { versao: 1, profissionais: [bruto(), bruto()] },
      { versao: 1, profissionais: [bruto({ id: "a/b" })] },
      { versao: 1, profissionais: [bruto({ nome: "" })] },
      { versao: 1, profissionais: [bruto({ fotoOrigemWixId: ["https://static.wixstatic.com/media/x.jpg"] })] },
      { versao: 1, profissionais: [bruto({ revisar: "texto" })] },
    ];
    for (const caso of casos) assert.equal(validarProfissionaisOrigem(caso).ok, false, JSON.stringify(caso).slice(0, 60));
  });

  test("as mensagens de erro citam a posição, não o nome", () => {
    const resultado = validarProfissionaisOrigem({ versao: 1, profissionais: [bruto({ id: "a/b" })] });
    assert.equal(resultado.ok, false);
    assert.doesNotMatch(!resultado.ok ? resultado.erros.join(" ") : "", /Fictícia|pessoa-ficticia/);
  });
});

describe("Conversão para o modelo atual", () => {
  test("registro completo: só os campos do modelo, ativo false, ordem do arquivo, sem problemas", () => {
    const { dados, problemas } = converterProfissional(registro());
    assert.deepEqual(problemas, []);
    assert.deepEqual(dados, {
      tipo: "Fisioterapeutas",
      tratamento: "Dra.",
      nome: "Pessoa Fictícia",
      registro: "Crefito Registro de exemplo",
      metodos: ["Schroth ISST", "BSPTS Conceito Rigo"],
      pais: "BR",
      uf: "SP",
      cidades: ["Cidade Exemplo"],
      telerreabilitacao: false,
      whatsapp: "5511912345678",
      instagram: "perfil.exemplo",
      facebook: "https://www.facebook.com/pagina.exemplo",
      email: "contato@exemplo.invalid",
      bio: "Apresentação de exemplo.",
      ativo: false,
      ordem: 7,
      fotoMidiaId: null,
    });
  });

  test("tipos do arquivo pela tabela; desconhecido fica vazio e marcado", () => {
    const tipos = { fisioterapeuta: "Fisioterapeutas", medico: "Médicos", ortesista: "Ortesistas", psicologo: "Psicólogos", outro: "Outros" };
    for (const [doArquivo, doModelo] of Object.entries(tipos)) assert.equal(converterProfissional(registro({ tipo: doArquivo })).dados.tipo, doModelo);
    const desconhecido = converterProfissional(registro({ tipo: "nutricionista" }));
    assert.equal(desconhecido.dados.tipo, "");
    assert.ok(desconhecido.problemas.includes("tipoDesconhecido"));
  });

  test("métodos pela tabela explícita; o que não casa sai e marca", () => {
    const { dados, problemas } = converterProfissional(registro({ metodos: ["SSOL Schroth", "Lyon", "SEAS", "Método Inventado"] }));
    assert.deepEqual(dados.metodos, ["SEAS", "SSOL", "Lyon"]);
    assert.ok(problemas.includes("metodoSemCorrespondencia"));
  });

  test("país pela lista; fora dela fica vazio e marcado; UF só no Brasil", () => {
    assert.deepEqual([converterProfissional(registro({ pais: "Paraguai", uf: null })).dados.pais, converterProfissional(registro({ pais: "Bolívia", uf: "SP" })).dados.uf], ["PY", ""]);
    const fora = converterProfissional(registro({ pais: "Argentina" }));
    assert.equal(fora.dados.pais, "");
    assert.ok(fora.problemas.includes("paisForaDaLista"));
    const semUf = converterProfissional(registro({ uf: null }));
    assert.equal(semUf.dados.uf, "");
    assert.ok(semUf.problemas.includes("ufAusenteOuInvalida"));
  });

  test("contatos pela validação do painel: inválido fica vazio e marcado, sem correção", () => {
    const { dados, problemas } = converterProfissional(
      registro({ whatsapp: "whats.link/exemplo", instagram: "https://www.instagram.com/p/abc", facebook: "https://www.facebook.com/sharer.php", email: "sem-arroba" }),
    );
    assert.deepEqual([dados.whatsapp, dados.instagram, dados.facebook, dados.email], ["", "", "", ""]);
    for (const problema of ["whatsappInvalido", "instagramInvalido", "facebookInvalido", "emailInvalido", "semContato"]) assert.ok(problemas.includes(problema as never), problema);
  });

  test("WhatsApp sem código do país ganha o do país, como no painel", () => {
    assert.equal(converterProfissional(registro({ whatsapp: "11912345678" })).dados.whatsapp, "5511912345678");
  });

  test("sem cidade e sem telerreabilitação: marca semLocal", () => {
    assert.ok(converterProfissional(registro({ cidades: [], telerreabilitacao: false })).problemas.includes("semLocal"));
    assert.deepEqual(converterProfissional(registro({ cidades: [], telerreabilitacao: true })).problemas, []);
  });

  test("acima dos limites do painel: campo vazio e marcado (nada é cortado)", () => {
    const { dados, problemas } = converterProfissional(registro({ bio: "x".repeat(1001), registro: "Crefito ".concat("r".repeat(60)), ordem: 1000 }));
    assert.deepEqual([dados.bio, dados.registro, dados.ordem], ["", "", 0]);
    for (const problema of ["bioLonga", "registroLongo", "ordemInvalida"]) assert.ok(problemas.includes(problema as never), problema);
  });

  test("registro com o conselho do arquivo na frente; já com o conselho, como veio", () => {
    assert.deepEqual(
      [converterProfissional(registro({ registro: "12345" })).dados.registro, converterProfissional(registro({ conselho: "CRM", registro: "54321-SP" })).dados.registro, converterProfissional(registro({ conselho: "CRP", registro: "06/1" })).dados.registro],
      ["Crefito 12345", "CRM 54321-SP", "CRP 06/1"],
    );
    const comoVeio = converterProfissional(registro({ registro: "Crefito-3/0000-F" }));
    assert.equal(comoVeio.dados.registro, "Crefito-3/0000-F");
    assert.equal(comoVeio.registroComo, "comoVeio");
    assert.equal(converterProfissional(registro({ registro: "12345" })).registroComo, "prefixado");
  });

  test("registro sem conselho no arquivo: vazio e marcado, nunca número solto; sem registro, vazio", () => {
    const semConselho = converterProfissional(registro({ conselho: null, registro: "12345" }));
    assert.equal(semConselho.dados.registro, "");
    assert.equal(semConselho.registroComo, "semConselho");
    assert.ok(semConselho.problemas.includes("registroSemConselho"));
    const semRegistro = converterProfissional(registro({ registro: null }));
    assert.equal(semRegistro.dados.registro, "");
    assert.equal(semRegistro.registroComo, "semRegistro");
    assert.deepEqual(semRegistro.problemas, []);
  });

  test("conselho deduzido pelo tipo (nota do arquivo): registro vazio e marcado", () => {
    const { dados, problemas, registroComo } = converterProfissional(registro({ registro: "12345", revisar: ["registro sem a palavra Crefito; conselho assumido pelo tipo de profissional"] }));
    assert.equal(dados.registro, "");
    assert.equal(registroComo, "conselhoAssumido");
    assert.ok(problemas.includes("conselhoAssumido"));
  });

  test("duas fotos: marca fotoDupla", () => {
    assert.ok(converterProfissional(registro({ fotoOrigemWixId: [`7dce06_${HEX}~mv2.jpg`, `3b1f25_${HEX}.jpg`] })).problemas.includes("fotoDupla"));
  });
});
