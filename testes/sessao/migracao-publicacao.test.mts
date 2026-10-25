// Testes da publicação do conteúdo importado no emulador do Firestore (npm
// run test:sessao), num projeto só deles (demo-abte-publicar). Documentos
// fictícios; nada sai da máquina. Nada aqui toca o projeto real.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { COLECAO_LOG } from "../../src/lib/log/alteracoes.ts";
import { RESUMO_DA_PUBLICACAO, TIPOS_DE_PUBLICACAO, desfazerPublicacao, publicarMigracao } from "../../src/lib/migracao/publicacao.ts";

const PROJETO = "demo-abte-publicar";
const EXECUCAO_DA_IMPORTACAO = "20261023-000000-0700";
const origem = (chave: string) => ({ sistema: "wix", chave, execucao: EXECUCAO_DA_IMPORTACAO });
const criadoEm = new Date("2026-10-23T20:00:00Z");

let app: App;
let db: Firestore;

const publicar = (modo: "simulacao" | "executar", execucao: string, tipos = [...TIPOS_DE_PUBLICACAO], limite: number | null = null) => publicarMigracao({ db, tipos, modo, execucao, limite });
const ler = async (colecao: string, id: string) => (await db.collection(colecao).doc(id).get()).data() ?? {};

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: PROJETO }, "testes-migracao-publicacao");
  db = getFirestore(app);
  const base = { criadoEm, atualizadoEm: criadoEm, excluidoEm: null, revisarMigracao: true };
  await db.collection("profissionais").doc("p1").set({ ...base, ativo: false, fotoMidiaId: null, origem: origem("p1") });
  await db.collection("profissionais").doc("p2").set({ ...base, ativo: false, fotoMidiaId: "m1", origem: origem("p2"), excluidoEm: new Date() });
  // Do painel (sem origem): nunca é tocado.
  await db.collection("profissionais").doc("doPainel").set({ ...base, ativo: false });
  await db.collection("produtos").doc("pr1").set({ ...base, publicado: false, imagens: [], origem: origem("pr1") });
  await db.collection("posts").doc("po1").set({ ...base, status: "rascunho", publicadoEm: new Date("2020-05-01"), capaMidiaId: null, conteudo: "Texto.\n\n![x](midia:wix:7dce06_a~mv2.avif)\n", origem: origem("po1") });
  await db.collection("posts").doc("po2").set({ ...base, status: "rascunho", publicadoEm: new Date("2021-05-01"), capaMidiaId: "m1", conteudo: "Texto.", origem: origem("po2") });
  await db.collection("artigos").doc("a1").set({ ...base, status: "rascunho", titulo: "Título a confirmar (artigo 1)", autores: "", imagemMidiaId: null, origem: origem("a1") });
  await db.collection("diretoria").doc("d1").set({ ...base, cargo: "Presidente", nome: "TESTE Pessoa", fotoMidiaId: "m1", periodo: "2025-2027", ordem: 1, origem: origem("d1") });
  await db.collection("categoriasDeArtigos").doc("c1").set({ ...base, nome: "A classificar", ativa: false, origem: origem("a-classificar") });
  await db.collection("categoriasDeProdutos").doc("cp1").set({ ...base, nome: "Produtos fictícios", origem: origem("cp1") });
  await db.collection("midias").doc("m1").set({ conferenciaDeMenor: "pendente", origem: { sistema: "wix", midiaId: "x", execucao: "y" } });
});

after(async () => {
  await deleteApp(app);
});

describe("Publicação do conteúdo importado (emulador)", () => {
  test("simulação não grava nada e conta por coleção", async () => {
    const relatorio = await publicar("simulacao", "20261024-000000-0701");
    const de = (colecao: string) => relatorio.colecoes.find((item) => item.colecao === colecao)?.contagens;
    assert.deepEqual([de("profissionais")?.total, de("profissionais")?.foraDaMigracao, de("profissionais")?.aPublicar, de("profissionais")?.naLixeira], [3, 1, 1, 1]);
    assert.equal(de("categoriasDeProdutos")?.semCampoDeVisibilidade, 1);
    assert.equal(de("artigos")?.avisos.tituloAConfirmar, 1);
    assert.equal(de("posts")?.avisos.imagemPendenteNoTexto, 1);
    assert.equal((await db.collection(COLECAO_LOG).count().get()).data().count, 0);
    assert.equal((await ler("posts", "po1")).status, "rascunho");
    assert.doesNotMatch(JSON.stringify(relatorio), /TESTE Pessoa/);
  });

  test("execução liga só os importados fora da lixeira, sem tocar atualizadoEm nem a conferência de menores", async () => {
    const execucao = "20261024-000000-0702";
    await publicar("executar", execucao);
    assert.equal((await ler("profissionais", "p1")).ativo, true);
    assert.equal((await ler("profissionais", "p2")).ativo, false, "na lixeira");
    assert.equal((await ler("profissionais", "doPainel")).ativo, false, "sem origem da migração");
    assert.equal((await ler("produtos", "pr1")).publicado, true);
    const post = await ler("posts", "po1");
    assert.equal(post.status, "publicado");
    assert.equal(post.publicadoEm.toDate().toISOString(), "2020-05-01T00:00:00.000Z", "data original");
    assert.equal(post.atualizadoEm.toDate().getTime(), criadoEm.getTime());
    assert.equal(post.revisarMigracao, true);
    const artigo = await ler("artigos", "a1");
    assert.equal(artigo.status, "publicado");
    assert.ok(artigo.publicadoEm, "artigo ganha a data de agora");
    assert.equal((await ler("diretoria", "d1")).ativo, true);
    assert.equal((await ler("categoriasDeArtigos", "c1")).ativa, true);
    assert.deepEqual(Object.keys(await ler("categoriasDeProdutos", "cp1")).includes("ativa"), false, "categoria de produto sem campo novo");
    assert.equal((await ler("midias", "m1")).conferenciaDeMenor, "pendente");

    const registros = (await db.collection(COLECAO_LOG).where("execucao", "==", execucao).get()).docs.map((documento) => documento.data());
    assert.equal(registros.length, 7);
    for (const registro of registros) {
      assert.deepEqual([registro.usuarioId, registro.papel, registro.origem, registro.acao, registro.resumo], ["migracao", "sistema", "migracao", "editar", RESUMO_DA_PUBLICACAO]);
    }
    assert.deepEqual(registros.find((registro) => registro.colecao === "artigos")?.campos, ["status", "publicadoEm"]);
  });

  test("idempotente: a segunda execução não acha nada a publicar", async () => {
    const relatorio = await publicar("executar", "20261024-000000-0703");
    assert.equal(relatorio.colecoes.reduce((soma, item) => soma + item.contagens.publicados, 0), 0);
    assert.equal((await db.collection(COLECAO_LOG).where("execucao", "==", "20261024-000000-0703").get()).size, 0);
  });

  test("desfazer volta ao estado de antes e pula o que uma pessoa mudou depois", async () => {
    const alvo = "20261024-000000-0702";
    // Uma pessoa voltou o produto a rascunho; outra editou o post no painel.
    await db.collection("produtos").doc("pr1").update({ publicado: false });
    await db.collection("posts").doc("po2").update({ atualizadoEm: new Date(Date.now() + 60_000) });

    const simulado = await desfazerPublicacao({ db, execucaoAlvo: alvo, execucao: "20261024-000000-0704", modo: "simulacao" });
    assert.deepEqual([simulado.contagens.encontrados, simulado.contagens.aDesfazer, simulado.contagens.pulados], [7, 5, 2]);
    assert.equal((await ler("posts", "po1")).status, "publicado", "simulação não grava");

    const feito = await desfazerPublicacao({ db, execucaoAlvo: alvo, execucao: "20261024-000000-0705", modo: "executar" });
    assert.equal(feito.contagens.desfeitos, 5);
    assert.equal((await ler("profissionais", "p1")).ativo, false);
    assert.equal((await ler("posts", "po1")).status, "rascunho");
    assert.equal((await ler("posts", "po2")).status, "publicado", "editado por pessoa depois: fica");
    const artigo = await ler("artigos", "a1");
    assert.equal(artigo.status, "rascunho");
    assert.equal("publicadoEm" in artigo, false, "a data gravada pela publicação sai");
    assert.equal((await ler("diretoria", "d1")).ativo, false);
    assert.equal((await ler("categoriasDeArtigos", "c1")).ativa, false);
    assert.equal((await db.collection(COLECAO_LOG).where("execucao", "==", "20261024-000000-0705").get()).size, 5);
  });
});

describe("Script publicar-migracao (emulador, só recusas)", () => {
  function rodar(args: string[], projeto = PROJETO): Promise<{ codigo: number; saida: string }> {
    return new Promise((resolver) => {
      execFile(process.execPath, ["scripts/publicar-migracao.mts", ...args], { encoding: "utf8", env: { ...process.env, FIREBASE_ADMIN_PROJECT_ID: projeto } }, (erro, stdout, stderr) =>
        resolver({ codigo: erro ? Number(erro.code ?? 1) : 0, saida: `${stdout}${stderr}` }),
      );
    });
  }

  test("sem --tipo, sem a confirmação certa ou fora de demo- no emulador, nada é gravado", async () => {
    const antes = (await db.collection(COLECAO_LOG).count().get()).data().count;
    const semTipo = await rodar([]);
    assert.equal(semTipo.codigo, 1, semTipo.saida);
    assert.match(semTipo.saida, /--tipo=/);
    for (const args of [["--tipo=todos", "--executar"], ["--tipo=todos", "--executar", "--confirmo-projeto=abte-dev"]]) {
      const { codigo, saida } = await rodar(args);
      assert.equal(codigo, 1, saida);
      assert.match(saida, /Nada foi gravado/);
    }
    assert.equal((await rodar(["--tipo=todos"], "abte-dev")).codigo, 1);
    assert.equal((await db.collection(COLECAO_LOG).count().get()).data().count, antes);
  });
});
