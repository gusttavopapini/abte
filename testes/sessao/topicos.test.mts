// Testes da gravação dos tópicos com o registro de alterações (npm run
// test:sessao), num projeto só deles (demo-abte-topicos). Desde 23/10/2026,
// as categorias de artigo registram criação, edição, exclusão e restauração
// em logAlteracoes, na mesma transação; tags ainda não. Dados fictícios.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { atualizarTopico, criarTopico, marcarExclusaoDoTopico } from "../../src/lib/gravacao/topicos.ts";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";

const EDITOR: AutorDaAlteracao = { uid: "teste-topicos-editor", nome: "TESTE Editor", papel: "editor" };
const ADMINISTRADOR: AutorDaAlteracao = { uid: "teste-topicos-admin", nome: "TESTE Administrador", papel: "administrador" };

let app: App;
let db: Firestore;
let categoria: string;

async function registrosDe(id: string) {
  const documentos = (await db.collection(COLECAO_LOG).where("documentoId", "==", id).get()).docs.map((documento) => documento.data());
  return documentos.sort((a, b) => a.criadoEm.toMillis() - b.criadoEm.toMillis());
}

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: "demo-abte-topicos" }, "testes-topicos");
  db = getFirestore(app);
});

after(async () => {
  await deleteApp(app);
});

describe("Categorias de artigo: registro de alterações (emulador)", () => {
  test("editor cria: registro com o formato dos profissionais, sem o nome no resumo", async () => {
    const criado = await criarTopico(db, "categoria", { nome: "TESTE Categoria Registro", ordem: 2 }, EDITOR);
    assert.ok(criado.ok);
    categoria = criado.id;
    const [registro] = await registrosDe(categoria);
    assert.deepEqual(
      [registro.usuarioId, registro.usuarioNome, registro.papel, registro.colecao, registro.documentoId, registro.acao, registro.campos, registro.resumo],
      ["teste-topicos-editor", "TESTE Editor", "editor", "categoriasDeArtigos", categoria, "criar", ["nome", "ordem"], "Categoria criada."],
    );
    assert.ok(registro.criadoEm, "hora do servidor");
    assert.equal(registro.origem, undefined, "ação de pessoa não tem origem");
  });

  test("administrador edita: só os nomes dos campos que mudaram, resumo em português", async () => {
    assert.ok((await atualizarTopico(db, "categoria", categoria, { nome: "TESTE Categoria Renomeada", ordem: 2, imagemMidiaId: null }, ADMINISTRADOR)).ok);
    const ultimo = (await registrosDe(categoria)).at(-1);
    assert.deepEqual([ultimo?.acao, ultimo?.papel, ultimo?.campos, ultimo?.resumo], ["editar", "administrador", ["nome"], "Categoria alterada: nome."]);
    assert.doesNotMatch(JSON.stringify(ultimo), /Renomeada/, "nenhum valor no registro");
  });

  test("mudar ativa registra Categoria desativada e Categoria ativada", async () => {
    assert.ok((await atualizarTopico(db, "categoria", categoria, { nome: "TESTE Categoria Renomeada", ordem: 3, ativa: false }, EDITOR)).ok);
    assert.equal((await db.collection("categoriasDeArtigos").doc(categoria).get()).get("ativa"), false);
    let ultimo = (await registrosDe(categoria)).at(-1);
    assert.deepEqual([ultimo?.campos, ultimo?.resumo], [["ordem", "ativa"], "Categoria desativada. Categoria alterada: ordem."]);
    assert.ok((await atualizarTopico(db, "categoria", categoria, { nome: "TESTE Categoria Renomeada", ordem: 3, ativa: true }, EDITOR)).ok);
    ultimo = (await registrosDe(categoria)).at(-1);
    assert.deepEqual([ultimo?.campos, ultimo?.resumo], [["ativa"], "Categoria ativada."]);
  });

  test("ativa ausente no documento vale true: marcar Ativa nele não conta como mudança", async () => {
    const semCampo = (await db.collection("categoriasDeArtigos").add({ nome: "TESTE Sem Campo", slug: "teste-sem-campo", ordem: 0, excluidoEm: null })).id;
    assert.ok((await atualizarTopico(db, "categoria", semCampo, { nome: "TESTE Sem Campo", ordem: 0, ativa: true }, EDITOR)).ok);
    const [registro] = await registrosDe(semCampo);
    assert.deepEqual([registro.campos, registro.resumo], [[], "Categoria salva sem alterações."]);
  });

  test("edição sem alteração real: registra com a lista de campos vazia (como nos profissionais)", async () => {
    const antes = (await registrosDe(categoria)).length;
    assert.ok((await atualizarTopico(db, "categoria", categoria, { nome: "TESTE Categoria Renomeada", ordem: 3, ativa: true }, EDITOR)).ok);
    const depois = await registrosDe(categoria);
    assert.equal(depois.length, antes + 1);
    assert.deepEqual([depois.at(-1)?.campos, depois.at(-1)?.resumo], [[], "Categoria salva sem alterações."]);
  });

  test("excluir e restaurar ficam no registro", async () => {
    assert.ok((await marcarExclusaoDoTopico(db, "categoria", categoria, true, EDITOR)).ok);
    assert.ok((await marcarExclusaoDoTopico(db, "categoria", categoria, false, ADMINISTRADOR)).ok);
    const ultimos = (await registrosDe(categoria)).slice(-2).map((registro) => [registro.acao, registro.campos, registro.resumo]);
    assert.deepEqual(ultimos, [
      ["excluir", ["excluidoEm"], "Categoria movida para os excluídos."],
      ["restaurar", ["excluidoEm"], "Categoria restaurada."],
    ]);
  });

  test("recusa (nome repetido ou categoria em uso) não grava nada nem registra", async () => {
    const antes = (await db.collection(COLECAO_LOG).count().get()).data().count;
    const repetido = await criarTopico(db, "categoria", { nome: "teste categoria renomeada", ordem: 0 }, EDITOR);
    assert.deepEqual(repetido, { ok: false, mensagem: "Já existe uma categoria com esse nome." });
    await db.collection("artigos").add({ titulo: "TESTE", categoria, tags: [], status: "rascunho" });
    const emUso = await marcarExclusaoDoTopico(db, "categoria", categoria, true, EDITOR);
    assert.equal(emUso.ok, false);
    assert.equal((await db.collection(COLECAO_LOG).count().get()).data().count, antes);
  });

  test("tags e categorias de produto ainda não registram (etapa 3)", async () => {
    const tag = await criarTopico(db, "tag", { nome: "TESTE Tag", ordem: 0 }, EDITOR);
    const daLoja = await criarTopico(db, "categoriaDeProduto", { nome: "TESTE Categoria da Loja", ordem: 0 }, EDITOR);
    assert.ok(tag.ok && daLoja.ok);
    assert.deepEqual([(await registrosDe(tag.id)).length, (await registrosDe(daLoja.id)).length], [0, 0]);
  });
});
