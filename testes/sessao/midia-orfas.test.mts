// Testes do script scripts/midia-orfas.mts nos emuladores de Firestore e
// Storage (npm run test:sessao). Rodam o script de verdade, num projeto e
// num bucket só deles (demo-abte-orfas), para não mexer nos arquivos dos
// outros testes que rodam ao mesmo tempo. Nada aqui toca o projeto real.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const PROJETO = "demo-abte-orfas";
const BUCKET = "demo-abte-orfas.appspot.com";
let app: App;
let db: Firestore;
let bucket: ReturnType<ReturnType<typeof getStorage>["bucket"]>;

// Assíncrono (e não spawnSync): travar o processo do teste derruba as conexões
// abertas com o emulador do Storage.
function rodar(...args: string[]): Promise<{ codigo: number; saida: string }> {
  return new Promise((resolver) => {
    execFile(
      process.execPath,
      ["scripts/midia-orfas.mts", ...args],
      { encoding: "utf8", env: { ...process.env, FIREBASE_ADMIN_PROJECT_ID: PROJETO, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: BUCKET } },
      (erro, stdout, stderr) => resolver({ codigo: erro ? Number(erro.code ?? 1) : 0, saida: `${stdout}${stderr}` }),
    );
  });
}

async function existe(caminho: string) {
  return (await bucket.file(caminho).exists())[0];
}

const ARQUIVOS = {
  comDocumento: "publico/midias/comDocumento/480.webp",
  orfaPublica: "publico/midias/orfaUm/480.webp",
  orfaNaLixeira: "lixeira/midias/orfaDois/960.webp",
};

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: PROJETO }, "testes-orfas");
  db = getFirestore(app);
  bucket = getStorage(app).bucket(BUCKET);
  for (const caminho of Object.values(ARQUIVOS)) await bucket.file(caminho).save(Buffer.from("teste"), { resumable: false });
  await db.collection("midias").doc("comDocumento").set({ variantes: [{ largura: 480, caminho: ARQUIVOS.comDocumento, tamanho: 5 }] });
  await db.collection("midias").doc("semArquivo").set({ variantes: [{ largura: 480, caminho: "publico/midias/semArquivo/480.webp", tamanho: 5 }] });
});

after(async () => {
  await deleteApp(app);
});

describe("Script de mídia órfã", () => {
  test("por padrão só lista: mostra projeto e bucket, órfãs e documento sem arquivo", async () => {
    const { codigo, saida } = await rodar("--minutos=0");
    assert.equal(codigo, 0, saida);
    assert.match(saida, /Projeto: demo-abte-orfas \(emuladores\)/);
    assert.match(saida, /Bucket: demo-abte-orfas\.appspot\.com/);
    assert.match(saida, /Modo: só listar/);
    assert.match(saida, /Pastas sem documento: 2/);
    assert.match(saida, /publico\/midias\/orfaUm/);
    assert.match(saida, /lixeira\/midias\/orfaDois/);
    assert.doesNotMatch(saida, /publico\/midias\/comDocumento/);
    assert.match(saida, /semArquivo: 1 de 1 arquivo\(s\) faltando/);
    for (const caminho of Object.values(ARQUIVOS)) assert.equal(await existe(caminho), true);
  });

  test("--apagar sem a confirmação certa não apaga nada", async () => {
    for (const args of [["--apagar", "--minutos=0"], ["--apagar", "--confirmo-projeto=outro-projeto", "--minutos=0"], ["--confirmo-projeto=demo-abte-orfas", "--minutos=0"]]) {
      const { saida } = await rodar(...args);
      for (const caminho of Object.values(ARQUIVOS)) assert.equal(await existe(caminho), true, `${args.join(" ")}: ${saida}`);
    }
    const { codigo, saida } = await rodar("--apagar", "--minutos=0");
    assert.equal(codigo, 1);
    assert.match(saida, /Nada foi apagado: para apagar, repita com --apagar --confirmo-projeto=demo-abte-orfas/);
  });

  test("pastas recentes ficam de fora mesmo com a confirmação", async () => {
    const { codigo, saida } = await rodar("--apagar", "--confirmo-projeto=demo-abte-orfas");
    assert.equal(codigo, 0, saida);
    assert.match(saida, /ignorada/);
    assert.match(saida, /Apagados: 0 arquivo/);
    assert.equal(await existe(ARQUIVOS.orfaPublica), true);
  });

  test("com --apagar e --confirmo-projeto: apaga só as pastas órfãs, nunca documentos", async () => {
    const { codigo, saida } = await rodar("--apagar", "--confirmo-projeto=demo-abte-orfas", "--minutos=0");
    assert.equal(codigo, 0, saida);
    assert.match(saida, /Apagados: 2 arquivo\(s\) de 2 pasta\(s\) órfã\(s\)/);
    assert.equal(await existe(ARQUIVOS.orfaPublica), false);
    assert.equal(await existe(ARQUIVOS.orfaNaLixeira), false);
    assert.equal(await existe(ARQUIVOS.comDocumento), true);
    assert.equal((await db.collection("midias").doc("semArquivo").get()).exists, true);
    assert.equal((await db.collection("midias").doc("comDocumento").get()).exists, true);
  });
});
