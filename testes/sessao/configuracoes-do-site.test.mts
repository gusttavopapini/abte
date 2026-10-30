// Configurações do site (30/10/2026) nos emuladores (npm run test:sessao;
// projeto demo, nada toca o projeto real): permissão com sessões reais (só
// administrador) e a gravação em configuracoes/site com o registro.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { decidirAcessoAoPainel } from "../../src/lib/auth/papeis.ts";
import { verificarCookieDeSessao } from "../../src/lib/auth/verificacao.ts";
import { salvarArtigosAtivo } from "../../src/lib/gravacao/site.ts";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { lerConfiguracaoDoSite } from "../../src/lib/site/configuracoes.ts";

const HOST_AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST;
let app: App;
let appDoLogin: App;
let auth: Auth;
let db: Firestore;
const ADMINISTRADOR: AutorDaAlteracao = { uid: "teste-site-admin", nome: "TESTE Administrador", papel: "administrador" };

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

before(() => {
  assert.ok(HOST_AUTH && process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: "demo-abte-site" }, "testes-site");
  appDoLogin = initializeApp({ projectId: "demo-abte-sessao" }, "testes-site-login");
  auth = getAuth(appDoLogin);
  db = getFirestore(app);
});

after(async () => {
  await deleteApp(app);
  await deleteApp(appDoLogin);
});

describe("Configurações do site: sessão e papel", () => {
  test("sem sessão, sem papel e editor recusados; administrador altera", async () => {
    assert.deepEqual(decidirAcessoAoPainel(await verificarCookieDeSessao(auth, undefined), "configuracoes.editar"), { permitido: false, motivo: "sem-sessao" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-site-sem-papel@exemplo.invalid"), "configuracoes.editar"), { permitido: false, motivo: "sem-papel" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-site-editor@exemplo.invalid", "editor"), "configuracoes.editar"), { permitido: false, motivo: "sem-permissao" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-site-admin@exemplo.invalid", "administrador"), "configuracoes.editar"), { permitido: true, papel: "administrador" });
  });
});

describe("Configurações do site: Artigos no site", () => {
  test("sem documento vale o padrão; esconder e exibir gravam com registro só do nome do campo", async () => {
    assert.equal(lerConfiguracaoDoSite((await db.collection("configuracoes").doc("site").get()).data()).artigosAtivo, true);
    assert.deepEqual(await salvarArtigosAtivo(db, false, ADMINISTRADOR), { ok: true, mudou: true });
    assert.equal((await db.collection("configuracoes").doc("site").get()).get("artigosAtivo"), false);
    assert.deepEqual(await salvarArtigosAtivo(db, false, ADMINISTRADOR), { ok: true, mudou: false });
    assert.deepEqual(await salvarArtigosAtivo(db, true, ADMINISTRADOR), { ok: true, mudou: true });
    const linhas = (await db.collection(COLECAO_LOG).where("documentoId", "==", "site").get()).docs.map((d) => d.data()).sort((a, b) => a.criadoEm.toMillis() - b.criadoEm.toMillis());
    assert.deepEqual(
      linhas.map((linha) => [linha.colecao, linha.campos, linha.resumo, linha.usuarioId]),
      [
        ["configuracoes", ["artigosAtivo"], "Artigos escondidos do site.", ADMINISTRADOR.uid],
        ["configuracoes", [], "Configuração dos Artigos salva sem alterações.", ADMINISTRADOR.uid],
        ["configuracoes", ["artigosAtivo"], "Artigos exibidos no site.", ADMINISTRADOR.uid],
      ],
    );
  });
});
