// Importação dos campos extras dos profissionais (08/11/2026) no emulador do
// Firestore, num projeto só dela (demo-abte-campos-extras). Dados fictícios.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { CAMPO_DA_MARCA, desfazerCamposExtras, importarCamposExtras } from "../../src/lib/migracao/camposExtras.ts";
import type { RegistroDeOrigem } from "../../src/lib/migracao/profissionais.ts";

const PROJETO = "demo-abte-campos-extras";
let app: App;
let db: Firestore;

before(() => {
  app = initializeApp({ projectId: PROJETO }, "testes-campos-extras");
  db = getFirestore(app);
});

after(async () => {
  await deleteApp(app);
});

const registro = (posicao: number, chave: string, bruto: Record<string, unknown>): RegistroDeOrigem => ({ posicao, chave, bruto, fotos: [], pontosDeRevisao: 0 });

describe("importação dos campos extras no emulador", () => {
  test("grava só o vazio e não editado, é idempotente e desfaz", async () => {
    await db.doc("profissionais/ce-um").set({ nome: "TESTE Um", origem: { sistema: "wix", chave: "ce-um" }, bio: "", cidades: ["Cidade Um"], excluidoEm: null });
    await db.doc("profissionais/ce-dois").set({ nome: "TESTE Dois", origem: { sistema: "wix", chave: "ce-dois" }, bio: "", excluidoEm: null });
    await db.doc("profissionais/ce-lote").set({ nome: "TESTE Lote Três", origem: { sistema: "cadastro-lote", chave: "lote1-x" }, bio: "", excluidoEm: null });
    // Uma pessoa editou a bio do segundo no painel (e a deixou vazia).
    await db.collection("logAlteracoes").add({ colecao: "profissionais", documentoId: "ce-dois", acao: "editar", campos: ["bio"], usuarioId: "pessoa" });
    const registros = [
      registro(1, "ce-um", { endereco: "Rua Teste, 1", site: "clinica-teste.com.br", outrosPerfis: ["perfil.teste"], emailsExtras: ["extra@exemplo.invalid"], cidades: ["Cidade Dois"], bio: "Apresentação do site antigo." }),
      registro(2, "ce-dois", { bio: "Não deve entrar." }),
    ];
    const miniCurriculos = [{ arquivo: "TESTE Lote Três.txt", texto: "Mini currículo de teste." }];

    const simulacao = await importarCamposExtras({ db, registros, miniCurriculos, modo: "simulacao", execucao: "20261108-000000-ce01" });
    assert.equal(simulacao.contagens.documentos, 2);
    assert.equal((await db.doc("profissionais/ce-um").get()).get("site"), undefined, "simulação não grava");

    const r = await importarCamposExtras({ db, registros, miniCurriculos, modo: "executar", execucao: "20261108-000000-ce02" });
    assert.equal(r.contagens.gravados, 2);
    const um = (await db.doc("profissionais/ce-um").get()).data()!;
    assert.equal(um.endereco, "Rua Teste, 1");
    assert.equal(um.site, "https://clinica-teste.com.br/");
    assert.deepEqual(um.outrosPerfis, [{ rotulo: "Instagram", url: "https://www.instagram.com/perfil.teste/" }]);
    assert.deepEqual(um.emailsExtras, ["extra@exemplo.invalid"]);
    assert.deepEqual(um.cidades, ["Cidade Um"], "cidades já preenchidas não mudam");
    assert.equal(um.bio, "Apresentação do site antigo.");
    assert.equal((await db.doc("profissionais/ce-dois").get()).get("bio"), "", "bio editada no painel não muda");
    assert.equal((await db.doc("profissionais/ce-lote").get()).get("bio"), "Mini currículo de teste.");
    const registrosDoLog = await db.collection("logAlteracoes").where("execucao", "==", "20261108-000000-ce02").get();
    assert.equal(registrosDoLog.size, 2);

    const repetida = await importarCamposExtras({ db, registros, miniCurriculos, modo: "executar", execucao: "20261108-000000-ce03" });
    assert.equal(repetida.contagens.gravados, 0, "repetir não grava de novo");

    // Uma pessoa troca o site depois: o desfazer devolve o resto e mantém o site.
    await db.doc("profissionais/ce-um").update({ site: "https://outro-teste.com.br/" });
    const desfeito = await desfazerCamposExtras({ db, execucaoAlvo: "20261108-000000-ce02", execucao: "20261108-000000-ce04", modo: "executar" });
    assert.equal(desfeito.desfeitos, 2);
    const depois = (await db.doc("profissionais/ce-um").get()).data()!;
    assert.equal(depois.endereco, undefined);
    assert.equal(depois.bio, "");
    assert.equal(depois.site, "https://outro-teste.com.br/");
    assert.equal(depois[CAMPO_DA_MARCA], undefined);
  });
});
