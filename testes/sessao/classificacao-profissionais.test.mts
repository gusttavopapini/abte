// Correção da classificação dos profissionais (10/11/2026) no emulador do
// Firestore, num projeto só dela (demo-abte-classificacao). Dados fictícios.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { aplicarCorrecoes } from "../../src/lib/migracao/classificacaoProfissionais.ts";

const PROJETO = "demo-abte-classificacao";
let app: App;
let db: Firestore;

before(() => {
  app = initializeApp({ projectId: PROJETO }, "testes-classificacao");
  db = getFirestore(app);
});

after(async () => {
  await deleteApp(app);
});

const documento = (tipo: string) => ({
  tipo, tratamento: "Dra.", nome: "TESTE Classificação", registro: "CRM 1234", metodos: [], pais: "BR", uf: "SP", cidades: ["Cidade"],
  telerreabilitacao: false, whatsapp: "", telefones: [], instagram: "", facebook: "", email: "teste@exemplo.invalid",
  bio: "", ativo: true, ordem: 3, fotoMidiaId: null, excluidoEm: null,
});

describe("correção da classificação no emulador", () => {
  test("muda só o tipo, pelo caminho do painel, com o registro assinado pelo script", async () => {
    await db.doc("profissionais/cl-um").set(documento("Outros"));
    const r = await aplicarCorrecoes({ db, execucao: "20261110-000000-cl01", correcoes: [{ id: "cl-um", de: "Outros", para: "Médicos", fontes: { conselho: "Médicos", pagina: "Médicos", planilha: null } }] });
    assert.deepEqual(r, { gravados: ["cl-um"], falhas: [] });
    const depois = (await db.doc("profissionais/cl-um").get()).data() ?? {};
    assert.equal(depois.tipo, "Médicos");
    assert.equal(depois.ordem, 3, "a ordem gravada fica");
    assert.equal(depois.email, "teste@exemplo.invalid");
    const log = await db.collection("logAlteracoes").where("documentoId", "==", "cl-um").get();
    assert.equal(log.size, 1);
    const linha = log.docs[0].data();
    assert.equal(linha.usuarioNome, "Ajuste de classificação (script)");
    assert.equal(linha.papel, "sistema");
    assert.deepEqual(linha.campos, ["tipo"]);
    assert.equal(linha.execucao, "20261110-000000-cl01");
  });

  test("não grava se o tipo mudou depois da auditoria", async () => {
    await db.doc("profissionais/cl-dois").set(documento("Psicólogos"));
    const r = await aplicarCorrecoes({ db, execucao: "20261110-000000-cl02", correcoes: [{ id: "cl-dois", de: "Outros", para: "Médicos", fontes: { conselho: "Médicos", pagina: "Médicos", planilha: null } }] });
    assert.equal(r.gravados.length, 0);
    assert.equal(r.falhas.length, 1);
    assert.equal((await db.doc("profissionais/cl-dois").get()).get("tipo"), "Psicólogos");
  });
});
