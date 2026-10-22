// Testes da migração dos profissionais no emulador do Firestore (npm run
// test:sessao), num projeto só deles (demo-abte-profissionais), para não mexer
// nos dados dos outros testes. Registros e imagens fictícios. Nada aqui toca
// o projeto real.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { gravarProfissional } from "../../src/lib/gravacao/profissionais.ts";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { MENSAGEM_SEM_IMAGENS, desfazerProfissionais, migrarProfissionais, validarProfissionaisOrigem, type RegistroDeOrigem } from "../../src/lib/migracao/profissionais.ts";
import type { DadosDoProfissional } from "../../src/lib/profissionais.ts";

const PROJETO = "demo-abte-profissionais";
const PESSOA: AutorDaAlteracao = { uid: "teste-prof-editor", nome: "TESTE Editor", papel: "editor" };
const hex = (n: number) => n.toString(16).padStart(32, "0");
const FOTOS = { um: `7dce06_${hex(1)}~mv2.jpg`, dois: `7dce06_${hex(2)}~mv2.jpg`, extra: `7dce06_${hex(3)}~mv2.jpg`, naLixeira: `7dce06_${hex(4)}~mv2.jpg`, faltando: `7dce06_${hex(5)}~mv2.jpg` };

let app: App;
let db: Firestore;
let registros: RegistroDeOrigem[];

function bruto(n: number, extra: Record<string, unknown> = {}) {
  return {
    id: `pessoa-ficticia-${n}`,
    tipo: "fisioterapeuta",
    grupo: "membro",
    tratamento: "Dra.",
    nome: `Pessoa Fictícia ${n}`,
    conselho: "CREFITO",
    registro: `Registro ${n}`,
    metodos: ["Schroth ISST"],
    pais: "Brasil",
    uf: "SP",
    cidades: ["Cidade Exemplo"],
    telerreabilitacao: false,
    telefones: ["5511900000000"],
    whatsapp: "5511912345678",
    instagram: `perfil.exemplo${n}`,
    facebook: null,
    email: null,
    endereco: "Endereço fora do modelo",
    fotoOrigemWixId: [],
    bio: null,
    ativo: false,
    ordem: n,
    revisar: [],
    ...extra,
  };
}

const ARQUIVO = {
  versao: 1,
  profissionais: [
    bruto(1, { fotoOrigemWixId: [FOTOS.um], revisar: ["ponto de revisão fictício"] }),
    bruto(2, { fotoOrigemWixId: [FOTOS.dois, FOTOS.extra] }),
    bruto(3, { fotoOrigemWixId: [FOTOS.naLixeira], tipo: "medico" }),
    bruto(4, { fotoOrigemWixId: [FOTOS.faltando], whatsapp: "whats.link/exemplo" }),
    bruto(5, { fotoOrigemWixId: [], metodos: ["Método Inventado"] }),
  ],
};

async function contar(colecao: string) {
  return (await db.collection(colecao).count().get()).data().count;
}

async function daExecucao(execucao: string) {
  return (await db.collection("profissionais").where("origem.execucao", "==", execucao).get()).docs;
}

const migrar = (modo: "simulacao" | "executar", execucao: string, limite: number | null = null) => migrarProfissionais({ db, registros, modo, execucao, limite });

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: PROJETO }, "testes-migracao-profissionais");
  db = getFirestore(app);
  const validacao = validarProfissionaisOrigem(ARQUIVO);
  assert.ok(validacao.ok);
  registros = validacao.registros;
});

after(async () => {
  await deleteApp(app);
});

describe("Migração dos profissionais (emulador)", () => {
  test("simulação sem imagens importadas: não grava nada e conta as fotos como pendentes", async () => {
    const relatorio = await migrar("simulacao", "20261022-000000-0001");
    assert.ok(relatorio.ok);
    assert.equal(await contar("profissionais"), 0);
    assert.equal(await contar(COLECAO_LOG), 0);
    const c = relatorio.contagens;
    assert.equal(c.previstos, 5);
    assert.deepEqual(c.porTipoNoArquivo, { fisioterapeuta: 4, medico: 1 });
    assert.deepEqual(c.fotos, { comFotoNoArquivo: 4, semFotoNoArquivo: 1, fotoDupla: 1, seriamLigadasAgora: 0, pendentes: 4, naLixeira: 0 });
    assert.deepEqual(c.pontosDeRevisao, { total: 1, comZeroPontos: 4 });
    assert.equal(c.iriamParaRevisao, 5);
    // Pontos no arquivo (1), foto dupla (2), WhatsApp inválido (4) e método sem correspondência (5).
    assert.equal(c.iriamParaRevisaoComAsFotosLigadas, 4);
    assert.equal(c.porProblema.whatsappInvalido, 1);
    assert.equal(c.porProblema.metodoSemCorrespondencia, 1);
    assert.deepEqual(relatorio.fotoDupla, [2]);
    assert.deepEqual(relatorio.semFoto, [5]);
    assert.doesNotMatch(JSON.stringify(relatorio), /Pessoa Fictícia|pessoa-ficticia|ponto de revisão fictício/);
  });

  test("execução real exige as imagens já importadas", async () => {
    const relatorio = await migrar("executar", "20261022-000000-0002");
    assert.deepEqual(relatorio, { ok: false, mensagem: MENSAGEM_SEM_IMAGENS });
    assert.equal(await contar("profissionais"), 0);
  });

  test("execução: ativo false, foto pela origem, revisão marcada e uma linha de registro por profissional", async () => {
    const midia = (midiaId: string, extra: Record<string, unknown> = {}) => ({ tipo: "imagem", origem: { sistema: "wix", midiaId, execucao: "20261021-000000-0000" }, excluidoEm: null, ...extra });
    await db.collection("midias").doc("fotoUm").set(midia(FOTOS.um));
    await db.collection("midias").doc("fotoDois").set(midia(FOTOS.dois));
    await db.collection("midias").doc("fotoExtra").set(midia(FOTOS.extra));
    await db.collection("midias").doc("fotoNaLixeira").set(midia(FOTOS.naLixeira, { excluidoEm: new Date() }));

    const execucao = "20261022-000000-0003";
    const relatorio = await migrar("executar", execucao);
    assert.ok(relatorio.ok);
    assert.equal(relatorio.contagens.criados, 5);
    assert.deepEqual(relatorio.contagens.fotos, { comFotoNoArquivo: 4, semFotoNoArquivo: 1, fotoDupla: 1, seriamLigadasAgora: 2, pendentes: 1, naLixeira: 1 });

    const porChave = new Map((await daExecucao(execucao)).map((documento) => [documento.get("origem.chave"), documento.data()]));
    const um = porChave.get("pessoa-ficticia-1");
    assert.ok(um);
    assert.equal(um.ativo, false);
    assert.equal(um.fotoMidiaId, "fotoUm");
    assert.equal(um.revisarMigracao, true);
    assert.equal(um.pontosDeRevisao, 1);
    assert.equal(um.ordem, 1);
    assert.deepEqual(um.origem, { sistema: "wix", chave: "pessoa-ficticia-1", execucao });
    for (const campo of ["conselho", "telefones", "endereco", "revisar", "grupo", "fotoOrigemWixId", "nomeBusca", "site"]) assert.equal(um[campo], undefined, campo);
    // Duas fotos: liga a primeira e marca revisão.
    assert.equal(porChave.get("pessoa-ficticia-2")?.fotoMidiaId, "fotoDois");
    assert.equal(porChave.get("pessoa-ficticia-2")?.revisarMigracao, true);
    // Imagem na lixeira ou ainda não importada: campo vazio e revisão.
    assert.equal(porChave.get("pessoa-ficticia-3")?.fotoMidiaId, null);
    assert.equal(porChave.get("pessoa-ficticia-3")?.revisarMigracao, true);
    assert.equal(porChave.get("pessoa-ficticia-4")?.fotoMidiaId, null);
    assert.equal(porChave.get("pessoa-ficticia-4")?.whatsapp, "");
    // Sem foto, sem pontos e sem problema: não vai para revisão.
    const cinco = porChave.get("pessoa-ficticia-5");
    assert.equal(cinco?.revisarMigracao, true, "método sem correspondência marca revisão");

    const registrosDoLog = (await db.collection(COLECAO_LOG).where("execucao", "==", execucao).get()).docs.map((documento) => documento.data());
    assert.equal(registrosDoLog.length, 5);
    for (const registro of registrosDoLog) {
      assert.equal(registro.usuarioId, "migracao");
      assert.equal(registro.papel, "sistema");
      assert.equal(registro.origem, "migracao");
      assert.equal(registro.colecao, "profissionais");
      assert.equal(registro.acao, "criar");
    }
  });

  test("idempotente: a segunda execução dá 0 criados e todos já existentes", async () => {
    const relatorio = await migrar("executar", "20261022-000000-0004");
    assert.ok(relatorio.ok);
    assert.equal(relatorio.contagens.criados, 0);
    assert.equal(relatorio.contagens.jaExistentes, 5);
    assert.equal(await contar("profissionais"), 5);
  });

  test("--limite grava só parte dos candidatos", async () => {
    const extras = validarProfissionaisOrigem({ versao: 1, profissionais: [bruto(10), bruto(11), bruto(12)] });
    assert.ok(extras.ok);
    const relatorio = await migrarProfissionais({ db, registros: extras.registros, modo: "executar", execucao: "20261022-000000-0005", limite: 2 });
    assert.ok(relatorio.ok);
    assert.equal(relatorio.contagens.candidatos, 3);
    assert.equal(relatorio.contagens.criados, 2);
  });

  test("desfazer: simula, depois apaga só a execução indicada e pula o editado por pessoa e o ligado à diretoria", async () => {
    const execucao = "20261022-000000-0003";
    const documentos = await daExecucao(execucao);
    const editado = documentos.find((documento) => documento.get("origem.chave") === "pessoa-ficticia-1");
    const naDiretoria = documentos.find((documento) => documento.get("origem.chave") === "pessoa-ficticia-2");
    assert.ok(editado && naDiretoria);
    const dados = editado.data() as DadosDoProfissional & Record<string, unknown>;
    const campos: DadosDoProfissional = {
      tipo: dados.tipo, tratamento: dados.tratamento, nome: dados.nome, registro: dados.registro, metodos: dados.metodos, pais: dados.pais, uf: dados.uf,
      cidades: dados.cidades, telerreabilitacao: dados.telerreabilitacao, whatsapp: dados.whatsapp, instagram: dados.instagram, facebook: dados.facebook,
      email: dados.email, bio: "Apresentação revisada por uma pessoa.", ativo: false, ordem: dados.ordem, fotoMidiaId: dados.fotoMidiaId,
    };
    assert.ok((await gravarProfissional(db, editado.id, campos, PESSOA)).ok);
    await db.collection("diretoria").doc("cargo-ficticio").set({ cargo: "presidente", profissionalId: naDiretoria.id });

    const simulado = await desfazerProfissionais({ db, execucaoAlvo: execucao, execucao: "20261022-000000-0006", modo: "simulacao", incluirEditados: false });
    assert.deepEqual(simulado.contagens, { encontrados: 5, desfeitos: 3, pulados: 2 });
    assert.equal((await daExecucao(execucao)).length, 5);

    const feito = await desfazerProfissionais({ db, execucaoAlvo: execucao, execucao: "20261022-000000-0007", modo: "executar", incluirEditados: false });
    assert.deepEqual(feito.pulados.map((item) => item.motivo).sort(), ["alterado por uma pessoa depois da importação", "ligado à diretoria"]);
    assert.deepEqual((await daExecucao(execucao)).map((documento) => documento.id).sort(), [editado.id, naDiretoria.id].sort());
    assert.equal((await daExecucao("20261022-000000-0005")).length, 2, "outra execução intacta");
    const reversoes = await db.collection(COLECAO_LOG).where("execucao", "==", "20261022-000000-0007").get();
    assert.equal(reversoes.size, 3);
    for (const registro of reversoes.docs) assert.equal(registro.get("acao"), "excluir_definitivo");
  });
});

describe("Script migrar-profissionais (emulador, simulação e recusas)", () => {
  let pasta: string;
  const criados: string[] = [];

  before(() => {
    pasta = mkdtempSync(join(tmpdir(), "abte-profissionais-"));
    writeFileSync(join(pasta, "profissionais.json"), JSON.stringify(ARQUIVO));
  });

  after(() => {
    rmSync(pasta, { recursive: true, force: true });
    for (const arquivo of criados) rmSync(arquivo, { force: true });
  });

  function rodar(args: string[], projeto = PROJETO): Promise<{ codigo: number; saida: string }> {
    return new Promise((resolver) => {
      execFile(
        process.execPath,
        ["scripts/migrar-profissionais.mts", `--entrada=${join(pasta, "profissionais.json")}`, ...args],
        { encoding: "utf8", env: { ...process.env, FIREBASE_ADMIN_PROJECT_ID: projeto } },
        (erro, stdout, stderr) => {
          const saida = `${stdout}${stderr}`;
          for (const [, caminho] of saida.matchAll(/Relatório: (\S+)\.md/g)) criados.push(`${caminho}.md`, `${caminho}.json`);
          resolver({ codigo: erro ? Number(erro.code ?? 1) : 0, saida });
        },
      );
    });
  }

  test("simulação: mostra projeto e contagens, sem nomes e sem gravar", async () => {
    const antes = await contar("profissionais");
    const { codigo, saida } = await rodar([]);
    assert.equal(codigo, 0, saida);
    assert.match(saida, /Projeto: demo-abte-profissionais \(emulador\)/);
    assert.match(saida, /Registros no arquivo: 5/);
    assert.doesNotMatch(saida, /Pessoa Fictícia|pessoa-ficticia/);
    assert.equal(await contar("profissionais"), antes);
  });

  test("--executar sem a confirmação certa não grava; projeto fora de demo- no emulador é recusado", async () => {
    const antes = await contar("profissionais");
    const { codigo, saida } = await rodar(["--executar"]);
    assert.equal(codigo, 1, saida);
    assert.match(saida, /Nada foi gravado/);
    assert.equal((await rodar([], "abte-dev")).codigo, 1);
    assert.equal(await contar("profissionais"), antes);
  });
});
