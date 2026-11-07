// Regressões encontradas na auditoria de 06/11/2026. Só dados fictícios.
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { duplicarPost, gravarPost, type DadosDoPost } from "../../src/lib/gravacao/posts.ts";
import { gravarArtigo } from "../../src/lib/gravacao/artigos.ts";
import { aplicarEmLote, excluirDeVez, moverParaLixeira, restaurarDaLixeira } from "../../src/lib/gravacao/lixeira.ts";
import { MENSAGENS_DA_LIXEIRA } from "../../src/lib/lixeira.ts";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";

let app: App;
let db: Firestore;
const AUTOR: AutorDaAlteracao = { uid: "teste-auditoria", nome: "TESTE Auditoria", papel: "administrador" };
const POST: DadosDoPost = { titulo: "TESTE Post", conteudo: "Conteúdo fictício", status: "publicado", categoria: null, tags: [], capaMidiaId: null };
before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST);
  app = initializeApp({ projectId: "demo-abte-auditoria" }, "auditoria-painel");
  db = getFirestore(app);
});
beforeEach(async () => {
  for (const c of ["posts", "artigos", "categoriasDeArtigos", "categoriasDePosts", "tagsDePosts", "profissionais", COLECAO_LOG]) {
    await Promise.all((await db.collection(c).listDocuments()).map((d) => d.delete()));
  }
});
after(async () => { await deleteApp(app); });

test("duplica um post sem categoria e sem tags como rascunho", async () => {
  const criado = await gravarPost(db, null, POST, { autor: AUTOR });
  assert.ok(criado.ok);
  const copia = await duplicarPost(db, criado.id, AUTOR, 200);
  assert.ok(copia.ok);
  const dados = (await db.collection("posts").doc(copia.id).get()).data();
  assert.equal(dados?.status, "rascunho");
  assert.equal(dados?.categoria, null);
  assert.deepEqual(dados?.tags, []);
  assert.notEqual(copia.id, criado.id);
});

test("salvar post revalida a lixeira depois da leitura inicial", async (t) => {
  const ref = db.collection("posts").doc("corrida");
  await ref.set({ ...POST, slug: "teste", excluidoEm: null });
  const executar = db.runTransaction.bind(db);
  t.mock.method(db, "runTransaction", async (...args: Parameters<Firestore["runTransaction"]>) => {
    await ref.update({ excluidoEm: new Date(), status: "rascunho" });
    return executar(...args);
  });
  assert.deepEqual(await gravarPost(db, ref.id, POST, { autor: AUTOR }), { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.naLixeira });
  assert.equal((await ref.get()).get("status"), "rascunho");
  assert.equal((await db.collection(COLECAO_LOG).get()).size, 0);
});

test("salvar artigo revalida a lixeira depois da leitura inicial", async (t) => {
  await db.collection("categoriasDeArtigos").doc("cat").set({ nome: "TESTE Categoria", excluidoEm: null });
  const ref = db.collection("artigos").doc("corrida");
  const dados = { titulo: "TESTE Artigo", categoria: "cat", tags: [], autores: "TESTE", link: "", resumo: "", status: "publicado" as const, imagemMidiaId: null };
  await ref.set({ ...dados, excluidoEm: null });
  const ler = db.getAll.bind(db);
  t.mock.method(db, "getAll", async (...args: Parameters<Firestore["getAll"]>) => {
    const documentos = await ler(...args);
    await ref.update({ excluidoEm: new Date(), status: "rascunho" });
    return documentos;
  });
  assert.deepEqual(await gravarArtigo(db, ref.id, dados, { autor: AUTOR }), { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.naLixeira });
  assert.equal((await ref.get()).get("status"), "rascunho");
});

test("lote continua após falha inesperada no segundo item e informa o resultado parcial", async (t) => {
  for (const id of ["um", "dois", "tres"]) await db.collection("posts").doc(id).set({ ...POST, titulo: `TESTE ${id}`, excluidoEm: null });
  const executar = db.runTransaction.bind(db);
  let chamada = 0;
  t.mock.method(db, "runTransaction", async (...args: Parameters<Firestore["runTransaction"]>) => {
    if (++chamada === 2) throw new Error("Falha de rede fictícia");
    return executar(...args);
  });
  const resultado = await aplicarEmLote(db, "posts", ["um", "dois", "tres"], "lixeira", AUTOR);
  assert.deepEqual(resultado.feitos, ["TESTE um", "TESTE tres"]);
  assert.equal(resultado.falhas.length, 1);
  assert.match(resultado.falhas[0].motivo, /Não foi possível/);
  assert.equal((await db.collection("posts").doc("dois").get()).get("excluidoEm"), null);
  assert.ok((await db.collection("posts").doc("tres").get()).get("excluidoEm"));
});

test("ação genérica recusa mandar tópico em uso para a lixeira", async () => {
  await db.collection("categoriasDePosts").doc("cat").set({ nome: "TESTE Categoria", excluidoEm: null });
  await db.collection("posts").doc("vinculado").set({ ...POST, categoria: "cat" });
  const r = await moverParaLixeira(db, "categoriasDePosts", "cat", AUTOR);
  assert.equal(r.ok, false);
  assert.equal((await db.collection("categoriasDePosts").doc("cat").get()).get("excluidoEm"), null);
});

test("ação genérica recusa restaurar tópico com nome já usado", async () => {
  await db.collection("tagsDePosts").doc("ativa").set({ nome: "TESTE Ação", excluidoEm: null });
  await db.collection("tagsDePosts").doc("excluida").set({ nome: "teste acao", excluidoEm: new Date() });
  const r = await restaurarDaLixeira(db, "tagsDePosts", "excluida", AUTOR);
  assert.equal(r.ok, false);
  assert.ok((await db.collection("tagsDePosts").doc("excluida").get()).get("excluidoEm"));
});

test("exclusão definitiva revalida o nome usado para confirmar", async (t) => {
  const ref = db.collection("posts").doc("renomeado");
  await ref.set({ ...POST, excluidoEm: new Date() });
  const executar = db.runTransaction.bind(db);
  t.mock.method(db, "runTransaction", async (...args: Parameters<Firestore["runTransaction"]>) => {
    await ref.update({ titulo: "TESTE Novo título" });
    return executar(...args);
  });
  const r = await excluirDeVez(db, "posts", ref.id, POST.titulo, AUTOR);
  assert.deepEqual(r, { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.confirmacao });
  assert.equal((await ref.get()).exists, true);
});
