// Etapa 1d do painel (04/11/2026), no emulador do Firestore (npm run
// test:sessao), num projeto só dela (demo-abte-lixeira-1d): tópicos (categorias
// e tags do blog, dos artigos e da loja) com ativar, lixeira, restaurar e
// excluir de vez, e o registro de alterações. Dados fictícios.
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { excluirDeVez, mudarSituacao } from "../../src/lib/gravacao/lixeira.ts";
import { criarTopico, marcarExclusaoDoTopico } from "../../src/lib/gravacao/topicos.ts";
import type { TipoDeTopico } from "../../src/lib/dados/tipos.ts";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { MENSAGENS_DA_LIXEIRA, type ColecaoDoPainel } from "../../src/lib/lixeira.ts";

const PROJETO = "demo-abte-lixeira-1d";
const EDITOR: AutorDaAlteracao = { uid: "teste-1d-editor", nome: "TESTE Editor", papel: "editor" };
const ADMIN: AutorDaAlteracao = { uid: "teste-1d-admin", nome: "TESTE Administrador", papel: "administrador" };

let app: App;
let db: Firestore;

// Cada tipo de tópico, a coleção dele e onde ele é usado.
const CASOS: { tipo: TipoDeTopico; colecao: ColecaoDoPainel; usadoEm: string; campo: string; lista: boolean; rotulo: string }[] = [
  { tipo: "categoriaDePost", colecao: "categoriasDePosts", usadoEm: "posts", campo: "categoria", lista: false, rotulo: "Categoria" },
  { tipo: "tagDePost", colecao: "tagsDePosts", usadoEm: "posts", campo: "tags", lista: true, rotulo: "Tag" },
  { tipo: "categoria", colecao: "categoriasDeArtigos", usadoEm: "artigos", campo: "categoria", lista: false, rotulo: "Categoria" },
  { tipo: "tag", colecao: "tagsDeArtigos", usadoEm: "artigos", campo: "tags", lista: true, rotulo: "Tag" },
  { tipo: "categoriaDeProduto", colecao: "categoriasDeProdutos", usadoEm: "produtos", campo: "categoria", lista: false, rotulo: "Categoria" },
];

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: PROJETO }, "testes-lixeira-1d");
  db = getFirestore(app);
});

beforeEach(async () => {
  for (const colecao of ["posts", "artigos", "produtos", ...CASOS.map((caso) => caso.colecao), COLECAO_LOG]) {
    await Promise.all((await db.collection(colecao).listDocuments()).map((documento) => documento.delete()));
  }
});

after(async () => {
  await deleteApp(app);
});

describe("Tópicos: lixeira e excluir de vez", () => {
  for (const caso of CASOS) {
    test(`${caso.colecao}: em uso por item na lixeira, não vai para a lixeira nem é excluído de vez; livre, sai com registro`, async () => {
      const criado = await criarTopico(db, caso.tipo, { nome: `TESTE ${caso.rotulo} ${caso.tipo}`, ordem: 0 }, EDITOR);
      assert.ok(criado.ok);
      if (!criado.ok) return;
      // Usado por um item que está na lixeira: continua contando.
      const item = await db.collection(caso.usadoEm).add({ titulo: "Item fictício na lixeira", nome: "Item fictício na lixeira", [caso.campo]: caso.lista ? [criado.id] : criado.id, excluidoEm: new Date() });
      const recusaLixeira = await marcarExclusaoDoTopico(db, caso.tipo, criado.id, true, EDITOR);
      assert.equal(recusaLixeira.ok, false);
      // Mesmo que alguém o ponha na lixeira por fora, excluir de vez recusa.
      await db.collection(caso.colecao).doc(criado.id).update({ excluidoEm: new Date() });
      const recusa = await excluirDeVez(db, caso.colecao, criado.id, "EXCLUIR", ADMIN);
      assert.equal(recusa.ok, false);
      assert.match(recusa.ok ? "" : recusa.mensagem, /Não é possível excluir de vez: está em uso em 1 .+ \(ex\.: "Item fictício na lixeira"\)/);
      assert.equal((await db.collection(caso.colecao).doc(criado.id).get()).exists, true);

      // Livre: restaurar, lixeira pelo caminho normal e excluir de vez.
      await item.delete();
      await db.collection(caso.colecao).doc(criado.id).update({ excluidoEm: null });
      assert.ok((await marcarExclusaoDoTopico(db, caso.tipo, criado.id, true, EDITOR)).ok);
      assert.deepEqual(await excluirDeVez(db, caso.colecao, criado.id, "EXCLU", ADMIN), { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.confirmacao });
      assert.equal((await excluirDeVez(db, caso.colecao, criado.id, `teste ${caso.rotulo.toLowerCase()} ${caso.tipo.toLowerCase()}`, ADMIN)).ok, true);
      assert.equal((await db.collection(caso.colecao).doc(criado.id).get()).exists, false);
      const resumos = (await db.collection(COLECAO_LOG).where("documentoId", "==", criado.id).get()).docs.map((registro) => registro.get("resumo"));
      assert.deepEqual(resumos.sort(), [`${caso.rotulo} criada.`, `${caso.rotulo} excluída de vez.`, `${caso.rotulo} movida para a lixeira.`].sort());
    });
  }

  test("restaurar recusa nome repetido; excluir de vez recusa o que não está na lixeira", async () => {
    const primeira = await criarTopico(db, "categoriaDeProduto", { nome: "TESTE Repetida", ordem: 0 }, EDITOR);
    assert.ok(primeira.ok);
    if (!primeira.ok) return;
    assert.deepEqual(await excluirDeVez(db, "categoriasDeProdutos", primeira.id, "EXCLUIR", ADMIN), { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.soDaLixeira });
    assert.ok((await marcarExclusaoDoTopico(db, "categoriaDeProduto", primeira.id, true, EDITOR)).ok);
    assert.ok((await criarTopico(db, "categoriaDeProduto", { nome: "teste repetida", ordem: 0 }, EDITOR)).ok);
    const recusa = await marcarExclusaoDoTopico(db, "categoriaDeProduto", primeira.id, false, EDITOR);
    assert.deepEqual(recusa, { ok: false, mensagem: "Já existe um tópico ativo com esse nome. Renomeie um dos dois antes de restaurar." });
  });
});

describe("Tópicos: ativar e desativar só onde o campo existe", () => {
  test("categorias de post e de artigo mudam a situação com registro; tags e categorias da loja não têm situação", async () => {
    for (const [tipo, colecao] of [["categoriaDePost", "categoriasDePosts"], ["categoria", "categoriasDeArtigos"]] as const) {
      const criada = await criarTopico(db, tipo, { nome: `TESTE ${tipo}`, ordem: 0 }, EDITOR);
      assert.ok(criada.ok);
      if (!criada.ok) continue;
      assert.equal((await mudarSituacao(db, colecao, criada.id, false, EDITOR)).ok, true);
      assert.equal((await db.collection(colecao).doc(criada.id).get()).get("ativa"), false);
      assert.equal((await mudarSituacao(db, colecao, criada.id, true, EDITOR)).ok, true);
      const resumos = (await db.collection(COLECAO_LOG).where("documentoId", "==", criada.id).get()).docs.map((registro) => registro.get("resumo"));
      assert.deepEqual(resumos.sort(), ["Categoria ativada.", "Categoria criada.", "Categoria desativada."]);
    }
    for (const [tipo, colecao] of [["tagDePost", "tagsDePosts"], ["tag", "tagsDeArtigos"], ["categoriaDeProduto", "categoriasDeProdutos"]] as const) {
      const criada = await criarTopico(db, tipo, { nome: `TESTE sem situação ${tipo}`, ordem: 0 }, EDITOR);
      assert.ok(criada.ok);
      if (!criada.ok) continue;
      assert.deepEqual(await mudarSituacao(db, colecao, criada.id, false, EDITOR), { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.semSituacao });
      assert.equal("ativa" in ((await db.collection(colecao).doc(criada.id).get()).data() ?? {}), false, "nenhum campo novo de situação");
    }
  });
});
