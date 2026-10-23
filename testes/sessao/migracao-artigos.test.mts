// Testes da migração dos artigos no emulador do Firestore (npm run
// test:sessao), num projeto só deles (demo-abte-artigos). Artigos, imagens e
// PDFs fictícios; nada sai da máquina. Nada aqui toca o projeto real.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { gravarArtigo } from "../../src/lib/gravacao/artigos.ts";
import { COLECAO_LOG } from "../../src/lib/log/alteracoes.ts";
import { COLECAO_CATEGORIAS_DE_ARTIGOS, MENSAGEM_SEM_IMAGENS_DOS_ARTIGOS, desfazerArtigos, lerArtigosDoMapa, migrarArtigos, type ArtigoDoMapa, type PdfDoMapa } from "../../src/lib/migracao/artigos.ts";
import { validarImagensOrigem, type ImagemDeOrigem } from "../../src/lib/migracao/imagensOrigem.ts";

const PROJETO = "demo-abte-artigos";
const hex = (n: number) => n.toString(16).padStart(32, "0");
const IMAGEM = (n: number) => `7dce06_${hex(n)}~mv2.jpg`;
const PDF = (n: number) => `7dce06_${hex(n)}.pdf`;

let app: App;
let db: Firestore;
let artigos: ArtigoDoMapa[];
let pdfs: PdfDoMapa[];
let imagensDeOrigem: ImagemDeOrigem[];

const migrar = (modo: "simulacao" | "executar", execucao: string, limite: number | null = null, banco = db) => migrarArtigos({ db: banco, artigos, pdfs, imagensDeOrigem, modo, execucao, limite });

async function contar(colecao: string, banco = db) {
  return (await banco.collection(colecao).count().get()).data().count;
}

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: PROJETO }, "testes-migracao-artigos");
  db = getFirestore(app);
  const lido = lerArtigosDoMapa(
    [
      ...[1, 2, 3].map((n) => JSON.stringify({ tipo: "artigo", chave: `artigo-${n}`, imagem: IMAGEM(n) })),
      JSON.stringify({ tipo: "artigosPdfs", pares: [["artigo-1", PDF(11), PDF(12)], ["artigo-2", PDF(21), PDF(22)]] }),
      JSON.stringify({ tipo: "cartilhasPdfs", arquivos: [PDF(31)] }),
    ].join("\n"),
  );
  assert.ok(lido.ok);
  artigos = lido.artigos;
  pdfs = lido.pdfs;
  const uso = (chave: string) => ({ tipo: "artigo", chaveDeOrigem: chave, rotulo: chave, posicao: 1 });
  const validacao = validarImagensOrigem({ versao: 1, imagens: [1, 2, 3].map((n) => ({ midiaIdWix: IMAGEM(n), usos: [uso(`artigo-${n}`)] })) });
  assert.ok(validacao.ok);
  imagensDeOrigem = validacao.imagens;
  // Categoria criada no painel antes da migração (fica intocada).
  await db.collection(COLECAO_CATEGORIAS_DE_ARTIGOS).doc("doPainel").set({ nome: "Categoria do painel", slug: "categoria-do-painel", ordem: 3, imagemMidiaId: null, excluidoEm: null });
});

after(async () => {
  await deleteApp(app);
});

describe("Migração dos artigos (emulador)", () => {
  test("simulação não grava nada e lista os PDFs adiados", async () => {
    const relatorio = await migrar("simulacao", "20261023-000000-0301");
    assert.ok(relatorio.ok);
    assert.equal(await contar("artigos"), 0);
    assert.equal(await contar(COLECAO_LOG), 0);
    assert.deepEqual([relatorio.contagens.artigos.previstos, relatorio.contagens.pdfs.total, relatorio.categoria.slug, relatorio.categoria.ordem], [3, 5, "a-classificar", 4]);
    assert.ok(relatorio.pdfs.every((pdf) => pdf.motivo === "modelo de PDF adiado"));
    assert.deepEqual(relatorio.artigos.map((artigo) => artigo.titulo), ["Título a confirmar (artigo 1)", "Título a confirmar (artigo 2)", "Título a confirmar (artigo 3)"]);
  });

  test("execução real exige as imagens já importadas", async () => {
    assert.deepEqual(await migrar("executar", "20261023-000000-0302"), { ok: false, mensagem: MENSAGEM_SEM_IMAGENS_DOS_ARTIGOS });
    assert.equal(await contar("artigos"), 0);
  });

  test("execução: categoria A classificar e rascunhos sem título real, imagem pela origem, pendente marcada, um registro por documento", async () => {
    await db.collection("midias").doc("img1").set({ origem: { sistema: "wix", midiaId: IMAGEM(1), execucao: "x" }, excluidoEm: null });
    await db.collection("midias").doc("img2").set({ origem: { sistema: "wix", midiaId: IMAGEM(2), execucao: "x" }, excluidoEm: new Date() });
    const execucao = "20261023-000000-0303";
    const relatorio = await migrar("executar", execucao);
    assert.ok(relatorio.ok);
    assert.deepEqual([relatorio.contagens.artigos.criados, relatorio.contagens.categoria.criada], [3, true]);

    const categoria = (await db.collection(COLECAO_CATEGORIAS_DE_ARTIGOS).where("origem.execucao", "==", execucao).get()).docs[0];
    assert.deepEqual(
      [categoria.get("nome"), categoria.get("slug"), categoria.get("ordem"), categoria.get("ativa"), categoria.get("excluidoEm"), categoria.get("revisarMigracao")],
      ["A classificar", "a-classificar", 4, false, null, true],
    );
    assert.equal(relatorio.categoria.ativa, false);
    const porChave = new Map((await db.collection("artigos").where("origem.execucao", "==", execucao).get()).docs.map((documento) => [documento.get("origem.chave"), documento.data()]));
    const um = porChave.get("artigo-1");
    assert.deepEqual(
      [um?.titulo, um?.categoria, um?.tags, um?.autores, um?.link, um?.resumo, um?.status, um?.imagemMidiaId, um?.revisarMigracao],
      ["Título a confirmar (artigo 1)", categoria.id, [], "", "", "", "rascunho", "img1", true],
    );
    assert.equal(porChave.get("artigo-2")?.imagemMidiaId, null, "imagem na lixeira não é ligada");
    assert.ok(relatorio.artigos.find((artigo) => artigo.chave === "artigo-2")?.motivos.includes("imagemPendente"));
    assert.ok(!relatorio.artigos.find((artigo) => artigo.chave === "artigo-3")?.motivos.includes("pdfAdiado"), "artigo sem PDF no mapa");
    const registros = (await db.collection(COLECAO_LOG).where("execucao", "==", execucao).get()).docs.map((documento) => documento.data());
    assert.equal(registros.length, 4);
    for (const registro of registros) assert.deepEqual([registro.usuarioId, registro.papel, registro.origem, registro.acao], ["migracao", "sistema", "migracao", "criar"]);
  });

  test("idempotente: a segunda execução não cria nada nem outra categoria, e não mexe no campo ativa", async () => {
    const relatorio = await migrar("executar", "20261023-000000-0304");
    assert.ok(relatorio.ok);
    assert.deepEqual([relatorio.contagens.artigos.jaExistentes, relatorio.contagens.artigos.criados, relatorio.contagens.categoria.jaExistente, relatorio.contagens.categoria.criada], [3, 0, true, false]);
    assert.equal(await contar("artigos"), 3);
    assert.equal(await contar(COLECAO_CATEGORIAS_DE_ARTIGOS), 2);
    // Ativada depois por uma pessoa: outra execução não volta para inativa.
    const categoria = (await db.collection(COLECAO_CATEGORIAS_DE_ARTIGOS).where("origem.chave", "==", "a-classificar").get()).docs[0];
    assert.equal(categoria.get("ativa"), false);
    await categoria.ref.update({ ativa: true });
    const deNovo = await migrar("executar", "20261023-000000-0310");
    assert.ok(deNovo.ok);
    assert.equal(deNovo.categoria.ativa, true);
    assert.equal((await categoria.ref.get()).get("ativa"), true);
    await categoria.ref.update({ ativa: false });
  });

  test("categoria A classificar criada no painel: recusa gravar", async () => {
    const appDoConflito = initializeApp({ projectId: "demo-abte-artigos-conflito" }, "testes-artigos-conflito");
    const outro = getFirestore(appDoConflito);
    await outro.collection("midias").doc("m1").set({ origem: { sistema: "wix", midiaId: IMAGEM(1), execucao: "x" }, excluidoEm: null });
    await outro.collection(COLECAO_CATEGORIAS_DE_ARTIGOS).doc("manual").set({ nome: "A Classificar", slug: "a-classificar", ordem: 1 });
    const relatorio = await migrar("executar", "20261023-000000-0305", null, outro);
    assert.equal(relatorio.ok, false);
    assert.match(relatorio.ok ? "" : relatorio.mensagem, /Já existe uma categoria de artigos chamada "A classificar"/);
    assert.equal(await contar("artigos", outro), 0);
    await deleteApp(appDoConflito);
  });

  test("desfazer: pula o artigo editado no painel e a categoria que ele usa; editados só com a confirmação certa", async () => {
    const execucao = "20261023-000000-0303";
    const documentos = (await db.collection("artigos").where("origem.execucao", "==", execucao).get()).docs;
    const um = documentos.find((documento) => documento.get("origem.chave") === "artigo-1");
    assert.ok(um);
    const editado = await gravarArtigo(db, um.id, { titulo: "Título revisado", categoria: um.get("categoria"), tags: [], autores: "", link: "", resumo: "", status: "rascunho", imagemMidiaId: "img1" });
    assert.ok(editado.ok);

    const simulado = await desfazerArtigos({ db, execucaoAlvo: execucao, execucao: "20261023-000000-0306", modo: "simulacao", incluirEditados: false });
    assert.deepEqual(simulado.contagens, { encontrados: 4, desfeitos: 2, pulados: 2, editadosPorPessoaQueSairiam: 0 });
    const feito = await desfazerArtigos({ db, execucaoAlvo: execucao, execucao: "20261023-000000-0307", modo: "executar", incluirEditados: false });
    assert.equal(feito.contagens.desfeitos, 2);
    assert.equal(await contar("artigos"), 1);
    assert.equal(await contar(COLECAO_CATEGORIAS_DE_ARTIGOS), 2, "a categoria fica: o artigo editado usa");

    const recusado = await desfazerArtigos({ db, execucaoAlvo: execucao, execucao: "20261023-000000-0308", modo: "executar", incluirEditados: true, confirmacaoDeEditados: 0 });
    assert.match(recusado.bloqueado ?? "", /Nada foi apagado: 1 documento/);
    const confirmado = await desfazerArtigos({ db, execucaoAlvo: execucao, execucao: "20261023-000000-0309", modo: "executar", incluirEditados: true, confirmacaoDeEditados: 1 });
    assert.equal(confirmado.contagens.desfeitos, 2);
    assert.equal(await contar("artigos"), 0);
    assert.deepEqual((await db.collection(COLECAO_CATEGORIAS_DE_ARTIGOS).get()).docs.map((documento) => documento.id), ["doPainel"], "a categoria do painel nunca sai");
  });
});

describe("Script migrar-artigos (emulador, só recusas)", () => {
  function rodar(args: string[], projeto = PROJETO): Promise<{ codigo: number; saida: string }> {
    return new Promise((resolver) => {
      execFile(process.execPath, ["scripts/migrar-artigos.mts", ...args], { encoding: "utf8", env: { ...process.env, FIREBASE_ADMIN_PROJECT_ID: projeto } }, (erro, stdout, stderr) =>
        resolver({ codigo: erro ? Number(erro.code ?? 1) : 0, saida: `${stdout}${stderr}` }),
      );
    });
  }

  test("--executar sem a confirmação certa não grava; projeto fora de demo- no emulador é recusado", async () => {
    const antes = await contar("artigos");
    for (const args of [["--executar"], ["--executar", "--confirmo-projeto=abte-dev"]]) {
      const { codigo, saida } = await rodar(args);
      assert.equal(codigo, 1, saida);
      assert.match(saida, /Nada foi gravado/);
    }
    assert.equal((await rodar([], "abte-dev")).codigo, 1);
    assert.equal(await contar("artigos"), antes);
  });
});
