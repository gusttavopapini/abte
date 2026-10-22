// Testes da migração da loja (categorias e produtos) no emulador do Firestore
// (npm run test:sessao), num projeto só deles (demo-abte-loja). Produtos,
// imagens e coleta fictícios; nenhum pedido sai da máquina. Nada aqui toca o
// projeto real.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { COLECAO_LOG, registrarNoLote, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { validarImagensOrigem, type ImagemDeOrigem } from "../../src/lib/migracao/imagensOrigem.ts";
import { MENSAGEM_SEM_IMAGENS_DA_LOJA, desfazerLoja, migrarLoja } from "../../src/lib/migracao/loja.ts";
import type { CategoriaDoMapa, ProdutoColetado, ProdutoDoMapa } from "../../src/lib/migracao/produtos.ts";

const PROJETO = "demo-abte-loja";
const PESSOA: AutorDaAlteracao = { uid: "teste-loja-editor", nome: "TESTE Editor", papel: "editor" };
const hex = (n: number) => n.toString(16).padStart(32, "0");
const ID = (n: number) => `7dce06_${hex(n)}~mv2.jpg`;

let app: App;
let db: Firestore;
let imagensDeOrigem: ImagemDeOrigem[];

const PRODUTOS: ProdutoDoMapa[] = [
  { slug: "kit-pré-teste", nome: "Kit de Teste", descricao: "Aproximada.", preco: 200, precoRiscado: "R$ 300,00", estoque: "disponivel", digital: false, categorias: ["loja", "abte"], temOpcoes: [] },
  { slug: "jogo-parceiro", nome: "Jogo Parceiro", descricao: "Aproximada.", preco: 50, precoRiscado: null, estoque: "esgotado", digital: false, categorias: ["loja", "produtos-parceiros"], temOpcoes: [] },
  { slug: "digital-solto", nome: "Digital Solto", descricao: "Aproximada.", preco: 9.9, precoRiscado: null, estoque: "disponivel", digital: true, categorias: ["loja"], temOpcoes: [] },
];
const CATEGORIAS: CategoriaDoMapa[] = [
  { slug: "abte", nome: "Produtos ABTE" },
  { slug: "produtos-parceiros", nome: "Produtos parceiros" },
  { slug: "loja", nome: "Loja ABTE" },
];
const COLETADOS = new Map<string, ProdutoColetado>([["kit-pré-teste", { slug: "kit-pré-teste", descricao: "Lida na página." }]]);

const migrar = (modo: "simulacao" | "executar", execucao: string, limite: number | null = null) =>
  migrarLoja({ db, produtos: PRODUTOS, categoriasDoMapa: CATEGORIAS, coletados: COLETADOS, imagensDeOrigem, modo, execucao, limite });

async function contar(colecao: string) {
  return (await db.collection(colecao).count().get()).data().count;
}

async function daExecucao(colecao: string, execucao: string) {
  return (await db.collection(colecao).where("origem.execucao", "==", execucao).get()).docs;
}

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: PROJETO }, "testes-migracao-loja");
  db = getFirestore(app);
  const uso = (tipo: string, chave: string, posicao: number) => ({ tipo, chaveDeOrigem: chave, rotulo: chave, posicao });
  const validacao = validarImagensOrigem({
    versao: 1,
    imagens: [
      { midiaIdWix: ID(1), usos: [uso("produto", "kit-pré-teste", 2)] },
      { midiaIdWix: ID(2), usos: [uso("produto", "kit-pré-teste", 1)] },
      { midiaIdWix: ID(3), usos: [uso("produto", "jogo-parceiro", 1)] },
      { midiaIdWix: ID(4), usos: [uso("categoriaDeProduto", "abte", 1)] },
      { midiaIdWix: ID(5), usos: [uso("categoriaDeProduto", "loja", 1)] },
    ],
  });
  assert.ok(validacao.ok);
  imagensDeOrigem = validacao.imagens;
});

after(async () => {
  await deleteApp(app);
});

describe("Migração da loja (emulador)", () => {
  test("simulação não grava nada", async () => {
    const relatorio = await migrar("simulacao", "20261022-000000-0101");
    assert.ok(relatorio.ok);
    assert.equal(await contar("produtos"), 0);
    assert.equal(await contar("categoriasDeProdutos"), 0);
    assert.equal(await contar(COLECAO_LOG), 0);
    assert.deepEqual(relatorio.contagens.porCategoria, { "(sem categoria)": 1, abte: 1, "produtos-parceiros": 1 });
    assert.equal(relatorio.contagens.comPrecoPromocional, 1, "sem dados da página no teste: regra do mapa");
    assert.deepEqual(relatorio.produtos.map((produto) => [produto.slugNovo, produto.slugMuda]), [["kit-pre-teste", true], ["jogo-parceiro", false], ["digital-solto", false]]);
  });

  test("execução real exige as imagens já importadas", async () => {
    assert.deepEqual(await migrar("executar", "20261022-000000-0102"), { ok: false, mensagem: MENSAGEM_SEM_IMAGENS_DA_LOJA });
    assert.equal(await contar("produtos"), 0);
  });

  test("execução: categorias e produtos com publicado false, revisão, galeria na ordem e um registro por documento", async () => {
    for (const n of [1, 2, 4, 5]) await db.collection("midias").doc(`midia${n}`).set({ tipo: "imagem", origem: { sistema: "wix", midiaId: ID(n), execucao: "x" }, excluidoEm: null });
    const execucao = "20261022-000000-0103";
    const relatorio = await migrar("executar", execucao);
    assert.ok(relatorio.ok);
    assert.equal(relatorio.contagens.categorias.criadas, 2);
    assert.equal(relatorio.contagens.produtos.criados, 3);

    const categorias = new Map((await daExecucao("categoriasDeProdutos", execucao)).map((documento) => [documento.get("origem.chave"), documento]));
    assert.deepEqual([...categorias.keys()].sort(), ["abte", "produtos-parceiros"]);
    const abte = categorias.get("abte");
    assert.ok(abte);
    assert.deepEqual([abte.get("nome"), abte.get("slug"), abte.get("imagemMidiaId"), abte.get("excluidoEm")], ["Produtos ABTE", "produtos-abte", "midia4", null]);

    const produtos = new Map((await daExecucao("produtos", execucao)).map((documento) => [documento.get("origem.chave"), documento.data()]));
    const kit = produtos.get("kit-pré-teste");
    assert.ok(kit);
    assert.deepEqual(
      [kit.slug, kit.publicado, kit.revisarMigracao, kit.preco, kit.precoPromocional, kit.categoria, kit.tipo, kit.status, kit.descricao],
      ["kit-pre-teste", false, true, 30000, 20000, abte.id, "fisico", "disponivel", "Lida na página."],
    );
    assert.deepEqual(kit.imagens, [{ midiaId: "midia2", ordem: 0 }, { midiaId: "midia1", ordem: 1 }]);
    assert.equal(produtos.get("jogo-parceiro")?.status, "esgotado");
    assert.deepEqual(produtos.get("jogo-parceiro")?.imagens, [], "imagem ainda não importada fica de fora");
    assert.equal(produtos.get("digital-solto")?.categoria, "");
    assert.equal(produtos.get("digital-solto")?.tipo, "digital");

    const registros = (await db.collection(COLECAO_LOG).where("execucao", "==", execucao).get()).docs.map((documento) => documento.data());
    assert.equal(registros.length, 5);
    for (const registro of registros) assert.deepEqual([registro.usuarioId, registro.papel, registro.origem, registro.acao], ["migracao", "sistema", "migracao", "criar"]);
  });

  test("idempotente: a segunda execução não cria nada", async () => {
    const relatorio = await migrar("executar", "20261022-000000-0104");
    assert.ok(relatorio.ok);
    assert.equal(relatorio.contagens.categorias.criadas, 0);
    assert.equal(relatorio.contagens.produtos.criados, 0);
    assert.equal(relatorio.contagens.produtos.jaExistentes, 3);
    assert.equal(await contar("produtos"), 3);
  });

  test("categoria com o mesmo nome que não veio da migração: recusa gravar", async () => {
    const appDoConflito = initializeApp({ projectId: "demo-abte-loja-conflito" }, "testes-loja-conflito");
    const outroProjeto = getFirestore(appDoConflito);
    for (const n of [1]) await outroProjeto.collection("midias").doc(`midia${n}`).set({ origem: { sistema: "wix", midiaId: ID(n), execucao: "x" }, excluidoEm: null });
    await outroProjeto.collection("categoriasDeProdutos").doc("manual").set({ nome: "Produtos ABTE", slug: "produtos-abte" });
    const relatorio = await migrarLoja({ db: outroProjeto, produtos: PRODUTOS, categoriasDoMapa: CATEGORIAS, coletados: COLETADOS, imagensDeOrigem, modo: "executar", execucao: "20261022-000000-0105", limite: null });
    assert.equal(relatorio.ok, false);
    assert.match(relatorio.ok ? "" : relatorio.mensagem, /Já existe uma categoria de produtos chamada/);
    assert.equal((await outroProjeto.collection("produtos").count().get()).data().count, 0);
    await deleteApp(appDoConflito);
  });

  test("desfazer: pula o produto editado por pessoa e a categoria que ele ainda usa; editados só com a confirmação certa", async () => {
    const execucao = "20261022-000000-0103";
    const kit = (await daExecucao("produtos", execucao)).find((documento) => documento.get("origem.chave") === "kit-pré-teste");
    assert.ok(kit);
    const lote = db.batch();
    lote.update(kit.ref, { selo: "Revisado" });
    registrarNoLote(db, lote, PESSOA, { colecao: "produtos", documentoId: kit.id, acao: "editar", campos: ["selo"], resumo: "Produto alterado." });
    await lote.commit();

    const simulado = await desfazerLoja({ db, execucaoAlvo: execucao, execucao: "20261022-000000-0106", modo: "simulacao", incluirEditados: false });
    assert.deepEqual(simulado.contagens, { encontrados: 5, desfeitos: 3, pulados: 2, editadosPorPessoaQueSairiam: 0 });
    assert.deepEqual(simulado.pulados.map((item) => item.motivo).sort(), ["alterado por uma pessoa depois da importação", "usada por um produto que fica"]);

    const feito = await desfazerLoja({ db, execucaoAlvo: execucao, execucao: "20261022-000000-0107", modo: "executar", incluirEditados: false });
    assert.equal(feito.contagens.desfeitos, 3);
    assert.equal(await contar("produtos"), 1);
    assert.equal(await contar("categoriasDeProdutos"), 1);

    const recusado = await desfazerLoja({ db, execucaoAlvo: execucao, execucao: "20261022-000000-0108", modo: "executar", incluirEditados: true, confirmacaoDeEditados: 0 });
    assert.match(recusado.bloqueado ?? "", /Nada foi apagado: 1 documento/);
    assert.equal(await contar("produtos"), 1);
    const confirmado = await desfazerLoja({ db, execucaoAlvo: execucao, execucao: "20261022-000000-0109", modo: "executar", incluirEditados: true, confirmacaoDeEditados: 1 });
    assert.equal(confirmado.contagens.desfeitos, 2, "o produto editado e a categoria que ficou livre");
    assert.equal(await contar("produtos"), 0);
    assert.equal(await contar("categoriasDeProdutos"), 0);
  });
});

describe("Script migrar-loja (emulador, só recusas)", () => {
  function rodar(args: string[], projeto = PROJETO): Promise<{ codigo: number; saida: string }> {
    return new Promise((resolver) => {
      execFile(process.execPath, ["scripts/migrar-loja.mts", ...args], { encoding: "utf8", env: { ...process.env, FIREBASE_ADMIN_PROJECT_ID: projeto } }, (erro, stdout, stderr) =>
        resolver({ codigo: erro ? Number(erro.code ?? 1) : 0, saida: `${stdout}${stderr}` }),
      );
    });
  }

  test("--executar sem a confirmação certa não grava; projeto fora de demo- no emulador é recusado", async () => {
    const antes = await contar("produtos");
    for (const args of [["--executar"], ["--executar", "--confirmo-projeto=abte-dev"]]) {
      const { codigo, saida } = await rodar(args);
      assert.equal(codigo, 1, saida);
      assert.match(saida, /Nada foi gravado/);
    }
    assert.equal((await rodar([], "abte-dev")).codigo, 1);
    assert.equal(await contar("produtos"), antes);
  });
});
