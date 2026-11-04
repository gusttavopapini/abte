// Ações comuns de conteúdo do painel no emulador do Firestore (npm run
// test:sessao), num projeto só delas (demo-abte-lixeira): publicar e
// despublicar, lixeira, restaurar e excluir de vez, com o registro de
// alterações. Dados fictícios; nada aqui toca o projeto real.
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { excluirDeVez, moverParaLixeira, mudarSituacao, restaurarDaLixeira } from "../../src/lib/gravacao/lixeira.ts";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { MENSAGENS_DA_LIXEIRA } from "../../src/lib/lixeira.ts";

const PROJETO = "demo-abte-lixeira";
const EDITOR: AutorDaAlteracao = { uid: "teste-lixeira-editor", nome: "TESTE Editor", papel: "editor" };
const ADMIN: AutorDaAlteracao = { uid: "teste-lixeira-admin", nome: "TESTE Administrador", papel: "administrador" };

let app: App;
let db: Firestore;

async function limpar() {
  for (const colecao of ["posts", "artigos", "profissionais", "produtos", "categoriasDePosts", "tagsDePosts", "categoriasDeProdutos", "diretoria", "carrinhos", COLECAO_LOG]) {
    const documentos = await db.collection(colecao).listDocuments();
    await Promise.all(documentos.map((documento) => documento.delete()));
  }
}

async function registrosDe(id: string) {
  return (await db.collection(COLECAO_LOG).where("documentoId", "==", id).get()).docs.map((registro) => registro.data());
}

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: PROJETO }, "testes-lixeira");
  db = getFirestore(app);
});

beforeEach(limpar);

after(async () => {
  await deleteApp(app);
});

describe("Publicar e despublicar", () => {
  test("publica e despublica um post, com o registro, e não grava se já está na situação", async () => {
    await db.collection("posts").doc("p1").set({ titulo: "Post fictício", status: "rascunho", excluidoEm: null });
    const publicado = await mudarSituacao(db, "posts", "p1", true, EDITOR);
    assert.deepEqual(publicado, { ok: true, nome: "Post fictício", mudou: true });
    assert.equal((await db.collection("posts").doc("p1").get()).get("status"), "publicado");
    const repetido = await mudarSituacao(db, "posts", "p1", true, EDITOR);
    assert.equal(repetido.ok && repetido.mudou, false);
    await mudarSituacao(db, "posts", "p1", false, EDITOR);
    assert.equal((await db.collection("posts").doc("p1").get()).get("status"), "rascunho");
    const registros = await registrosDe("p1");
    assert.deepEqual(registros.map((registro) => registro.resumo).sort(), ["Post despublicado.", "Post publicado."]);
    assert.ok(registros.every((registro) => registro.acao === "editar" && registro.usuarioId === EDITOR.uid && !("origem" in registro)));
  });

  test("ativa profissional, desativa categoria e recusa item na lixeira ou sem situação", async () => {
    await db.collection("profissionais").doc("pr").set({ nome: "Pessoa Fictícia", ativo: false, excluidoEm: null });
    await mudarSituacao(db, "profissionais", "pr", true, EDITOR);
    assert.equal((await db.collection("profissionais").doc("pr").get()).get("ativo"), true);
    await db.collection("categoriasDePosts").doc("c").set({ nome: "Categoria fictícia", excluidoEm: null });
    await mudarSituacao(db, "categoriasDePosts", "c", false, EDITOR);
    assert.equal((await db.collection("categoriasDePosts").doc("c").get()).get("ativa"), false);

    await db.collection("produtos").doc("x").set({ nome: "Produto fictício", publicado: false, excluidoEm: new Date() });
    assert.deepEqual(await mudarSituacao(db, "produtos", "x", true, EDITOR), { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.naLixeira });
    assert.equal((await db.collection("produtos").doc("x").get()).get("publicado"), false);
    await db.collection("tagsDePosts").doc("t").set({ nome: "Tag", excluidoEm: null });
    assert.deepEqual(await mudarSituacao(db, "tagsDePosts", "t", false, EDITOR), { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.semSituacao });
    assert.deepEqual(await mudarSituacao(db, "posts", "naoExiste", true, EDITOR), { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.naoEncontrado });
  });
});

describe("Lixeira e restaurar", () => {
  test("post publicado vai para a lixeira como rascunho e volta como rascunho", async () => {
    await db.collection("posts").doc("p2").set({ titulo: "Post fictício", status: "publicado", excluidoEm: null });
    const movido = await moverParaLixeira(db, "posts", "p2", EDITOR);
    assert.equal(movido.ok && movido.mudou, true);
    let post = await db.collection("posts").doc("p2").get();
    assert.ok(post.get("excluidoEm"));
    assert.equal(post.get("status"), "rascunho");
    // Repetir não grava de novo.
    const repetido = await moverParaLixeira(db, "posts", "p2", EDITOR);
    assert.equal(repetido.ok && repetido.mudou, false);

    await restaurarDaLixeira(db, "posts", "p2", EDITOR);
    post = await db.collection("posts").doc("p2").get();
    assert.equal(post.get("excluidoEm"), null);
    assert.equal(post.get("status"), "rascunho");
    const registros = await registrosDe("p2");
    assert.deepEqual(registros.map((registro) => registro.acao).sort(), ["excluir", "restaurar"]);
    assert.deepEqual(registros.find((registro) => registro.acao === "excluir")?.campos, ["excluidoEm", "status"]);
  });

  test("produto na lixeira mantém a situação", async () => {
    await db.collection("produtos").doc("pd").set({ nome: "Produto fictício", publicado: true, excluidoEm: null });
    await moverParaLixeira(db, "produtos", "pd", EDITOR);
    const produto = await db.collection("produtos").doc("pd").get();
    assert.equal(produto.get("publicado"), true);
    assert.ok(produto.get("excluidoEm"));
  });
});

describe("Excluir de vez", () => {
  test("só da lixeira, com a confirmação, e grava o registro", async () => {
    await db.collection("posts").doc("p3").set({ titulo: "Post fictício", status: "rascunho", excluidoEm: null });
    assert.deepEqual(await excluirDeVez(db, "posts", "p3", "EXCLUIR", ADMIN), { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.soDaLixeira });
    await moverParaLixeira(db, "posts", "p3", EDITOR);
    assert.deepEqual(await excluirDeVez(db, "posts", "p3", "EXCLU", ADMIN), { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.confirmacao });
    assert.equal((await db.collection("posts").doc("p3").get()).exists, true);
    const feito = await excluirDeVez(db, "posts", "p3", "post fictício", ADMIN);
    assert.deepEqual(feito, { ok: true, nome: "Post fictício", mudou: true, avisos: [] });
    assert.equal((await db.collection("posts").doc("p3").get()).exists, false);
    const ultimo = (await registrosDe("p3")).find((registro) => registro.acao === "excluir_definitivo");
    assert.equal(ultimo?.usuarioId, ADMIN.uid);
    assert.equal(ultimo?.resumo, "Post excluído de vez.");
  });

  test("recusa tópico em uso (inclusive por post na lixeira) e profissional ligado à diretoria", async () => {
    await db.collection("tagsDePosts").doc("t1").set({ nome: "Tag fictícia", excluidoEm: new Date() });
    await db.collection("posts").doc("p4").set({ titulo: "Post na lixeira", status: "rascunho", tags: ["t1"], excluidoEm: new Date() });
    const recusa = await excluirDeVez(db, "tagsDePosts", "t1", "EXCLUIR", ADMIN);
    assert.equal(recusa.ok, false);
    assert.match(recusa.ok ? "" : recusa.mensagem, /em uso em 1 post\(s\) \(ex\.: "Post na lixeira"\)/);
    assert.equal((await db.collection("tagsDePosts").doc("t1").get()).exists, true);

    await db.collection("profissionais").doc("pf").set({ nome: "Pessoa Fictícia", ativo: false, excluidoEm: new Date() });
    await db.collection("diretoria").doc("d1").set({ cargo: "Cargo fictício", profissionalId: "pf" });
    const naDiretoria = await excluirDeVez(db, "profissionais", "pf", "EXCLUIR", ADMIN);
    assert.match(naDiretoria.ok ? "" : naDiretoria.mensagem, /membro\(s\) da diretoria/);

    await db.collection("posts").doc("p4").update({ tags: [] });
    assert.equal((await excluirDeVez(db, "tagsDePosts", "t1", "EXCLUIR", ADMIN)).ok, true);
  });

  test("produto no carrinho de um cliente é excluído com aviso", async () => {
    await db.collection("produtos").doc("pc").set({ nome: "Produto fictício", publicado: false, excluidoEm: new Date() });
    await db.collection("carrinhos").doc("cliente-ficticio").set({ itens: [{ produtoId: "pc", quantidade: 2 }] });
    const feito = await excluirDeVez(db, "produtos", "pc", "EXCLUIR", ADMIN);
    assert.ok(feito.ok);
    assert.deepEqual(feito.ok ? feito.avisos : [], ["Este produto está guardado no carrinho de 1 cliente(s). Lá ele vai aparecer como indisponível."]);
    assert.equal((await db.collection("produtos").doc("pc").get()).exists, false);
    // O carrinho do cliente não é mexido.
    assert.equal((await db.collection("carrinhos").doc("cliente-ficticio").get()).get("itens").length, 1);
  });
});
