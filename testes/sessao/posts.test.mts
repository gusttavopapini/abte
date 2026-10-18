// Testes da capa dos posts (capaMidiaId) nos emuladores de Firestore e
// Storage (npm run test:sessao). Usam as mesmas funções que as ações de
// servidor chamam (gravacao/posts.ts e biblioteca.ts). Dados de exemplo,
// marcados como TESTE. Nada aqui toca o projeto real.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { COLECAO_POSTS, MENSAGEM_CAPA_INDISPONIVEL, gravarPost, type DadosDoPost } from "../../src/lib/gravacao/posts.ts";
import type { AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { enviarImagem, listarUsos, moverParaLixeiraOuRestaurar, type ServicosDeMidia } from "../../src/lib/midia/biblioteca.ts";

let app: App;
let db: Firestore;
let servicos: ServicosDeMidia;
const EDITOR: AutorDaAlteracao = { uid: "teste-posts-editor", nome: "TESTE Editor", papel: "editor" };

function post(titulo: string, capaMidiaId: string | null): DadosDoPost {
  return { titulo, conteudo: "Conteúdo de teste.", status: "publicado", slug: titulo.toLowerCase().replaceAll(" ", "-"), capaMidiaId };
}

// Imagem fictícia de uma cor só, sem pessoas.
async function novaImagem(alt: string): Promise<string> {
  const bytes = await sharp({ create: { width: 1280, height: 720, channels: 3, background: { r: 120, g: 180, b: 220 } } }).jpeg().toBuffer();
  const envio = await enviarImagem(servicos, { bytes, alt, indicaMenor: false, autorizacaoConfirmada: false }, EDITOR);
  assert.ok(envio.ok);
  return envio.id;
}

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: "demo-abte-sessao" }, "testes-posts");
  db = getFirestore(app);
  servicos = { db, bucket: getStorage(app).bucket("demo-abte-sessao.appspot.com") };
});

after(async () => {
  await deleteApp(app);
});

describe("Capa do post", () => {
  test("post novo com capa da biblioteca grava só o id, sem o campo antigo", async () => {
    const capa = await novaImagem("Capa de teste azul");
    const gravado = await gravarPost(db, null, post("TESTE Post Com Capa", capa));
    assert.ok(gravado.ok);
    const documento = (await db.collection(COLECAO_POSTS).doc(gravado.id).get()).data();
    assert.equal(documento?.capaMidiaId, capa);
    assert.equal("imagem" in (documento ?? {}), false);
  });

  test("capa inexistente ou na lixeira é recusada e nada é gravado", async () => {
    const naLixeira = await novaImagem("Capa de teste na lixeira");
    await moverParaLixeiraOuRestaurar(servicos, naLixeira, true, EDITOR);
    const antes = (await db.collection(COLECAO_POSTS).count().get()).data().count;
    for (const capa of ["naoExisteTeste123", naLixeira]) {
      assert.deepEqual(await gravarPost(db, null, post("TESTE Recusado", capa)), { ok: false, mensagem: MENSAGEM_CAPA_INDISPONIVEL, campo: "capaMidiaId" });
    }
    assert.equal((await db.collection(COLECAO_POSTS).count().get()).data().count, antes);
  });

  test("editar post antigo não apaga a capa antiga (endereço); a capa da biblioteca fica ao lado", async () => {
    const referencia = await db.collection(COLECAO_POSTS).add({ titulo: "TESTE Post Antigo", imagem: "https://exemplo.invalid/capa.jpg", conteudo: "x", status: "publicado", slug: "teste-post-antigo" });
    assert.ok((await gravarPost(db, referencia.id, post("TESTE Post Antigo", null))).ok);
    assert.equal((await referencia.get()).get("imagem"), "https://exemplo.invalid/capa.jpg");

    const capa = await novaImagem("Capa nova de teste");
    assert.ok((await gravarPost(db, referencia.id, post("TESTE Post Antigo", capa))).ok);
    const documento = (await referencia.get()).data();
    assert.equal(documento?.capaMidiaId, capa);
    assert.equal(documento?.imagem, "https://exemplo.invalid/capa.jpg", "valor antigo preservado");

    // A capa gravada vai para a lixeira: editar o resto continua possível.
    await moverParaLixeiraOuRestaurar(servicos, capa, true, EDITOR);
    assert.ok((await gravarPost(db, referencia.id, { ...post("TESTE Post Antigo", capa), conteudo: "Revisado." })).ok);
  });

  test("post inexistente: recusa", async () => {
    assert.deepEqual(await gravarPost(db, "naoExisteTeste", post("TESTE", null)), { ok: false, mensagem: "Post não encontrado." });
  });

  test("imagem em uso: lista o post pelo título", async () => {
    const capa = await novaImagem("Capa de teste compartilhada");
    assert.ok((await gravarPost(db, null, post("TESTE Post Em Uso", capa))).ok);
    assert.deepEqual(await listarUsos(db, capa), [{ rotulo: "Posts do blog (capa)", registros: ["TESTE Post Em Uso"] }]);
  });
});
