// Importação e desfazer dos telefones: projeto demo e números fictícios.
import assert from "node:assert/strict";
import { before, beforeEach, after, test } from "node:test";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getFirestore, Query, type Firestore } from "firebase-admin/firestore";
import { importarTelefones, desfazerTelefones, CAMPO_DA_MARCA } from "../../src/lib/migracao/telefones.ts";
import { COLECAO_LOG } from "../../src/lib/log/alteracoes.ts";
let app: App;
let db: Firestore;
const EXECUCAO = "20261106-000000-0001";
before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST);
  app = initializeApp({ projectId: "demo-abte-telefones" }, "teste-importador-telefones");
  db = getFirestore(app);
});
beforeEach(async () => {
  for (const c of ["profissionais", COLECAO_LOG]) await Promise.all((await db.collection(c).listDocuments()).map((d) => d.delete()));
  await db.collection("profissionais").doc("fixo").set({ pais: "BR", whatsapp: "551133334444", excluidoEm: null, origem: { sistema: "cadastro-lote", chave: "lote1-fixo" } });
});
after(async () => { await deleteApp(app); });
const importar = (modo: "simulacao" | "executar") => importarTelefones({ db, registros: [], modo, execucao: EXECUCAO });
const desfazer = (modo: "simulacao" | "executar") => desfazerTelefones({ db, modo, execucaoAlvo: EXECUCAO, execucao: "20261106-000000-0002" });

test("simulação não grava; execução é idempotente e registra a mudança", async () => {
  assert.equal((await importar("simulacao")).contagens.aGravar, 1);
  const ref = db.collection("profissionais").doc("fixo");
  assert.equal((await ref.get()).get("telefones"), undefined);
  assert.equal((await importar("executar")).contagens.gravados, 1);
  let doc = await ref.get();
  assert.deepEqual(doc.get("telefones"), ["551133334444"]);
  assert.equal(doc.get("whatsapp"), "");
  assert.equal(doc.get(`${CAMPO_DA_MARCA}.execucao`), EXECUCAO);
  assert.equal((await importar("executar")).contagens.gravados, 0);
  assert.equal((await db.collection(COLECAO_LOG).get()).size, 1);
  assert.equal((await desfazer("simulacao")).desfeitos, 1);
  assert.deepEqual((await ref.get()).get("telefones"), ["551133334444"]);
  assert.equal((await desfazer("executar")).desfeitos, 1);
  doc = await ref.get();
  assert.equal(doc.get("telefones"), undefined);
  assert.equal(doc.get("whatsapp"), "551133334444");
  assert.equal(doc.get(CAMPO_DA_MARCA), undefined);
});

test("nunca sobrescreve telefone já cadastrado", async () => {
  const ref = db.collection("profissionais").doc("fixo");
  await ref.update({ telefones: ["552122223333"] });
  assert.equal((await importar("executar")).contagens.gravados, 0);
  assert.deepEqual((await ref.get()).get("telefones"), ["552122223333"]);
});

test("desfazer preserva edição posterior e também edição entre consulta e gravação", async (t) => {
  await importar("executar");
  const ref = db.collection("profissionais").doc("fixo");
  const alvo = db.collection("profissionais").where(`${CAMPO_DA_MARCA}.execucao`, "==", EXECUCAO);
  const obter = Query.prototype.get;
  t.mock.method(Query.prototype, "get", async function(this: Query) {
    const snapshot = await obter.call(this);
    if (this.isEqual(alvo)) await ref.update({ telefones: ["552122223333"] });
    return snapshot;
  });
  const resultado = await desfazer("executar");
  assert.equal(resultado.desfeitos, 0);
  assert.equal(resultado.pulados.length, 1);
  assert.deepEqual((await ref.get()).get("telefones"), ["552122223333"]);
  assert.equal((await ref.get()).get("whatsapp"), "");
  assert.equal((await db.collection(COLECAO_LOG).get()).size, 1);
});
