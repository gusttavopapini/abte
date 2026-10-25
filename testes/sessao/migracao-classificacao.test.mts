// Testes da classificação dos posts importados e da organização dos artigos
// no emulador do Firestore (npm run test:sessao), num projeto só deles
// (demo-abte-classificar). Dados fictícios; nada sai da máquina.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { COLECAO_LOG } from "../../src/lib/log/alteracoes.ts";
import { CATEGORIAS_DA_CLASSIFICACAO, COLECAO_CATEGORIAS_DE_POSTS, RESUMO_DA_CLASSIFICACAO, classificarPosts, desfazerClassificacao } from "../../src/lib/migracao/classificacao.ts";
import { CATEGORIA_ARTIGOS_CIENTIFICOS, desfazerOrganizacao, organizarArtigos } from "../../src/lib/migracao/organizacaoArtigos.ts";

const origem = (chave: string) => ({ sistema: "wix", chave, execucao: "20261022-000000-0900" });
const criadoEm = new Date("2026-10-23T20:00:00Z");

let app: App;
let db: Firestore;

const ler = async (colecao: string, id: string) => (await db.collection(colecao).doc(id).get()).data() ?? {};

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: "demo-abte-classificar" }, "testes-classificacao");
  db = getFirestore(app);
  const base = { criadoEm, atualizadoEm: criadoEm, revisarMigracao: true, status: "rascunho" };
  await db.collection("posts").doc("pColete").set({ ...base, titulo: "Preciso usar o colete?", slug: "preciso-usar-o-colete", conteudo: "Texto.", origem: origem("p1") });
  await db.collection("posts").doc("pGeral").set({ ...base, titulo: "Mãos atadas", slug: "maos-atadas", conteudo: "Sem termos.", origem: origem("p2") });
  await db.collection("posts").doc("pComCategoria").set({ ...base, titulo: "Diagnóstico precoce", slug: "diagnostico", conteudo: "", categoria: "escolhidaPorPessoa", origem: origem("p3") });
  // Do painel (sem origem): nunca é tocado.
  await db.collection("posts").doc("pPainel").set({ ...base, titulo: "Colete do painel", conteudo: "" });

  await db.collection("categoriasDeArtigos").doc("aClassificar").set({ nome: "A classificar", slug: "a-classificar", ativa: true, ordem: 2, origem: origem("a-classificar"), criadoEm, atualizadoEm: criadoEm, excluidoEm: null });
  await db.collection("categoriasDeArtigos").doc("doPainel").set({ nome: "Exemplo", slug: "exemplo", ordem: 0, criadoEm, atualizadoEm: criadoEm, excluidoEm: null });
  for (const n of [1, 2]) {
    await db.collection("artigos").doc(`art${n}`).set({ titulo: `Título a confirmar (artigo ${n})`, autores: "", resumo: "", categoria: "aClassificar", status: "rascunho", origem: origem(`artigo-${n}`), revisarMigracao: true, criadoEm, atualizadoEm: criadoEm });
  }
});

after(async () => {
  await deleteApp(app);
});

describe("Classificação dos posts (emulador)", () => {
  test("simulação não grava nada", async () => {
    const resultado = await classificarPosts({ db, modo: "simulacao", execucao: "20261025-000000-0901", limite: null });
    assert.ok(resultado.ok);
    assert.deepEqual([resultado.relatorio.contagens.postsImportados, resultado.relatorio.contagens.jaComCategoria, resultado.relatorio.contagens.candidatos, resultado.relatorio.contagens.categoriasACriar], [3, 1, 2, 7]);
    assert.equal((await db.collection(COLECAO_CATEGORIAS_DE_POSTS).count().get()).data().count, 0);
    assert.equal((await db.collection(COLECAO_LOG).count().get()).data().count, 0);
    assert.doesNotMatch(JSON.stringify(resultado.relatorio), /preciso-usar|maos-atadas/, "o relatório não leva slugs");
  });

  test("execução: 7 categorias ativas, só os importados sem categoria, revisão marcada, sem tocar atualizadoEm", async () => {
    const resultado = await classificarPosts({ db, modo: "executar", execucao: "20261025-000000-0902", limite: null });
    assert.ok(resultado.ok);
    const categorias = (await db.collection(COLECAO_CATEGORIAS_DE_POSTS).get()).docs;
    assert.deepEqual(categorias.map((documento) => documento.get("slug")).sort(), CATEGORIAS_DA_CLASSIFICACAO.map((categoria) => categoria.slug).sort());
    assert.ok(categorias.every((documento) => documento.get("ativa") === true));
    const idDe = (slug: string) => categorias.find((documento) => documento.get("slug") === slug)?.id;
    const coleteDoc = await ler("posts", "pColete");
    assert.equal(coleteDoc.categoria, idDe("colete-e-ortese"));
    assert.equal(coleteDoc.revisarClassificacao, true);
    assert.equal(coleteDoc.atualizadoEm.toDate().getTime(), criadoEm.getTime());
    assert.equal((await ler("posts", "pGeral")).categoria, idDe("geral"));
    assert.equal((await ler("posts", "pComCategoria")).categoria, "escolhidaPorPessoa");
    assert.equal((await ler("posts", "pPainel")).categoria, undefined);
    const registros = (await db.collection(COLECAO_LOG).where("execucao", "==", "20261025-000000-0902").get()).docs.map((documento) => documento.data());
    assert.equal(registros.length, 7 + 2);
    assert.equal(registros.filter((registro) => registro.resumo === RESUMO_DA_CLASSIFICACAO).length, 2);
    assert.ok(registros.every((registro) => registro.usuarioId === "migracao" && registro.papel === "sistema" && registro.origem === "migracao"));
  });

  test("idempotente e desfazer: volta sem categoria, apaga as categorias criadas; pula o post alterado depois", async () => {
    const segunda = await classificarPosts({ db, modo: "executar", execucao: "20261025-000000-0903", limite: null });
    assert.ok(segunda.ok);
    assert.deepEqual([segunda.relatorio.contagens.classificados, segunda.relatorio.contagens.categoriasCriadas], [0, 0]);

    await db.collection("posts").doc("pGeral").update({ atualizadoEm: new Date(Date.now() + 60_000) });
    const simulado = await desfazerClassificacao({ db, execucaoAlvo: "20261025-000000-0902", execucao: "20261025-000000-0904", modo: "simulacao" });
    assert.deepEqual(simulado.contagens, { postsQueVoltam: 1, categoriasQueSaem: 6, pulados: 2 }, "o post alterado e a categoria Geral, ainda usada por ele, ficam");
    await desfazerClassificacao({ db, execucaoAlvo: "20261025-000000-0902", execucao: "20261025-000000-0905", modo: "executar" });
    const colete = await ler("posts", "pColete");
    assert.equal("categoria" in colete || "revisarClassificacao" in colete, false);
    assert.equal((await db.collection(COLECAO_CATEGORIAS_DE_POSTS).count().get()).data().count, 1);
  });
});

describe("Organização dos artigos (emulador)", () => {
  const textos = new Map([["artigo-1", { titulo: "TESTE Título lido", autores: "TESTE Autores" }], ["artigo-2", { titulo: "", autores: "" }]]);

  test("cria Artigos científicos ativa, grava só o legível, desativa A classificar; desfazer volta tudo", async () => {
    const simulado = await organizarArtigos({ db, textos, modo: "simulacao", execucao: "20261025-000000-0911" });
    assert.ok(simulado.ok);
    assert.equal((await db.collection(COLECAO_LOG).where("execucao", "==", "20261025-000000-0911").get()).size, 0);

    const feito = await organizarArtigos({ db, textos, modo: "executar", execucao: "20261025-000000-0912" });
    assert.ok(feito.ok);
    const cientificos = (await db.collection("categoriasDeArtigos").where("origem.chave", "==", CATEGORIA_ARTIGOS_CIENTIFICOS.chave).get()).docs[0];
    assert.ok(cientificos);
    assert.deepEqual([cientificos.get("nome"), cientificos.get("ativa")], ["Artigos científicos", true]);
    const um = await ler("artigos", "art1");
    assert.deepEqual([um.titulo, um.autores, um.categoria, um.revisarMigracao], ["TESTE Título lido", "TESTE Autores", cientificos.id, true]);
    assert.equal(um.atualizadoEm.toDate().getTime(), criadoEm.getTime());
    const dois = await ler("artigos", "art2");
    assert.deepEqual([dois.titulo, dois.categoria], ["Título a confirmar (artigo 2)", cientificos.id], "sem título legível, o provisório fica");
    assert.equal((await ler("categoriasDeArtigos", "aClassificar")).ativa, false);

    const segunda = await organizarArtigos({ db, textos, modo: "executar", execucao: "20261025-000000-0913" });
    assert.ok(segunda.ok);
    assert.equal(segunda.relatorio.contagens.alterados, 0, "idempotente");

    await desfazerOrganizacao({ db, execucaoAlvo: "20261025-000000-0912", execucao: "20261025-000000-0914", modo: "executar" });
    const volta = await ler("artigos", "art1");
    assert.deepEqual([volta.titulo, volta.autores, volta.categoria], ["Título a confirmar (artigo 1)", "", "aClassificar"]);
    assert.equal((await ler("categoriasDeArtigos", "aClassificar")).ativa, true);
    assert.equal((await db.collection("categoriasDeArtigos").doc(cientificos.id).get()).exists, false);
  });

  test("recusa se já existe, fora da migração, uma categoria Artigos científicos", async () => {
    await db.collection("categoriasDeArtigos").doc("pessoa").set({ nome: "Artigos Científicos", slug: "artigos-cientificos", excluidoEm: null });
    const resultado = await organizarArtigos({ db, textos, modo: "executar", execucao: "20261025-000000-0915" });
    assert.equal(resultado.ok, false);
  });
});

describe("Scripts classificar-posts e organizar-artigos (emulador, só recusas)", () => {
  function rodar(script: string, args: string[], projeto = "demo-abte-classificar"): Promise<{ codigo: number; saida: string }> {
    return new Promise((resolver) => {
      execFile(process.execPath, [script, ...args], { encoding: "utf8", env: { ...process.env, FIREBASE_ADMIN_PROJECT_ID: projeto } }, (erro, stdout, stderr) =>
        resolver({ codigo: erro ? Number(erro.code ?? 1) : 0, saida: `${stdout}${stderr}` }),
      );
    });
  }

  test("sem a confirmação certa ou fora de demo- no emulador, nada é gravado", async () => {
    const antes = (await db.collection(COLECAO_LOG).count().get()).data().count;
    for (const script of ["scripts/classificar-posts.mts", "scripts/organizar-artigos.mts"]) {
      for (const args of [["--executar"], ["--executar", "--confirmo-projeto=abte-dev"]]) {
        const { codigo, saida } = await rodar(script, args);
        assert.equal(codigo, 1, saida);
        assert.match(saida, /Nada foi gravado/);
      }
      assert.equal((await rodar(script, [], "abte-dev")).codigo, 1);
    }
    assert.equal((await db.collection(COLECAO_LOG).count().get()).data().count, antes);
  });
});
