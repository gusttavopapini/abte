// Testes da imagem dos artigos e das categorias de artigos nos emuladores de
// Firestore e Storage (npm run test:sessao). Usam as mesmas funções que as
// ações de servidor chamam (gravacao/artigos.ts, gravacao/topicos.ts e
// biblioteca.ts). Dados de exemplo, marcados como TESTE. Nada aqui toca o
// projeto real.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { COLECAO_ARTIGOS, MENSAGEM_IMAGEM_INDISPONIVEL, MENSAGEM_TOPICO_INDISPONIVEL, gravarArtigo, type DadosDoArtigo } from "../../src/lib/gravacao/artigos.ts";
import { imagemDaCategoriaValida } from "../../src/lib/gravacao/topicos.ts";
import type { AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { enviarImagem, listarUsos, moverParaLixeiraOuRestaurar, type ServicosDeMidia } from "../../src/lib/midia/biblioteca.ts";

let app: App;
let db: Firestore;
let servicos: ServicosDeMidia;
let categoria: string;
let tag: string;
const EDITOR: AutorDaAlteracao = { uid: "teste-artigos-editor", nome: "TESTE Editor", papel: "editor" };

function artigo(titulo: string, imagemMidiaId: string | null, extra: Partial<DadosDoArtigo> = {}): DadosDoArtigo {
  return { titulo, categoria, tags: [tag], autores: "TESTE et al., 2026", link: "https://exemplo.invalid/estudo", resumo: "Resumo de teste.", status: "publicado", imagemMidiaId, ...extra };
}

// Imagem fictícia de uma cor só, sem pessoas.
async function novaImagem(alt: string): Promise<string> {
  const bytes = await sharp({ create: { width: 800, height: 450, channels: 3, background: { r: 90, g: 160, b: 120 } } }).jpeg().toBuffer();
  const envio = await enviarImagem(servicos, { bytes, alt, indicaMenor: false, autorizacaoConfirmada: false }, EDITOR);
  assert.ok(envio.ok);
  return envio.id;
}

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: "demo-abte-sessao" }, "testes-artigos");
  db = getFirestore(app);
  servicos = { db, bucket: getStorage(app).bucket("demo-abte-sessao.appspot.com") };
  categoria = (await db.collection("categoriasDeArtigos").add({ nome: "TESTE Categoria", slug: "teste-categoria", ordem: 0, excluidoEm: null })).id;
  tag = (await db.collection("tagsDeArtigos").add({ nome: "TESTE Tag", slug: "teste-tag", ordem: 0, excluidoEm: null })).id;
});

after(async () => {
  await deleteApp(app);
});

describe("Imagem do artigo", () => {
  test("artigo com imagem da biblioteca grava só o id", async () => {
    const imagem = await novaImagem("Imagem de teste do artigo");
    const gravado = await gravarArtigo(db, null, artigo("TESTE Artigo Com Imagem", imagem));
    assert.ok(gravado.ok);
    assert.equal((await db.collection(COLECAO_ARTIGOS).doc(gravado.id).get()).get("imagemMidiaId"), imagem);
  });

  test("imagem inexistente ou na lixeira é recusada e nada é gravado", async () => {
    const naLixeira = await novaImagem("Imagem de teste na lixeira");
    await moverParaLixeiraOuRestaurar(servicos, naLixeira, true, EDITOR);
    const antes = (await db.collection(COLECAO_ARTIGOS).count().get()).data().count;
    for (const imagem of ["naoExisteTeste123", naLixeira]) {
      assert.deepEqual(await gravarArtigo(db, null, artigo("TESTE Recusado", imagem)), { ok: false, mensagem: MENSAGEM_IMAGEM_INDISPONIVEL, campo: "imagemMidiaId" });
    }
    assert.equal((await db.collection(COLECAO_ARTIGOS).count().get()).data().count, antes);
  });

  test("categoria ou tag inexistente: recusa com mensagem em português", async () => {
    assert.deepEqual(await gravarArtigo(db, null, artigo("TESTE", null, { categoria: "naoExisteTeste" })), { ok: false, mensagem: MENSAGEM_TOPICO_INDISPONIVEL, campo: "categoria" });
    assert.deepEqual(await gravarArtigo(db, null, artigo("TESTE", null, { tags: ["naoExisteTeste"] })), { ok: false, mensagem: MENSAGEM_TOPICO_INDISPONIVEL, campo: "categoria" });
  });

  test("edição mantém a imagem que já estava, mesmo na lixeira", async () => {
    const imagem = await novaImagem("Imagem de teste para edição");
    const criado = await gravarArtigo(db, null, artigo("TESTE Edição", imagem));
    assert.ok(criado.ok);
    await moverParaLixeiraOuRestaurar(servicos, imagem, true, EDITOR);
    assert.ok((await gravarArtigo(db, criado.id, artigo("TESTE Edição revisada", imagem))).ok);
    assert.deepEqual(await gravarArtigo(db, "naoExisteTeste", artigo("TESTE", null)), { ok: false, mensagem: "Artigo não encontrado." });
  });
});

describe("Imagem da categoria de artigos", () => {
  test("só aceita imagem que existe e está fora da lixeira; a já gravada pode ficar", async () => {
    const imagem = await novaImagem("Imagem de teste da categoria");
    assert.equal(await imagemDaCategoriaValida(db, "categoriasDeArtigos", categoria, imagem), true);
    assert.equal(await imagemDaCategoriaValida(db, "categoriasDeArtigos", categoria, null), true);
    assert.equal(await imagemDaCategoriaValida(db, "categoriasDeArtigos", categoria, "naoExisteTeste"), false);
    await db.collection("categoriasDeArtigos").doc(categoria).update({ imagemMidiaId: imagem });
    await moverParaLixeiraOuRestaurar(servicos, imagem, true, EDITOR);
    assert.equal(await imagemDaCategoriaValida(db, "categoriasDeArtigos", categoria, imagem), true, "a mesma já gravada");
    const outra = await novaImagem("Outra imagem de teste");
    await moverParaLixeiraOuRestaurar(servicos, outra, true, EDITOR);
    assert.equal(await imagemDaCategoriaValida(db, "categoriasDeArtigos", categoria, outra), false, "nova, na lixeira");
  });

  test("imagem em uso: lista o artigo pelo título e a categoria pelo nome, marcando a categoria na lixeira", async () => {
    const imagem = await novaImagem("Imagem de teste compartilhada");
    assert.ok((await gravarArtigo(db, null, artigo("TESTE Artigo Em Uso", imagem))).ok);
    await db.collection("categoriasDeArtigos").add({ nome: "TESTE Categoria Em Uso", slug: "teste-categoria-em-uso", ordem: 1, imagemMidiaId: imagem, excluidoEm: new Date() });
    assert.deepEqual(await listarUsos(db, imagem), [
      { rotulo: "Artigos (imagem)", registros: ["TESTE Artigo Em Uso"] },
      { rotulo: "Categorias de artigos (imagem)", registros: ["TESTE Categoria Em Uso (na lixeira)"] },
    ]);
  });
});
