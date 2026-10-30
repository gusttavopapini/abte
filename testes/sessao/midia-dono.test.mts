// Envio de imagem pelo formulário de cada item (29/10/2026), nos emuladores
// (npm run test:sessao, projeto demo, nada toca o projeto real). As ações de
// servidor só conferem sessão e papel ("midia.enviar") e chamam a
// biblioteca; aqui: a decisão com sessões reais, a gravação do dono por tipo
// de item, o vínculo ao salvar um item novo e o "Usada em" da biblioteca.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { decidirAcessoAoPainel } from "../../src/lib/auth/papeis.ts";
import { verificarCookieDeSessao } from "../../src/lib/auth/verificacao.ts";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { COLECAO_MIDIAS, completarDonoDasMidias, enviarImagem, mapaDeUsos, type ServicosDeMidia } from "../../src/lib/midia/biblioteca.ts";
import { CAMPOS_POR_TIPO_DE_DONO, lerDono, type TipoDeDono } from "../../src/lib/midia/dono.ts";

const HOST_AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST;
let app: App;
// O login do emulador responde pelo projeto do npm run test:sessao; os dados
// deste arquivo ficam num projeto só dele.
let appDoLogin: App;
let auth: Auth;
let db: Firestore;
let servicos: ServicosDeMidia;

const EDITOR: AutorDaAlteracao = { uid: "teste-dono-editor", nome: "TESTE Editor", papel: "editor" };

// Imagem fictícia (uma cor só, sem pessoas).
function imagemDeTeste() {
  return sharp({ create: { width: 640, height: 360, channels: 3, background: { r: 40, g: 140, b: 90 } } }).jpeg().toBuffer();
}

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

async function sessaoDe(email: string, papel?: string) {
  const usuario = await auth.createUser({ email, password: "senha-de-teste" });
  if (papel) await auth.setCustomUserClaims(usuario.uid, { papel });
  return verificarCookieDeSessao(auth, await auth.createSessionCookie(await entrar(email, "senha-de-teste"), { expiresIn: 60 * 60 * 1000 }));
}

async function enviarCom(tipo: TipoDeDono, id: string, campo: string) {
  const dono = lerDono(tipo, id, campo);
  assert.ok(dono.ok);
  const resultado = await enviarImagem(servicos, { bytes: await imagemDeTeste(), alt: `Imagem de teste de ${tipo}`, indicaMenor: false, autorizacaoConfirmada: false, dono: dono.dono }, EDITOR);
  assert.ok(resultado.ok, resultado.ok ? "" : resultado.mensagem);
  return resultado.id;
}

before(() => {
  assert.ok(HOST_AUTH && process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: "demo-abte-dono" }, "testes-midia-dono");
  appDoLogin = initializeApp({ projectId: "demo-abte-sessao" }, "testes-midia-dono-login");
  auth = getAuth(appDoLogin);
  db = getFirestore(app);
  servicos = { db, bucket: getStorage(app).bucket("demo-abte-dono.appspot.com") };
});

after(async () => {
  await deleteApp(app);
  await deleteApp(appDoLogin);
});

describe("Envio pelo formulário de cada item: sessão e papel", () => {
  test("sem sessão e sem papel: recusa; editor e administrador enviam", async () => {
    assert.deepEqual(decidirAcessoAoPainel(await verificarCookieDeSessao(auth, undefined), "midia.enviar"), { permitido: false, motivo: "sem-sessao" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-dono-sem-papel@exemplo.invalid"), "midia.enviar"), { permitido: false, motivo: "sem-papel" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-dono-editor@exemplo.invalid", "editor"), "midia.enviar"), { permitido: true, papel: "editor" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-dono-admin@exemplo.invalid", "administrador"), "midia.enviar"), { permitido: true, papel: "administrador" });
  });
});

describe("Envio pelo formulário de cada item: gravação", () => {
  test("cada tipo de item grava o próprio dono, com registro que cita o campo", async () => {
    for (const [tipo, campos] of Object.entries(CAMPOS_POR_TIPO_DE_DONO) as [TipoDeDono, readonly string[]][]) {
      const idDoItem = tipo === "home" ? "secao-teste" : `item-${tipo}`;
      const id = await enviarCom(tipo, idDoItem, campos[0]);
      const documento = (await db.collection(COLECAO_MIDIAS).doc(id).get()).data();
      assert.deepEqual(documento?.dono, { tipo, id: idDoItem, campo: campos[0] }, tipo);
      assert.equal(documento?.alt, `Imagem de teste de ${tipo}`);
      const registros = await db.collection(COLECAO_LOG).where("documentoId", "==", id).get();
      assert.equal(registros.size, 1);
      assert.deepEqual(registros.docs[0].get("campos"), ["alt", "variantes", "indicaMenor", "dono"]);
    }
  });

  test("envio sem dono (biblioteca) não grava o campo", async () => {
    const resultado = await enviarImagem(servicos, { bytes: await imagemDeTeste(), alt: "Imagem de teste da biblioteca", indicaMenor: false, autorizacaoConfirmada: false }, EDITOR);
    assert.ok(resultado.ok);
    assert.equal((await db.collection(COLECAO_MIDIAS).doc(resultado.id).get()).get("dono"), undefined);
  });

  test("sem texto alternativo, nada é gravado", async () => {
    const antes = (await db.collection(COLECAO_MIDIAS).where("enviadoPor", "==", EDITOR.uid).get()).size;
    const resultado = await enviarImagem(servicos, { bytes: await imagemDeTeste(), alt: "  ", indicaMenor: false, autorizacaoConfirmada: false, dono: { tipo: "post", id: null, campo: "capa" } }, EDITOR);
    assert.deepEqual(resultado, { ok: false, mensagem: "Descreva a imagem no texto alternativo.", campo: "alt" });
    assert.equal((await db.collection(COLECAO_MIDIAS).where("enviadoPor", "==", EDITOR.uid).get()).size, antes);
  });

  test("item novo: ao salvar, só as imagens dele (mesmo tipo e campo, sem id) recebem o id", async () => {
    const daCapa = await enviarCom("post", "", "capa");
    const doTexto = await enviarCom("post", "", "corpo");
    const deOutroItem = await enviarCom("post", "outro-post", "capa");
    const semDono = (await enviarImagem(servicos, { bytes: await imagemDeTeste(), alt: "Sem dono", indicaMenor: false, autorizacaoConfirmada: false }, EDITOR));
    assert.ok(semDono.ok);

    const ligadas = await completarDonoDasMidias(db, [daCapa, doTexto, deOutroItem, semDono.id, "inexistente"], "post", "capa", "post-novo", EDITOR);
    assert.equal(ligadas, 1);
    assert.deepEqual((await db.collection(COLECAO_MIDIAS).doc(daCapa).get()).get("dono"), { tipo: "post", id: "post-novo", campo: "capa" });
    assert.deepEqual((await db.collection(COLECAO_MIDIAS).doc(doTexto).get()).get("dono"), { tipo: "post", id: null, campo: "corpo" });
    assert.deepEqual((await db.collection(COLECAO_MIDIAS).doc(deOutroItem).get()).get("dono"), { tipo: "post", id: "outro-post", campo: "capa" });
    assert.equal((await db.collection(COLECAO_MIDIAS).doc(semDono.id).get()).get("dono"), undefined);

    const registros = await db.collection(COLECAO_LOG).where("documentoId", "==", daCapa).get();
    assert.deepEqual(registros.docs.map((registro) => registro.get("resumo")).sort(), ["Imagem enviada pelo formulário de um item.", "Imagem ligada ao item salvo."]);
    assert.equal(await completarDonoDasMidias(db, [daCapa], "post", "capa", "post-novo", EDITOR), 0, "repetir não muda nada");
  });

  test("Usada em: a biblioteca acha a imagem no item que a usa", async () => {
    const id = await enviarCom("artigo", "", "imagem");
    await db.collection("artigos").doc("artigo-dono-teste").set({ titulo: "Artigo de teste", imagemMidiaId: id, excluidoEm: null });
    const usos = await mapaDeUsos(db);
    assert.deepEqual(usos.get(id), [{ rotulo: "Artigos (imagem)", nome: "Artigo de teste", naLixeira: false }]);
  });
});
