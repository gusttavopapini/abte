// Testes da migração da diretoria no emulador do Firestore (npm run
// test:sessao), num projeto só deles (demo-abte-diretoria). Pessoas, imagens
// e profissionais fictícios; nada sai da máquina. Nada aqui toca o projeto real.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { COLECAO_LOG } from "../../src/lib/log/alteracoes.ts";
import { listarUsos } from "../../src/lib/midia/biblioteca.ts";
import { COLECAO_DIRETORIA, MENSAGEM_SEM_IMAGENS_DA_DIRETORIA, desfazerDiretoria, lerDiretoriaDoMapa, migrarDiretoria, type MembroDoMapa } from "../../src/lib/migracao/diretoria.ts";
import { validarImagensOrigem, type ImagemDeOrigem } from "../../src/lib/migracao/imagensOrigem.ts";
import { desfazerProfissionais } from "../../src/lib/migracao/profissionais.ts";

const PROJETO = "demo-abte-diretoria";
const hex = (n: number) => n.toString(16).padStart(32, "0");
const FOTO = (n: number) => `7dce06_${hex(n)}~mv2.jpg`;

let app: App;
let db: Firestore;
let membros: MembroDoMapa[];
let imagensDeOrigem: ImagemDeOrigem[];

const migrar = (modo: "simulacao" | "executar", execucao: string, limite: number | null = null) =>
  migrarDiretoria({ db, membros, imagensDeOrigem, nomesDoArquivoDeProfissionais: ["TESTE Pessoa Um", "TESTE Pessoa Dois"], modo, execucao, limite });

async function contar(colecao: string) {
  return (await db.collection(colecao).count().get()).data().count;
}

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: PROJETO }, "testes-migracao-diretoria");
  db = getFirestore(app);
  const lido = lerDiretoriaDoMapa(
    [
      { cargo: "presidente", nome: "TESTE Pessoa Um", foto: FOTO(1) },
      { cargo: "vice-presidente", nome: "TESTE Pessoa Dois", foto: FOTO(2) },
      { cargo: "secretaria-geral", nome: "TESTE Pessoa Três", foto: FOTO(3) },
    ]
      .map((membro) => JSON.stringify({ tipo: "diretoria", periodo: "2025-2027", ...membro }))
      .join("\n"),
  );
  assert.ok(lido.ok);
  membros = lido.membros;
  const uso = (chave: string) => ({ tipo: "diretoria", chaveDeOrigem: chave, rotulo: chave, posicao: 1 });
  const validacao = validarImagensOrigem({ versao: 1, imagens: membros.map((membro, i) => ({ midiaIdWix: FOTO(i + 1), usos: [uso(membro.chave)] })) });
  assert.ok(validacao.ok);
  imagensDeOrigem = validacao.imagens;
});

after(async () => {
  await deleteApp(app);
});

describe("Migração da diretoria (emulador)", () => {
  test("simulação não grava nada e não leva nomes no relatório", async () => {
    const relatorio = await migrar("simulacao", "20261023-000000-0401");
    assert.ok(relatorio.ok);
    assert.equal(await contar(COLECAO_DIRETORIA), 0);
    assert.equal(await contar(COLECAO_LOG), 0);
    assert.deepEqual([relatorio.contagens.previstos, relatorio.contagens.casariamComOArquivoDeProfissionais], [3, 2]);
    assert.doesNotMatch(JSON.stringify(relatorio), /TESTE Pessoa/);
  });

  test("execução real exige as imagens já importadas", async () => {
    assert.deepEqual(await migrar("executar", "20261023-000000-0402"), { ok: false, mensagem: MENSAGEM_SEM_IMAGENS_DA_DIRETORIA });
    assert.equal(await contar(COLECAO_DIRETORIA), 0);
  });

  test("execução: modelo mínimo, foto pela origem, profissional só pelo nome exato e único, um registro por membro", async () => {
    await db.collection("midias").doc("foto1").set({ origem: { sistema: "wix", midiaId: FOTO(1), execucao: "x" }, excluidoEm: null });
    await db.collection("midias").doc("foto2").set({ origem: { sistema: "wix", midiaId: FOTO(2), execucao: "x" }, excluidoEm: new Date() });
    await db.collection("profissionais").doc("profUm").set({ nome: "teste  pessoa um", origem: { sistema: "wix", chave: "p1", execucao: "20261023-000000-0499" }, excluidoEm: null });
    // Dois profissionais com o mesmo nome: nenhuma ligação.
    await db.collection("profissionais").doc("profDoisA").set({ nome: "TESTE Pessoa Dois", excluidoEm: null });
    await db.collection("profissionais").doc("profDoisB").set({ nome: "TESTE Pessoa Dois", excluidoEm: null });
    // Na lixeira: não conta.
    await db.collection("profissionais").doc("profTres").set({ nome: "TESTE Pessoa Três", excluidoEm: new Date() });

    const execucao = "20261023-000000-0403";
    const relatorio = await migrar("executar", execucao);
    assert.ok(relatorio.ok);
    assert.equal(relatorio.contagens.criados, 3);
    const porChave = new Map((await db.collection(COLECAO_DIRETORIA).where("origem.execucao", "==", execucao).get()).docs.map((documento) => [documento.get("origem.chave"), documento]));
    const presidente = porChave.get("presidente");
    assert.ok(presidente);
    assert.deepEqual(
      Object.keys(presidente.data()).sort(),
      ["atualizadoEm", "cargo", "criadoEm", "excluidoEm", "fotoMidiaId", "nome", "ordem", "origem", "periodo", "profissionalId", "revisarMigracao"],
    );
    assert.deepEqual(
      [presidente.get("cargo"), presidente.get("nome"), presidente.get("fotoMidiaId"), presidente.get("periodo"), presidente.get("ordem"), presidente.get("profissionalId"), presidente.get("excluidoEm"), presidente.get("revisarMigracao")],
      ["Presidente", "TESTE Pessoa Um", "foto1", "2025-2027", 1, "profUm", null, true],
    );
    assert.deepEqual([porChave.get("vice-presidente")?.get("fotoMidiaId"), porChave.get("vice-presidente")?.get("profissionalId")], [null, null]);
    assert.equal(porChave.get("secretaria-geral")?.get("profissionalId"), null);
    assert.ok(relatorio.membros.find((membro) => membro.chave === "vice-presidente")?.motivos.includes("nomeComMaisDeUmProfissional"));

    const registros = (await db.collection(COLECAO_LOG).where("execucao", "==", execucao).get()).docs.map((documento) => documento.data());
    assert.equal(registros.length, 3);
    for (const registro of registros) assert.deepEqual([registro.usuarioId, registro.papel, registro.origem, registro.acao, registro.colecao], ["migracao", "sistema", "migracao", "criar", "diretoria"]);

    // A foto da diretoria conta como em uso, e o profissional ligado não sai no desfazer dos profissionais.
    assert.deepEqual((await listarUsos(db, "foto1")).find((uso) => uso.rotulo === "Diretoria (foto)")?.registros, ["TESTE Pessoa Um"]);
    const semProf = await desfazerProfissionais({ db, execucaoAlvo: "20261023-000000-0499", execucao: "20261023-000000-0498", modo: "simulacao", incluirEditados: false });
    assert.ok(semProf.pulados.some((item) => item.motivo === "ligado à diretoria"));
  });

  test("idempotente: a segunda execução não cria nada; --limite vale só para os novos", async () => {
    const relatorio = await migrar("executar", "20261023-000000-0404", 1);
    assert.ok(relatorio.ok);
    assert.deepEqual([relatorio.contagens.jaExistentes, relatorio.contagens.nestaExecucao, relatorio.contagens.criados], [3, 0, 0]);
    assert.equal(await contar(COLECAO_DIRETORIA), 3);
  });

  test("desfazer: pula o alterado depois; com --incluir-editadas só com a confirmação certa", async () => {
    const execucao = "20261023-000000-0403";
    const presidente = (await db.collection(COLECAO_DIRETORIA).where("origem.chave", "==", "presidente").get()).docs[0];
    await presidente.ref.update({ atualizadoEm: new Date(Date.now() + 1000) });
    const simulado = await desfazerDiretoria({ db, execucaoAlvo: execucao, execucao: "20261023-000000-0405", modo: "simulacao", incluirEditados: false });
    assert.deepEqual(simulado.contagens, { encontrados: 3, desfeitos: 2, pulados: 1, editadosPorPessoaQueSairiam: 0 });
    const feito = await desfazerDiretoria({ db, execucaoAlvo: execucao, execucao: "20261023-000000-0406", modo: "executar", incluirEditados: false });
    assert.equal(feito.contagens.desfeitos, 2);
    assert.equal(await contar(COLECAO_DIRETORIA), 1);
    const recusado = await desfazerDiretoria({ db, execucaoAlvo: execucao, execucao: "20261023-000000-0407", modo: "executar", incluirEditados: true, confirmacaoDeEditados: 0 });
    assert.match(recusado.bloqueado ?? "", /Nada foi apagado: 1 membro/);
    const confirmado = await desfazerDiretoria({ db, execucaoAlvo: execucao, execucao: "20261023-000000-0408", modo: "executar", incluirEditados: true, confirmacaoDeEditados: 1 });
    assert.equal(confirmado.contagens.desfeitos, 1);
    assert.equal(await contar(COLECAO_DIRETORIA), 0);
  });
});

describe("Script migrar-diretoria (emulador, só recusas)", () => {
  function rodar(args: string[], projeto = PROJETO): Promise<{ codigo: number; saida: string }> {
    return new Promise((resolver) => {
      execFile(process.execPath, ["scripts/migrar-diretoria.mts", ...args], { encoding: "utf8", env: { ...process.env, FIREBASE_ADMIN_PROJECT_ID: projeto } }, (erro, stdout, stderr) =>
        resolver({ codigo: erro ? Number(erro.code ?? 1) : 0, saida: `${stdout}${stderr}` }),
      );
    });
  }

  test("--executar sem a confirmação certa não grava; projeto fora de demo- no emulador é recusado", async () => {
    const antes = await contar(COLECAO_DIRETORIA);
    for (const args of [["--executar"], ["--executar", "--confirmo-projeto=abte-dev"]]) {
      const { codigo, saida } = await rodar(args);
      assert.equal(codigo, 1, saida);
      assert.match(saida, /Nada foi gravado/);
    }
    assert.equal((await rodar([], "abte-dev")).codigo, 1);
    assert.equal(await contar(COLECAO_DIRETORIA), antes);
  });
});
