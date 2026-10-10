// Testes de sessão e permissão no emulador de Authentication e Firestore
// (npm run test:sessao). Provam que um cliente da loja NUNCA entra no painel
// e que sessões revogadas ou adulteradas são recusadas.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { decidirAcessoAoPainel } from "../../src/lib/auth/papeis.ts";
import { verificarCookieDeSessao } from "../../src/lib/auth/verificacao.ts";
import { COLECAO_CARRINHOS, COLECAO_CLIENTES, criarContaDeCliente, ehClienteDaLoja, excluirContaDeCliente } from "../../src/lib/loja/contas.ts";

const HOST_AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST;
let app: App;
let auth: Auth;
let db: Firestore;

// Login como o navegador faria (no emulador), devolvendo o token de ID.
async function entrar(email: string, senha: string): Promise<string> {
  const resposta = await fetch(`http://${HOST_AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=chave-de-teste`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: senha, returnSecureToken: true }),
  });
  const corpo = (await resposta.json()) as { idToken?: string };
  assert.ok(corpo.idToken, "login no emulador falhou");
  return corpo.idToken;
}

async function cookieDe(email: string, senha: string) {
  return auth.createSessionCookie(await entrar(email, senha), { expiresIn: 60 * 60 * 1000 });
}

async function usuarioDoPainel(email: string, papel: string) {
  const usuario = await auth.createUser({ email, password: "senha-de-teste" });
  await auth.setCustomUserClaims(usuario.uid, { papel });
  return usuario;
}

before(() => {
  assert.ok(HOST_AUTH && process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: "demo-abte-sessao" }, "testes-sessao");
  auth = getAuth(app);
  db = getFirestore(app);
});

after(async () => {
  await deleteApp(app);
});

describe("Acesso ao painel", () => {
  test("sem cookie: sem sessão", async () => {
    const sessao = await verificarCookieDeSessao(auth, undefined);
    assert.equal(sessao, null);
    assert.deepEqual(decidirAcessoAoPainel(sessao), { permitido: false, motivo: "sem-sessao" });
  });

  test("cookie adulterado: sem sessão", async () => {
    assert.equal(await verificarCookieDeSessao(auth, "cookie.falso.qualquer"), null);
  });

  test("cliente da loja tentando o painel: recusado (sem papel)", async () => {
    const criacao = await criarContaDeCliente({ auth, db }, { nome: "TESTE Cliente", email: "teste-cliente@exemplo.invalid", senha: "senha-de-teste" });
    assert.equal(criacao.ok, true);
    if (!criacao.ok) return;
    const usuario = await auth.getUser(criacao.uid);
    assert.equal(usuario.customClaims?.papel, undefined, "cliente não pode ter a claim papel");

    const sessao = await verificarCookieDeSessao(auth, await cookieDe("teste-cliente@exemplo.invalid", "senha-de-teste"));
    assert.ok(sessao, "a sessão do cliente é válida");
    assert.deepEqual(decidirAcessoAoPainel(sessao), { permitido: false, motivo: "sem-papel" });
    assert.equal(await ehClienteDaLoja(db, criacao.uid), true);
  });

  test("editor e administrador entram no painel, mas não são clientes da loja", async () => {
    for (const papel of ["editor", "administrador"]) {
      const usuario = await usuarioDoPainel(`teste-${papel}@exemplo.invalid`, papel);
      const sessao = await verificarCookieDeSessao(auth, await cookieDe(`teste-${papel}@exemplo.invalid`, "senha-de-teste"));
      assert.deepEqual(decidirAcessoAoPainel(sessao), { permitido: true, papel });
      assert.equal(await ehClienteDaLoja(db, usuario.uid), false, `${papel} não usa a sessão da loja`);
    }
  });

  test("sessão revogada (Sair ou troca de senha): recusada", async () => {
    await usuarioDoPainel("teste-revogado@exemplo.invalid", "administrador");
    const cookie = await cookieDe("teste-revogado@exemplo.invalid", "senha-de-teste");
    assert.ok(await verificarCookieDeSessao(auth, cookie));
    // A revogação vale para tokens emitidos antes do segundo atual.
    await new Promise((resolver) => setTimeout(resolver, 1100));
    const { uid } = await auth.getUserByEmail("teste-revogado@exemplo.invalid");
    await auth.revokeRefreshTokens(uid);
    assert.equal(await verificarCookieDeSessao(auth, cookie), null);
  });
});

describe("Conta de cliente", () => {
  test("e-mail repetido não cria outra conta", async () => {
    const resultado = await criarContaDeCliente({ auth, db }, { nome: "TESTE", email: "teste-cliente@exemplo.invalid", senha: "senha-de-teste" });
    assert.deepEqual(resultado, { ok: false, motivo: "email-em-uso" });
  });

  test("dados mínimos no Firestore, sem senha", async () => {
    const { uid } = await auth.getUserByEmail("teste-cliente@exemplo.invalid");
    const dados = (await db.collection(COLECAO_CLIENTES).doc(uid).get()).data() ?? {};
    assert.deepEqual(Object.keys(dados).sort(), ["consentimentoEm", "criadoEm", "email", "nome", "versaoDoConsentimento"]);
  });

  test("excluir a conta apaga usuário, dados e carrinho, e derruba a sessão", async () => {
    const { uid } = await auth.getUserByEmail("teste-cliente@exemplo.invalid");
    const cookie = await cookieDe("teste-cliente@exemplo.invalid", "senha-de-teste");
    await db.collection(COLECAO_CARRINHOS).doc(uid).set({ itens: [{ produtoId: "x", quantidade: 1 }] });
    await excluirContaDeCliente({ auth, db }, uid);
    await assert.rejects(auth.getUser(uid));
    assert.equal((await db.collection(COLECAO_CLIENTES).doc(uid).get()).exists, false);
    assert.equal((await db.collection(COLECAO_CARRINHOS).doc(uid).get()).exists, false);
    assert.equal(await verificarCookieDeSessao(auth, cookie), null);
  });
});
