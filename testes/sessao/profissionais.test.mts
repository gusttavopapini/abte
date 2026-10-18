// Testes da foto do profissional e do registro de alterações dos
// profissionais nos emuladores de Firestore e Storage (npm run test:sessao).
// Usam as mesmas funções que as ações de servidor chamam (gravacao/profissionais.ts
// e biblioteca.ts). Os dados são de exemplo, marcados como TESTE. Nada aqui
// toca o projeto real.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { COLECAO_PROFISSIONAIS, MENSAGEM_FOTO_INDISPONIVEL, gravarProfissional, marcarExclusaoDoProfissional } from "../../src/lib/gravacao/profissionais.ts";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { enviarImagem, excluirDeVez, listarUsos, moverParaLixeiraOuRestaurar, type ServicosDeMidia } from "../../src/lib/midia/biblioteca.ts";
import type { DadosDoProfissional } from "../../src/lib/profissionais.ts";

let app: App;
let db: Firestore;
let servicos: ServicosDeMidia;

const EDITOR: AutorDaAlteracao = { uid: "teste-prof-editor", nome: "TESTE Editor", papel: "editor" };
const ADMINISTRADOR: AutorDaAlteracao = { uid: "teste-prof-admin", nome: "TESTE Administrador", papel: "administrador" };

function profissional(nome: string, fotoMidiaId: string | null): DadosDoProfissional {
  return {
    tipo: "Fisioterapeutas",
    tratamento: "",
    nome,
    registro: "",
    metodos: [],
    pais: "BR",
    uf: "SP",
    cidades: ["Cidade TESTE"],
    telerreabilitacao: false,
    whatsapp: "5511900000000",
    instagram: "",
    facebook: "",
    email: "",
    bio: "",
    ativo: true,
    ordem: 0,
    fotoMidiaId,
  };
}

// Imagem fictícia de uma cor só, sem pessoas.
async function novaImagem(alt: string): Promise<string> {
  const bytes = await sharp({ create: { width: 600, height: 750, channels: 3, background: { r: 200, g: 220, b: 240 } } }).jpeg().toBuffer();
  const envio = await enviarImagem(servicos, { bytes, alt, indicaMenor: false, autorizacaoConfirmada: false }, EDITOR);
  assert.ok(envio.ok);
  return envio.id;
}

async function registrosDe(documentoId: string) {
  return (await db.collection(COLECAO_LOG).where("documentoId", "==", documentoId).get()).docs.map((documento) => documento.data());
}

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: "demo-abte-sessao" }, "testes-profissionais");
  db = getFirestore(app);
  servicos = { db, bucket: getStorage(app).bucket("demo-abte-sessao.appspot.com") };
});

after(async () => {
  await deleteApp(app);
});

describe("Foto do profissional", () => {
  test("cadastro com foto da biblioteca grava só o id, com registro sem valores", async () => {
    const foto = await novaImagem("Foto de teste, fundo azul claro");
    const gravado = await gravarProfissional(db, null, profissional("TESTE Com Foto", foto), EDITOR);
    assert.ok(gravado.ok);
    const documento = (await db.collection(COLECAO_PROFISSIONAIS).doc(gravado.id).get()).data();
    assert.equal(documento?.fotoMidiaId, foto);
    assert.equal(documento?.excluidoEm, null);

    const [registro] = await registrosDe(gravado.id);
    assert.equal(registro.acao, "criar");
    assert.equal(registro.colecao, "profissionais");
    assert.equal(registro.usuarioNome, "TESTE Editor");
    assert.ok(registro.campos.includes("fotoMidiaId"));
    assert.ok(!JSON.stringify(registro).includes(foto), "o registro não guarda valores");
    assert.ok(!JSON.stringify(registro).includes("TESTE Com Foto"), "nem o nome do profissional");
  });

  test("foto inexistente ou na lixeira é recusada e nada é gravado", async () => {
    const naLixeira = await novaImagem("Imagem de teste na lixeira");
    await moverParaLixeiraOuRestaurar(servicos, naLixeira, true, EDITOR);
    const antes = (await db.collection(COLECAO_PROFISSIONAIS).count().get()).data().count;
    for (const foto of ["naoExisteTeste123", naLixeira]) {
      const gravado = await gravarProfissional(db, null, profissional("TESTE Recusado", foto), EDITOR);
      assert.deepEqual(gravado, { ok: false, mensagem: MENSAGEM_FOTO_INDISPONIVEL, campo: "fotoMidiaId" });
    }
    assert.equal((await db.collection(COLECAO_PROFISSIONAIS).count().get()).data().count, antes);
  });

  test("edição: registra só os campos alterados; a foto que já estava pode ficar mesmo na lixeira", async () => {
    const foto = await novaImagem("Foto de teste para edição");
    const criado = await gravarProfissional(db, null, profissional("TESTE Edição", foto), EDITOR);
    assert.ok(criado.ok);
    await moverParaLixeiraOuRestaurar(servicos, foto, true, EDITOR);

    // Muda só a cidade e mantém a foto (já na lixeira): aceito.
    const editado = await gravarProfissional(db, criado.id, { ...profissional("TESTE Edição", foto), cidades: ["Outra Cidade TESTE"] }, EDITOR);
    assert.ok(editado.ok);
    const edicao = (await registrosDe(criado.id)).find((registro) => registro.acao === "editar");
    assert.deepEqual(edicao?.campos, ["cidades"]);

    // Remover a foto também é uma alteração registrada.
    const semFoto = await gravarProfissional(db, criado.id, { ...profissional("TESTE Edição", null), cidades: ["Outra Cidade TESTE"] }, EDITOR);
    assert.ok(semFoto.ok);
    assert.equal((await db.collection(COLECAO_PROFISSIONAIS).doc(criado.id).get()).get("fotoMidiaId"), null);
    const campos = (await registrosDe(criado.id)).filter((registro) => registro.acao === "editar").map((registro) => registro.campos);
    assert.deepEqual(campos.sort(), [["cidades"], ["fotoMidiaId"]].sort());
  });

  test("imagem em uso: lista os profissionais pelo nome, marcando os excluídos", async () => {
    const foto = await novaImagem("Foto de teste compartilhada");
    const um = await gravarProfissional(db, null, profissional("TESTE Bruno Uso", foto), EDITOR);
    const dois = await gravarProfissional(db, null, profissional("TESTE Ana Uso", foto), EDITOR);
    assert.ok(um.ok && dois.ok);
    assert.ok((await marcarExclusaoDoProfissional(db, um.id, true, EDITOR)).ok);

    assert.deepEqual(await listarUsos(db, foto), [{ rotulo: "Profissionais (foto)", registros: ["TESTE Ana Uso", "TESTE Bruno Uso (na lixeira)"] }]);
    assert.deepEqual(await listarUsos(db, "semUsoTeste"), []);

    // Depois de excluir de vez, o profissional continua apontando para o id,
    // e as telas mostram o placeholder (a imagem não existe mais).
    await moverParaLixeiraOuRestaurar(servicos, foto, true, EDITOR);
    assert.ok((await excluirDeVez(servicos, foto, ADMINISTRADOR)).ok);
    assert.equal((await db.collection(COLECAO_PROFISSIONAIS).doc(dois.id).get()).get("fotoMidiaId"), foto);
  });

  test("excluir e restaurar profissional ficam no registro", async () => {
    const criado = await gravarProfissional(db, null, profissional("TESTE Lixeira", null), EDITOR);
    assert.ok(criado.ok);
    assert.deepEqual(await marcarExclusaoDoProfissional(db, criado.id, true, EDITOR), { ok: true, nome: "TESTE Lixeira" });
    assert.deepEqual(await marcarExclusaoDoProfissional(db, criado.id, false, ADMINISTRADOR), { ok: true, nome: "TESTE Lixeira" });
    const acoes = (await registrosDe(criado.id)).map((registro) => `${registro.acao}:${registro.papel}`).sort();
    assert.deepEqual(acoes, ["criar:editor", "excluir:editor", "restaurar:administrador"]);
    assert.deepEqual(await marcarExclusaoDoProfissional(db, "naoExisteTeste", true, EDITOR), { ok: false, mensagem: "Profissional não encontrado." });
  });
});
