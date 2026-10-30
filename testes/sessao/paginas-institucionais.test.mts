// Páginas institucionais (30/10/2026) nos emuladores (npm run test:sessao;
// projeto demo): permissão com sessões reais e a gravação com o registro.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { decidirAcessoAoPainel } from "../../src/lib/auth/papeis.ts";
import { verificarCookieDeSessao } from "../../src/lib/auth/verificacao.ts";
import { salvarPaginaInstitucional } from "../../src/lib/gravacao/paginas.ts";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { lerPaginaInstitucional, paginaNoSite } from "../../src/lib/site/paginas.ts";

const HOST_AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST;
let app: App;
let appDoLogin: App;
let auth: Auth;
let db: Firestore;
const ADMINISTRADOR: AutorDaAlteracao = { uid: "teste-paginas-admin", nome: "TESTE Administrador", papel: "administrador" };

async function sessaoDe(email: string, papel?: string) {
  const usuario = await auth.createUser({ email, password: "senha-de-teste" });
  if (papel) await auth.setCustomUserClaims(usuario.uid, { papel });
  const resposta = await fetch(`http://${HOST_AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=chave-de-teste`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "senha-de-teste", returnSecureToken: true }),
  });
  const { idToken } = (await resposta.json()) as { idToken: string };
  return verificarCookieDeSessao(auth, await auth.createSessionCookie(idToken, { expiresIn: 60 * 60 * 1000 }));
}

before(() => {
  assert.ok(HOST_AUTH && process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: "demo-abte-paginas" }, "testes-paginas");
  appDoLogin = initializeApp({ projectId: "demo-abte-sessao" }, "testes-paginas-login");
  auth = getAuth(appDoLogin);
  db = getFirestore(app);
});

after(async () => {
  await deleteApp(app);
  await deleteApp(appDoLogin);
});

describe("Páginas institucionais: sessão e papel", () => {
  test("sem sessão, sem papel e editor recusados; administrador edita", async () => {
    assert.deepEqual(decidirAcessoAoPainel(await verificarCookieDeSessao(auth, undefined), "paginas.editar"), { permitido: false, motivo: "sem-sessao" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-paginas-sem-papel@exemplo.invalid"), "paginas.editar"), { permitido: false, motivo: "sem-papel" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-paginas-editor@exemplo.invalid", "editor"), "paginas.editar"), { permitido: false, motivo: "sem-permissao" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-paginas-admin@exemplo.invalid", "administrador"), "paginas.editar"), { permitido: true, papel: "administrador" });
  });
});

describe("Páginas institucionais: gravação", () => {
  test("cria como rascunho, publica e altera o texto, com registro só dos nomes", async () => {
    assert.deepEqual(await salvarPaginaInstitucional(db, "termos-de-uso", { titulo: "Termos de uso", corpo: "", publicada: false }, ADMINISTRADOR), { ok: true, nome: "Termos de uso", alterados: ["titulo"] });
    let lida = lerPaginaInstitucional("termos-de-uso", (await db.collection("paginasInstitucionais").doc("termos-de-uso").get()).data());
    assert.equal(paginaNoSite(lida), false);
    await salvarPaginaInstitucional(db, "termos-de-uso", { titulo: "Termos de uso", corpo: "Texto de teste fictício.", publicada: true }, ADMINISTRADOR);
    lida = lerPaginaInstitucional("termos-de-uso", (await db.collection("paginasInstitucionais").doc("termos-de-uso").get()).data());
    assert.equal(paginaNoSite(lida), true);
    assert.ok((await db.collection("paginasInstitucionais").doc("termos-de-uso").get()).get("atualizadaEm"));
    const linhas = (await db.collection(COLECAO_LOG).where("colecao", "==", "paginasInstitucionais").get()).docs.map((d) => d.data()).sort((a, b) => a.criadoEm.toMillis() - b.criadoEm.toMillis());
    assert.deepEqual(linhas.map((linha) => [linha.acao, linha.documentoId, linha.campos]), [
      ["criar", "termos-de-uso", ["titulo"]],
      ["editar", "termos-de-uso", ["corpo", "publicada"]],
    ]);
    for (const linha of linhas) assert.doesNotMatch(JSON.stringify(linha), /fictício/, "o registro não guarda o texto");
  });
});
