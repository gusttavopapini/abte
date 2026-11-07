// Testes da importação de telefones no emulador do Firestore (npm run
// test:sessao), num projeto só deles (demo-abte-telefones). Profissionais e
// números fictícios. Nada aqui toca o projeto real.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { COLECAO_LOG } from "../../src/lib/log/alteracoes.ts";
import type { RegistroDeOrigem } from "../../src/lib/migracao/profissionais.ts";
import { CAMPO_DA_MARCA, desfazerTelefones, importarTelefones } from "../../src/lib/migracao/telefones.ts";

const PROJETO = "demo-abte-telefones";
let app: App;
let db: Firestore;

const registros: RegistroDeOrigem[] = [
  { posicao: 1, chave: "tel-um", bruto: { telefones: ["(11) 3333-4444", "(11) 93333-4444"] }, fotos: [], pontosDeRevisao: 0 },
  { posicao: 2, chave: "tel-dois", bruto: { telefones: ["(21) 2222-3333"] }, fotos: [], pontosDeRevisao: 0 },
  { posicao: 3, chave: "tel-tres", bruto: { telefones: ["(31) 3111-2222"] }, fotos: [], pontosDeRevisao: 0 },
];

before(async () => {
  app = initializeApp({ projectId: PROJETO }, "testes-telefones");
  db = getFirestore(app);
  const base = { nome: "TESTE Profissional", pais: "BR", uf: "SP", instagram: "", email: "", ativo: true };
  await db.doc("profissionais/um").set({ ...base, origem: { sistema: "wix", chave: "tel-um" }, whatsapp: "5511933334444" });
  await db.doc("profissionais/dois").set({ ...base, origem: { sistema: "wix", chave: "tel-dois" }, whatsapp: "", telefones: ["552100000000"] });
  await db.doc("profissionais/tres").set({ ...base, origem: { sistema: "wix", chave: "tel-tres" }, whatsapp: "" });
  await db.doc("profissionais/fixo").set({ ...base, origem: { sistema: "cadastro-lote", chave: "lote1-fixo" }, whatsapp: "553133334444" });
});

after(async () => {
  await deleteApp(app);
});

const ler = async (id: string) => (await db.doc(`profissionais/${id}`).get()).data() ?? {};
const logs = async (execucao: string) => (await db.collection(COLECAO_LOG).where("execucao", "==", execucao).get()).docs.map((d) => d.data());

describe("importação de telefones", () => {
  let execucao = "";

  test("simulação não grava nada", async () => {
    const r = await importarTelefones({ db, registros, modo: "simulacao", execucao: "20261106-000000-aaaa" });
    assert.equal(r.contagens.aGravar, 3);
    assert.equal(r.contagens.jaTemTelefone, 1);
    assert.equal((await ler("um")).telefones, undefined);
    assert.equal((await logs("20261106-000000-aaaa")).length, 0);
  });

  test("executar grava, move o fixo do WhatsApp e não sobrescreve", async () => {
    execucao = "20261106-000001-bbbb";
    const r = await importarTelefones({ db, registros, modo: "executar", execucao });
    assert.equal(r.contagens.gravados, 3);
    assert.deepEqual((await ler("um")).telefones, ["551133334444"]);
    assert.equal((await ler("um")).whatsapp, "5511933334444");
    assert.deepEqual((await ler("dois")).telefones, ["552100000000"]);
    const fixo = await ler("fixo");
    assert.deepEqual(fixo.telefones, ["553133334444"]);
    assert.equal(fixo.whatsapp, "");
    assert.equal(fixo[CAMPO_DA_MARCA].whatsappAnterior, "553133334444");
    const registrosDoLog = await logs(execucao);
    assert.equal(registrosDoLog.length, 3);
    assert.ok(registrosDoLog.every((l) => l.origem === "migracao" && l.acao === "editar"));
    assert.ok(registrosDoLog.some((l) => JSON.stringify(l.campos) === JSON.stringify(["telefones", "whatsapp"])));
  });

  test("repetir não grava de novo", async () => {
    const r = await importarTelefones({ db, registros, modo: "executar", execucao: "20261106-000002-cccc" });
    assert.equal(r.contagens.aGravar, 0);
    assert.equal(r.contagens.gravados, 0);
  });

  test("desfazer pula o alterado por pessoa e devolve o resto", async () => {
    await db.doc("profissionais/tres").update({ telefones: ["553100000000"] });
    const simulado = await desfazerTelefones({ db, execucaoAlvo: execucao, execucao: "20261106-000003-dddd", modo: "simulacao" });
    assert.equal(simulado.desfeitos, 2);
    assert.deepEqual((await ler("um")).telefones, ["551133334444"]);
    const r = await desfazerTelefones({ db, execucaoAlvo: execucao, execucao: "20261106-000004-eeee", modo: "executar" });
    assert.equal(r.encontrados, 3);
    assert.equal(r.desfeitos, 2);
    assert.deepEqual(r.pulados.map((p) => p.id), ["tres"]);
    assert.equal((await ler("um")).telefones, undefined);
    const fixo = await ler("fixo");
    assert.equal(fixo.whatsapp, "553133334444");
    assert.equal(fixo.telefones, undefined);
    assert.equal(fixo[CAMPO_DA_MARCA], undefined);
    assert.deepEqual((await ler("tres")).telefones, ["553100000000"]);
  });
});
