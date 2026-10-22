// Testes da marcação da conferência de menores (scripts/marcar-conferencia-menor.mts)
// nos emuladores de Authentication e Firestore (npm run test:sessao). Rodam num
// projeto só deles (demo-abte-conferencia), para não mexer nos dados dos
// outros testes. Nada aqui toca o projeto real.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { COLECAO_LOG } from "../../src/lib/log/alteracoes.ts";
import { autorDaConferencia, marcarConferencia } from "../../src/lib/migracao/conferenciaDeMenor.ts";

const PROJETO = "demo-abte-conferencia";
let app: App;
let auth: Auth;
let db: Firestore;
const uids = { editor: "", semPapel: "", desativado: "" };

async function documento(id: string) {
  return (await db.collection("midias").doc(id).get()).data();
}

async function registrosDe(id: string) {
  return (await db.collection(COLECAO_LOG).where("documentoId", "==", id).get()).docs.map((registro) => registro.data());
}

async function prepararImagens() {
  const base = { tipo: "imagem", alt: "Imagem de teste", altProvisorio: true, origem: { sistema: "wix", midiaId: "x", execucao: "20261021-000000-0000" } };
  await db.collection("midias").doc("importadaUm").set({ ...base, conferenciaDeMenor: "pendente" });
  await db.collection("midias").doc("importadaDois").set({ ...base, conferenciaDeMenor: "pendente" });
  await db.collection("midias").doc("jaConferida").set({ ...base, conferenciaDeMenor: "conferido" });
  // Enviada pelo painel: não tem o campo e nunca é tocada.
  await db.collection("midias").doc("manual").set({ tipo: "imagem", alt: "Envio manual", indicaMenor: false });
}

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: PROJETO }, "testes-conferencia");
  auth = getAuth(app);
  db = getFirestore(app);
  const editor = await auth.createUser({ email: "teste-conferencia-editor@exemplo.invalid", displayName: "TESTE Editora" });
  await auth.setCustomUserClaims(editor.uid, { papel: "editor" });
  uids.editor = editor.uid;
  uids.semPapel = (await auth.createUser({ email: "teste-conferencia-sem-papel@exemplo.invalid" })).uid;
  const desativado = await auth.createUser({ email: "teste-conferencia-desativado@exemplo.invalid", disabled: true });
  await auth.setCustomUserClaims(desativado.uid, { papel: "administrador" });
  uids.desativado = desativado.uid;
  await prepararImagens();
});

after(async () => {
  await deleteApp(app);
});

describe("Conferência de menores (emulador)", () => {
  test("quem conferiu precisa ter papel no painel e estar ativo; o registro não leva o e-mail", async () => {
    assert.deepEqual(await autorDaConferencia(auth, uids.editor), { ok: true, autor: { uid: uids.editor, nome: "TESTE Editora", papel: "editor" } });
    assert.equal((await autorDaConferencia(auth, uids.semPapel)).ok, false);
    assert.equal((await autorDaConferencia(auth, uids.desativado)).ok, false);
    assert.equal((await autorDaConferencia(auth, "uid-que-nao-existe")).ok, false);
  });

  test("simulação não grava nada", async () => {
    const relatorio = await marcarConferencia({ db, itens: [{ midiaId: "importadaUm", valor: "conferido" }], autor: null, modo: "simulacao", execucao: "20261021-000000-0001" });
    assert.equal(relatorio.contagens.marcadas, 1);
    assert.equal((await documento("importadaUm"))?.conferenciaDeMenor, "pendente");
    assert.equal((await registrosDe("importadaUm")).length, 0);
  });

  test("gravar sem autor é recusado", async () => {
    await assert.rejects(marcarConferencia({ db, itens: [{ midiaId: "importadaUm", valor: "conferido" }], autor: null, modo: "executar", execucao: "20261021-000000-0002" }));
    assert.equal((await documento("importadaUm"))?.conferenciaDeMenor, "pendente");
  });

  test("execução: só conferenciaDeMenor, só onde o campo existe, uma linha de registro por documento", async () => {
    const conferido = await autorDaConferencia(auth, uids.editor);
    assert.ok(conferido.ok);
    const relatorio = await marcarConferencia({
      db,
      itens: [
        { midiaId: "importadaUm", valor: "conferido" },
        { midiaId: "importadaDois", valor: "naoSeAplica" },
        { midiaId: "jaConferida", valor: "conferido" },
        { midiaId: "manual", valor: "conferido" },
        { midiaId: "naoExiste", valor: "conferido" },
      ],
      autor: conferido.autor,
      modo: "executar",
      execucao: "20261021-000000-0003",
    });
    assert.deepEqual(relatorio.contagens, { naLista: 5, marcadas: 2, puladas: 3 });
    assert.deepEqual(relatorio.puladas.map((item) => item.midiaId), ["jaConferida", "manual", "naoExiste"]);
    assert.doesNotMatch(JSON.stringify(relatorio), /exemplo\.invalid|TESTE Editora/);

    const um = await documento("importadaUm");
    assert.equal(um?.conferenciaDeMenor, "conferido");
    assert.equal(um?.alt, "Imagem de teste");
    assert.equal(um?.altProvisorio, true);
    assert.equal((await documento("importadaDois"))?.conferenciaDeMenor, "naoSeAplica");
    assert.equal((await documento("manual"))?.conferenciaDeMenor, undefined);

    for (const id of ["importadaUm", "importadaDois"]) {
      const registros = await registrosDe(id);
      assert.equal(registros.length, 1);
      assert.equal(registros[0].acao, "editar");
      assert.deepEqual(registros[0].campos, ["conferenciaDeMenor"]);
      assert.equal(registros[0].usuarioId, uids.editor);
      assert.equal(registros[0].papel, "editor");
      assert.equal(registros[0].origem, undefined);
      assert.doesNotMatch(JSON.stringify(registros[0]), /@/);
    }
    for (const id of ["jaConferida", "manual"]) assert.equal((await registrosDe(id)).length, 0);
  });
});

describe("Script marcar-conferencia-menor (emulador)", () => {
  let pasta: string;
  const criados: string[] = [];

  before(async () => {
    pasta = mkdtempSync(join(tmpdir(), "abte-conferencia-"));
    writeFileSync(join(pasta, "lista.json"), JSON.stringify({ conferido: ["scriptUm"], naoSeAplica: ["manual"] }));
    await db.collection("midias").doc("scriptUm").set({ tipo: "imagem", alt: "Imagem de teste", conferenciaDeMenor: "pendente" });
  });

  after(() => {
    rmSync(pasta, { recursive: true, force: true });
    for (const arquivo of criados) rmSync(arquivo, { force: true });
  });

  function rodar(args: string[], projeto = PROJETO): Promise<{ codigo: number; saida: string }> {
    return new Promise((resolver) => {
      execFile(
        process.execPath,
        ["scripts/marcar-conferencia-menor.mts", `--entrada=${join(pasta, "lista.json")}`, ...args],
        { encoding: "utf8", env: { ...process.env, FIREBASE_ADMIN_PROJECT_ID: projeto } },
        (erro, stdout, stderr) => {
          const saida = `${stdout}${stderr}`;
          for (const [, caminho] of saida.matchAll(/Relatório: (\S+)\.md/g)) criados.push(`${caminho}.md`, `${caminho}.json`);
          resolver({ codigo: erro ? Number(erro.code ?? 1) : 0, saida });
        },
      );
    });
  }

  test("simulação: mostra projeto e contagens, sem gravar", async () => {
    const { codigo, saida } = await rodar([]);
    assert.equal(codigo, 0, saida);
    assert.match(saida, /Projeto: demo-abte-conferencia \(emuladores\)/);
    assert.match(saida, /Modo: simulação/);
    assert.match(saida, /Seriam marcadas: 1/);
    assert.match(saida, /Puladas: 1/);
    assert.equal((await documento("scriptUm"))?.conferenciaDeMenor, "pendente");
  });

  test("gravar exige confirmação do projeto e uid de pessoa com papel", async () => {
    for (const args of [["--executar", `--uid=${uids.editor}`], ["--executar", "--confirmo-projeto=demo-abte-conferencia"], ["--executar", "--confirmo-projeto=demo-abte-conferencia", `--uid=${uids.semPapel}`]]) {
      const { codigo, saida } = await rodar(args);
      assert.equal(codigo, 1, saida);
      assert.match(saida, /Nada foi gravado/);
    }
    assert.equal((await rodar([], "abte-dev")).codigo, 1);
    assert.equal((await documento("scriptUm"))?.conferenciaDeMenor, "pendente");
  });

  test("com tudo certo, marca e assina o registro com a pessoa", async () => {
    const { codigo, saida } = await rodar(["--executar", "--confirmo-projeto=demo-abte-conferencia", `--uid=${uids.editor}`]);
    assert.equal(codigo, 0, saida);
    assert.match(saida, /Marcadas: 1/);
    assert.match(saida, /Quem conferiu: usuário com papel editor/);
    assert.doesNotMatch(saida, /TESTE Editora|exemplo\.invalid/);
    assert.equal((await documento("scriptUm"))?.conferenciaDeMenor, "conferido");
    const [registro] = await registrosDe("scriptUm");
    assert.equal(registro.usuarioId, uids.editor);
  });
});
