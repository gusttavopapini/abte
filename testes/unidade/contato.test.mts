// Formulário de contato (08/11/2026): validação no servidor, envio repetido,
// permissão do painel e a checagem de papel das ações.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { decidirAcessoAoPainel, papelPodeExecutar } from "../../src/lib/auth/papeis.ts";
import { INTERVALO_ENTRE_ENVIOS_MS, LIMITES_DO_CONTATO, dataHoraDaMensagem, envioMuitoRecente, validarMensagemDeContato } from "../../src/lib/contato.ts";

const VALIDA = { nome: " Maria ", sobrenome: "Exemplo", email: " Maria@Exemplo.INVALID ", assunto: "Dúvida", mensagem: "Olá,\r\n\r\n\r\n\r\nquero saber mais.  ", consentimento: true };

describe("Validação da mensagem de contato", () => {
  test("mensagem válida volta normalizada (e-mail em minúsculas, espaços e linhas em branco reduzidos)", () => {
    const lido = validarMensagemDeContato(VALIDA);
    assert.ok(lido.ok);
    assert.deepEqual(lido.dados, { nome: "Maria", sobrenome: "Exemplo", email: "maria@exemplo.invalid", assunto: "Dúvida", mensagem: "Olá,\n\nquero saber mais.", consentimento: true });
  });

  test("assunto é opcional; o resto é obrigatório", () => {
    assert.equal(validarMensagemDeContato({ ...VALIDA, assunto: "" }).ok, true);
    const lido = validarMensagemDeContato({ nome: "", sobrenome: "  ", email: "", assunto: "", mensagem: "\n \n", consentimento: false });
    assert.equal(lido.ok, false);
    if (!lido.ok) assert.deepEqual(Object.keys(lido.erros).sort(), ["consentimento", "email", "mensagem", "nome", "sobrenome"]);
  });

  test("e-mail inválido e consentimento só com sim, on ou true", () => {
    for (const email of ["sem-arroba", "a@b", "nome @exemplo.com", `${"a".repeat(250)}@exemplo.com`]) {
      const lido = validarMensagemDeContato({ ...VALIDA, email });
      assert.equal(lido.ok, false, email);
      if (!lido.ok) assert.ok(lido.erros.email, email);
    }
    for (const consentimento of ["sim", "on", true]) assert.equal(validarMensagemDeContato({ ...VALIDA, consentimento }).ok, true);
    for (const consentimento of [false, "não", "", undefined, null, 1]) assert.equal(validarMensagemDeContato({ ...VALIDA, consentimento }).ok, false);
  });

  test("limites de tamanho, com mensagem em português", () => {
    for (const campo of ["nome", "sobrenome", "assunto", "mensagem"] as const) {
      const lido = validarMensagemDeContato({ ...VALIDA, [campo]: "a".repeat(LIMITES_DO_CONTATO[campo] + 1) });
      assert.equal(lido.ok, false, campo);
      if (!lido.ok) assert.match(lido.erros[campo] ?? "", /no máximo/, campo);
      assert.equal(validarMensagemDeContato({ ...VALIDA, [campo]: "a".repeat(LIMITES_DO_CONTATO[campo]) }).ok, true, campo);
    }
  });

  test("valores que não são texto valem como vazios; caracteres de controle saem", () => {
    const lido = validarMensagemDeContato({ ...VALIDA, nome: ["Maria"], assunto: { a: 1 } });
    assert.equal(lido.ok, false);
    if (!lido.ok) assert.ok(lido.erros.nome);
    const limpo = validarMensagemDeContato({ ...VALIDA, nome: "Ma\u0000ria", mensagem: "linha\u0007 um" });
    assert.ok(limpo.ok);
    if (limpo.ok) {
      assert.equal(limpo.dados.nome, "Ma ria");
      assert.equal(limpo.dados.mensagem, "linha um");
    }
  });
});

describe("Envio repetido", () => {
  test("o mesmo e-mail espera um minuto", () => {
    const agora = 1_000_000_000;
    assert.equal(envioMuitoRecente([], agora), false);
    assert.equal(envioMuitoRecente([agora - 1000], agora), true);
    assert.equal(envioMuitoRecente([agora - INTERVALO_ENTRE_ENVIOS_MS + 1], agora), true);
    assert.equal(envioMuitoRecente([agora - INTERVALO_ENTRE_ENVIOS_MS], agora), false);
    assert.equal(envioMuitoRecente([NaN, agora - 5 * INTERVALO_ENTRE_ENVIOS_MS], agora), false);
  });
});

describe("Data da mensagem no painel", () => {
  test("horário de Brasília; sem data, o aviso", () => {
    assert.equal(dataHoraDaMensagem("2026-11-08T12:05:00.000Z"), "08/11/2026, 09:05");
    assert.equal(dataHoraDaMensagem(null), "data desconhecida");
    assert.equal(dataHoraDaMensagem("x"), "data desconhecida");
  });
});

describe("Mensagens no painel: permissão", () => {
  test("só administrador lê e marca como lida", () => {
    assert.equal(papelPodeExecutar("administrador", "mensagens.ler"), true);
    assert.equal(papelPodeExecutar("editor", "mensagens.ler"), false);
    assert.deepEqual(decidirAcessoAoPainel({ papel: "editor" }, "mensagens.ler"), { permitido: false, motivo: "sem-permissao" });
    assert.deepEqual(decidirAcessoAoPainel(null, "mensagens.ler"), { permitido: false, motivo: "sem-sessao" });
  });

  test("toda ação de acoes-mensagens começa por exigirPapelDoPainel(\"mensagens.ler\")", () => {
    const codigo = readFileSync("src/app/admin/acoes-mensagens.ts", "utf8");
    const acoes = [...codigo.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{\s*([^\n]*)/g)];
    assert.ok(acoes.length >= 1);
    for (const [, nome, primeira] of acoes) assert.match(primeira, /^const usuario = await exigirPapelDoPainel\("mensagens\.ler"\);$/, nome);
  });

  test("as telas do painel conferem a permissão antes de ler", () => {
    for (const arquivo of ["src/app/admin/(painel)/mensagens/page.tsx", "src/app/admin/(painel)/mensagens/[id]/page.tsx"]) {
      const codigo = readFileSync(arquivo, "utf8");
      const permissao = codigo.indexOf('papelPodeExecutar(usuario.papel, "mensagens.ler")');
      assert.ok(codigo.indexOf("await exigirPapelDoPainel()") >= 0 && permissao > 0, arquivo);
      assert.ok(permissao < codigo.indexOf("firestoreAdmin()"), arquivo);
    }
  });
});
