// Mensagens do formulário de contato (08/11/2026) nos emuladores (npm run
// test:sessao; projeto demo próprio, nada toca o projeto real): permissão
// com sessões reais (só administrador lê e marca), gravação com o envio
// repetido conferido no Firestore e "Marcar como lida" com o registro.
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { decidirAcessoAoPainel } from "../../src/lib/auth/papeis.ts";
import { verificarCookieDeSessao } from "../../src/lib/auth/verificacao.ts";
import { COLECAO_DE_MENSAGENS, INTERVALO_ENTRE_ENVIOS_MS, validarMensagemDeContato, type MensagemDeContatoValida } from "../../src/lib/contato.ts";
import { gravarMensagemDeContato, lerMensagemDeContato, listarMensagensDeContato, marcarMensagemComoLida } from "../../src/lib/gravacao/contato.ts";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";

const HOST_AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST;
let app: App;
let appDoLogin: App;
let auth: Auth;
let db: Firestore;
const ADMINISTRADOR: AutorDaAlteracao = { uid: "teste-contato-admin", nome: "TESTE Administrador", papel: "administrador" };

function mensagem(email: string, texto = "Mensagem de teste."): MensagemDeContatoValida {
  const lido = validarMensagemDeContato({ nome: "TESTE", sobrenome: "Exemplo", email, assunto: "Teste", mensagem: texto, consentimento: true });
  assert.ok(lido.ok);
  return lido.dados;
}

async function entrar(email: string): Promise<string> {
  const resposta = await fetch(`http://${HOST_AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=chave-de-teste`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "senha-de-teste", returnSecureToken: true }),
  });
  const corpo = (await resposta.json()) as { idToken?: string };
  assert.ok(corpo.idToken, "login no emulador falhou");
  return corpo.idToken;
}

async function sessaoDe(email: string, papel?: string) {
  const usuario = await auth.createUser({ email, password: "senha-de-teste" });
  if (papel) await auth.setCustomUserClaims(usuario.uid, { papel });
  return verificarCookieDeSessao(auth, await auth.createSessionCookie(await entrar(email), { expiresIn: 60 * 60 * 1000 }));
}

async function limpar() {
  for (const colecao of [COLECAO_DE_MENSAGENS, COLECAO_LOG]) {
    const documentos = await db.collection(colecao).get();
    await Promise.all(documentos.docs.map((documento) => documento.ref.delete()));
  }
}

before(() => {
  assert.ok(HOST_AUTH && process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: "demo-abte-contato" }, "testes-contato");
  appDoLogin = initializeApp({ projectId: "demo-abte-sessao" }, "testes-contato-login");
  auth = getAuth(appDoLogin);
  db = getFirestore(app);
});

beforeEach(limpar);

after(async () => {
  await deleteApp(app);
  await deleteApp(appDoLogin);
});

describe("Mensagens de contato: sessão e papel", () => {
  test("sem sessão, sem papel e editor recusados; administrador lê e marca", async () => {
    assert.deepEqual(decidirAcessoAoPainel(await verificarCookieDeSessao(auth, undefined), "mensagens.ler"), { permitido: false, motivo: "sem-sessao" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-contato-sem-papel@exemplo.invalid"), "mensagens.ler"), { permitido: false, motivo: "sem-papel" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-contato-editor@exemplo.invalid", "editor"), "mensagens.ler"), { permitido: false, motivo: "sem-permissao" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-contato-admin@exemplo.invalid", "administrador"), "mensagens.ler"), { permitido: true, papel: "administrador" });
  });
});

describe("Mensagens de contato: gravação", () => {
  test("grava com os campos do modelo, não lida; o mesmo e-mail espera um minuto", async () => {
    const agora = Date.now();
    const gravado = await gravarMensagemDeContato(db, mensagem("teste-contato@exemplo.invalid"), agora);
    assert.ok(gravado.ok);
    const documento = (await db.collection(COLECAO_DE_MENSAGENS).doc(gravado.id).get()).data() ?? {};
    assert.deepEqual(Object.keys(documento).sort(), ["assunto", "consentimento", "criadoEm", "email", "lida", "lidaEm", "lidaPor", "mensagem", "nome", "sobrenome"]);
    assert.equal(documento.lida, false);
    assert.equal(documento.consentimento, true);
    assert.equal(documento.criadoEm.toMillis(), agora);

    assert.deepEqual(await gravarMensagemDeContato(db, mensagem("teste-contato@exemplo.invalid", "De novo."), agora + 10_000), { ok: false, motivo: "repetida" });
    assert.equal((await gravarMensagemDeContato(db, mensagem("outro-contato@exemplo.invalid"), agora + 10_000)).ok, true, "outro e-mail não espera");
    assert.equal((await gravarMensagemDeContato(db, mensagem("teste-contato@exemplo.invalid", "Depois do intervalo."), agora + INTERVALO_ENTRE_ENVIOS_MS)).ok, true);
    assert.equal((await db.collection(COLECAO_DE_MENSAGENS).get()).size, 3);
    assert.equal((await db.collection(COLECAO_LOG).get()).size, 0, "o envio público não grava no registro");
  });

  test("lista do painel: as mais recentes primeiro, com as não lidas marcadas", async () => {
    const agora = Date.now();
    const primeira = await gravarMensagemDeContato(db, mensagem("a-contato@exemplo.invalid"), agora - 3000);
    const segunda = await gravarMensagemDeContato(db, mensagem("b-contato@exemplo.invalid"), agora - 2000);
    assert.ok(primeira.ok && segunda.ok);
    const lista = await listarMensagensDeContato(db);
    assert.deepEqual(lista.map((item) => [item.id, item.lida]), [[segunda.id, false], [primeira.id, false]]);
  });
});

describe("Mensagens de contato: marcar como lida", () => {
  test("marca uma vez, com uma linha no registro sem o conteúdo; repetir não registra", async () => {
    const gravado = await gravarMensagemDeContato(db, mensagem("teste-contato@exemplo.invalid", "Conteúdo que não vai ao registro."));
    assert.ok(gravado.ok);
    assert.deepEqual(await marcarMensagemComoLida(db, gravado.id, ADMINISTRADOR), { ok: true, mudou: true });
    const lida = await lerMensagemDeContato(db, gravado.id);
    assert.equal(lida?.lida, true);
    assert.ok(lida?.lidaEm);
    assert.equal((await db.collection(COLECAO_DE_MENSAGENS).doc(gravado.id).get()).get("lidaPor"), ADMINISTRADOR.uid);
    assert.deepEqual(await marcarMensagemComoLida(db, gravado.id, ADMINISTRADOR), { ok: true, mudou: false });
    const linhas = (await db.collection(COLECAO_LOG).get()).docs.map((documento) => documento.data());
    assert.deepEqual(linhas.map((linha) => [linha.colecao, linha.documentoId, linha.acao, linha.campos, linha.resumo, linha.usuarioId]), [
      [COLECAO_DE_MENSAGENS, gravado.id, "editar", ["lida"], "Mensagem de contato marcada como lida.", ADMINISTRADOR.uid],
    ]);
    assert.ok(!JSON.stringify(linhas).includes("Conteúdo que não vai"), "o registro não leva o texto da mensagem");
    assert.ok(!JSON.stringify(linhas).includes("exemplo.invalid"), "o registro não leva o e-mail");
  });

  test("id inválido ou inexistente: mensagem em português, nada gravado", async () => {
    assert.equal((await marcarMensagemComoLida(db, "../x", ADMINISTRADOR)).ok, false);
    const inexistente = await marcarMensagemComoLida(db, "naoExisteEsteId00001", ADMINISTRADOR);
    assert.equal(inexistente.ok, false);
    if (!inexistente.ok) assert.match(inexistente.mensagem, /não encontrada/);
    assert.equal((await db.collection(COLECAO_LOG).get()).size, 0);
    assert.equal(await lerMensagemDeContato(db, "../x"), null);
  });
});
