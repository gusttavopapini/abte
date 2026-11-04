// Blog e artigos no painel (04/11/2026), no emulador do Firestore (npm run
// test:sessao), num projeto só deles (demo-abte-blog-lixeira): registro de
// alterações na criação e na edição, trava da lixeira no formulário e
// duplicar. Dados fictícios; nada aqui toca o projeto real.
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { duplicarArtigo, gravarArtigo, type DadosDoArtigo } from "../../src/lib/gravacao/artigos.ts";
import { moverParaLixeira, restaurarDaLixeira } from "../../src/lib/gravacao/lixeira.ts";
import { duplicarPost, gravarPost, tituloDaCopia, type DadosDoPost } from "../../src/lib/gravacao/posts.ts";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { MENSAGENS_DA_LIXEIRA } from "../../src/lib/lixeira.ts";

const PROJETO = "demo-abte-blog-lixeira";
const EDITOR: AutorDaAlteracao = { uid: "teste-blog-editor", nome: "TESTE Editor", papel: "editor" };

let app: App;
let db: Firestore;

const POST: DadosDoPost = { titulo: "Post fictício", conteudo: "Texto de teste.", status: "publicado", capaMidiaId: null, categoria: "cat", tags: ["tag"] };
const ARTIGO: DadosDoArtigo = { titulo: "Artigo fictício", categoria: "catA", tags: ["tagA"], autores: "Autoria Fictícia", link: "https://exemplo.invalid/a", resumo: "Resumo de teste.", status: "publicado", imagemMidiaId: null };

async function registrosDe(id: string) {
  return (await db.collection(COLECAO_LOG).where("documentoId", "==", id).get()).docs.map((registro) => registro.data());
}

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: PROJETO }, "testes-blog-lixeira");
  db = getFirestore(app);
});

beforeEach(async () => {
  for (const colecao of ["posts", "artigos", "categoriasDePosts", "tagsDePosts", "categoriasDeArtigos", "tagsDeArtigos", "midias", COLECAO_LOG]) {
    await Promise.all((await db.collection(colecao).listDocuments()).map((documento) => documento.delete()));
  }
  await db.collection("categoriasDePosts").doc("cat").set({ nome: "Categoria", excluidoEm: null });
  await db.collection("tagsDePosts").doc("tag").set({ nome: "Tag", excluidoEm: null });
  await db.collection("categoriasDeArtigos").doc("catA").set({ nome: "Categoria A", excluidoEm: null });
  await db.collection("tagsDeArtigos").doc("tagA").set({ nome: "Tag A", excluidoEm: null });
});

after(async () => {
  await deleteApp(app);
});

describe("Registro de alterações em posts e artigos", () => {
  test("criar e editar um post gravam no registro, com os campos alterados", async () => {
    const criado = await gravarPost(db, null, POST, { autor: EDITOR });
    assert.ok(criado.ok);
    if (!criado.ok) return;
    assert.equal((await db.collection("posts").doc(criado.id).get()).get("excluidoEm"), null);
    await gravarPost(db, criado.id, { ...POST, titulo: "Título novo" }, { autor: EDITOR });
    const registros = await registrosDe(criado.id);
    const criar = registros.find((registro) => registro.acao === "criar");
    const editar = registros.find((registro) => registro.acao === "editar");
    assert.equal(criar?.resumo, "Post criado.");
    assert.equal(editar?.resumo, "Post alterado.");
    assert.deepEqual(editar?.campos, ["titulo"]);
    assert.equal(editar?.usuarioId, EDITOR.uid);
  });

  test("criar e editar um artigo gravam no registro", async () => {
    const criado = await gravarArtigo(db, null, ARTIGO, { autor: EDITOR });
    assert.ok(criado.ok);
    if (!criado.ok) return;
    await gravarArtigo(db, criado.id, { ...ARTIGO, resumo: "Outro resumo." }, { autor: EDITOR });
    const registros = await registrosDe(criado.id);
    assert.deepEqual(registros.map((registro) => registro.resumo).sort(), ["Artigo alterado.", "Artigo criado."]);
    assert.deepEqual(registros.find((registro) => registro.acao === "editar")?.campos, ["resumo"]);
  });
});

describe("Item na lixeira pelo formulário", () => {
  test("post e artigo na lixeira não são publicados pelo formulário, mas salvam como rascunho", async () => {
    const post = await gravarPost(db, null, POST, { autor: EDITOR });
    const artigo = await gravarArtigo(db, null, ARTIGO, { autor: EDITOR });
    assert.ok(post.ok && artigo.ok);
    if (!post.ok || !artigo.ok) return;
    await moverParaLixeira(db, "posts", post.id, EDITOR);
    await moverParaLixeira(db, "artigos", artigo.id, EDITOR);
    assert.deepEqual(await gravarPost(db, post.id, POST, { autor: EDITOR }), { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.naLixeira });
    assert.deepEqual(await gravarArtigo(db, artigo.id, ARTIGO, { autor: EDITOR }), { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.naLixeira });
    assert.equal((await db.collection("posts").doc(post.id).get()).get("status"), "rascunho");
    assert.equal((await gravarPost(db, post.id, { ...POST, status: "rascunho", titulo: "Ajuste" }, { autor: EDITOR })).ok, true);
    // A lixeira continua marcada depois de salvar o rascunho.
    assert.ok((await db.collection("posts").doc(post.id).get()).get("excluidoEm"));
    // Restaurado, volta como rascunho e pode ser publicado.
    await restaurarDaLixeira(db, "posts", post.id, EDITOR);
    assert.equal((await db.collection("posts").doc(post.id).get()).get("status"), "rascunho");
    assert.equal((await gravarPost(db, post.id, POST, { autor: EDITOR })).ok, true);
  });
});

describe("Duplicar", () => {
  test("post vira rascunho \"Cópia de ...\", com slug novo e sem dados da migração nem data de publicação", async () => {
    await db.collection("midias").doc("capa").set({ variantes: [{ largura: 480, caminho: "x" }], excluidoEm: null });
    const original = await gravarPost(db, null, { ...POST, capaMidiaId: "capa" }, { autor: EDITOR });
    assert.ok(original.ok);
    if (!original.ok) return;
    await db.collection("posts").doc(original.id).update({ resumo: "Resumo", idioma: "es", publicadoEm: new Date(2020, 0, 1), origem: { sistema: "wix" }, revisarMigracao: true, sugestaoDeAutor: "x" });
    const copia = await duplicarPost(db, original.id, EDITOR, 200);
    assert.ok(copia.ok);
    if (!copia.ok) return;
    const dados = (await db.collection("posts").doc(copia.id).get()).data() ?? {};
    assert.equal(dados.titulo, "Cópia de Post fictício");
    assert.equal(dados.status, "rascunho");
    assert.equal(dados.slug, "copia-de-post-ficticio");
    assert.equal(dados.capaMidiaId, "capa");
    assert.equal(dados.categoria, "cat");
    assert.deepEqual(dados.tags, ["tag"]);
    assert.equal(dados.resumo, "Resumo");
    assert.equal(dados.idioma, "es");
    for (const campo of ["publicadoEm", "origem", "revisarMigracao", "sugestaoDeAutor"]) assert.equal(campo in dados, false, campo);
    assert.equal((await registrosDe(copia.id))[0]?.resumo, "Post duplicado como rascunho.");
    // O original não muda.
    assert.equal((await db.collection("posts").doc(original.id).get()).get("status"), "publicado");
  });

  test("tópicos e capa que não estão mais disponíveis ficam de fora da cópia; título cortado no limite", async () => {
    await db.collection("midias").doc("capaNaLixeira").set({ variantes: [{ largura: 480, caminho: "x" }], excluidoEm: new Date() });
    await db.collection("posts").doc("antigo").set({ titulo: "x".repeat(200), conteudo: "", status: "publicado", capaMidiaId: "capaNaLixeira", categoria: "cat", tags: ["tag", "sumida"] });
    await db.collection("categoriasDePosts").doc("cat").update({ excluidoEm: new Date() });
    const copia = await duplicarPost(db, "antigo", EDITOR, 200);
    assert.ok(copia.ok);
    if (!copia.ok) return;
    const dados = (await db.collection("posts").doc(copia.id).get()).data() ?? {};
    assert.equal(dados.capaMidiaId, null);
    assert.equal(dados.categoria, null);
    assert.deepEqual(dados.tags, ["tag"]);
    assert.equal(dados.titulo.length, 200);
    assert.equal(tituloDaCopia("a ", 200), "Cópia de a");
  });

  test("artigo vira rascunho; com a categoria na lixeira, a cópia é recusada", async () => {
    const original = await gravarArtigo(db, null, ARTIGO, { autor: EDITOR });
    assert.ok(original.ok);
    if (!original.ok) return;
    const copia = await duplicarArtigo(db, original.id, EDITOR, 300);
    assert.ok(copia.ok);
    if (!copia.ok) return;
    const dados = (await db.collection("artigos").doc(copia.id).get()).data() ?? {};
    assert.equal(dados.titulo, "Cópia de Artigo fictício");
    assert.equal(dados.status, "rascunho");
    assert.equal(dados.autores, "Autoria Fictícia");
    assert.equal("slug" in dados, false);
    await db.collection("categoriasDeArtigos").doc("catA").update({ excluidoEm: new Date() });
    const recusada = await duplicarArtigo(db, original.id, EDITOR, 300);
    assert.equal(recusada.ok, false);
  });
});
