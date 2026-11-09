// Testes do cadastro de profissionais em lote nos emuladores do Firestore e do
// Storage (npm run test:sessao), num projeto e num bucket só deles
// (demo-abte-lote). Registros, contatos e imagens fictícios. Nada aqui toca o
// projeto real.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { gravarProfissional } from "../../src/lib/gravacao/profissionais.ts";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { COLECAO_MIDIAS, type ServicosDeMidia } from "../../src/lib/midia/biblioteca.ts";
import {
  SISTEMA_DO_LOTE,
  cadastrarLote,
  chaveDaFoto,
  converterRegistroDoLote,
  desfazerLote,
  possiveisDuplicados,
  validarEntradaDoLote,
  type EntradaDoLote,
} from "../../src/lib/migracao/profissionaisLote.ts";
import type { DadosDoProfissional } from "../../src/lib/profissionais.ts";

const PROJETO = "demo-abte-lote";
const BUCKET = "demo-abte-lote.appspot.com";
const PESSOA: AutorDaAlteracao = { uid: "teste-lote-editor", nome: "TESTE Editor", papel: "editor" };

let app: App;
let db: Firestore;
let servicos: ServicosDeMidia;
let pasta: string;

// Registros fictícios: 1 com foto boa, 2 com foto de baixa resolução, 3 sem
// foto (chega depois), 4 na Bolívia sem UF e com link do Instagram e foto
// grande, 5 com WhatsApp inválido (recusado), 6 com UF fora do Brasil
// (recusado), 7 parecido com um profissional que já existe.
const ARQUIVO = {
  versao: 1,
  pastaDasFotos: "",
  profissionais: [
    { chave: "lote9-um", tipo: "Fisioterapeutas", nome: "Pessoa Fictícia Um", registro: "Registro 1-F", pais: "BR", uf: "SP", cidades: ["Cidade Exemplo"], instagram: "@perfil.um" },
    { chave: "lote9-dois", tipo: "Fisioterapeutas", nome: "Pessoa Fictícia Dois", registro: "Crefito 3- 9999", pais: "BR", uf: "MS", cidades: ["Cidade Dois"], email: "dois@exemplo.invalid" },
    { chave: "lote9-tres", tipo: "Médicos", tratamento: "Dra.", nome: "Pessoa Fictícia Tres", registro: "CRM 0001", pais: "BR", uf: "SP", cidades: ["Cidade Tres"], whatsapp: "14 32000000" },
    { chave: "lote9-quatro", tipo: "Fisioterapeutas", tratamento: "Dr", nome: "Pessoa Fictícia Quatro", registro: "Em andamento.", pais: "BO", uf: "", cidades: ["Ciudad Ejemplo"], instagram: "https://www.instagram.com/perfil.quatro" },
    { chave: "lote9-cinco", tipo: "Fisioterapeutas", nome: "Pessoa Fictícia Cinco", pais: "BR", uf: "SP", cidades: ["Cidade Cinco"], whatsapp: "123" },
    { chave: "lote9-seis", tipo: "Fisioterapeutas", nome: "Pessoa Fictícia Seis", pais: "PY", uf: "SP", cidades: ["Ciudad Seis"], instagram: "@perfil.seis" },
    { chave: "lote9-sete", tipo: "Fisioterapeutas", nome: "Fulana Exemplo", registro: "77777", pais: "BR", uf: "AL", cidades: ["Cidade Sete"], instagram: "@perfil.sete" },
  ],
};

function entrada(): EntradaDoLote {
  const lida = validarEntradaDoLote({ ...ARQUIVO, pastaDasFotos: pasta });
  assert.ok(lida.ok, lida.ok ? "" : lida.erros.join("; "));
  return lida.entrada;
}

const executar = (execucao: string, modo: "simulacao" | "executar" = "executar") => cadastrarLote({ servicos, entrada: entrada(), modo, execucao });

async function contar(colecao: string) {
  return (await db.collection(colecao).count().get()).data().count;
}

async function doLote(chave: string) {
  const documentos = await db.collection("profissionais").where("origem.chave", "==", chave).get();
  assert.equal(documentos.size, 1, `um profissional com a chave ${chave}`);
  return documentos.docs[0];
}

const cor = (largura: number, altura: number) => sharp({ create: { width: largura, height: altura, channels: 3, background: { r: 30, g: 120, b: 200 } } });

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: PROJETO }, "testes-cadastro-lote");
  db = getFirestore(app);
  servicos = { db, bucket: getStorage(app).bucket(BUCKET) };
  pasta = mkdtempSync(join(tmpdir(), "abte-lote-"));
  writeFileSync(join(pasta, "um.jpg"), await cor(800, 800).jpeg().toBuffer());
  writeFileSync(join(pasta, "dois.png"), await cor(200, 240).png().toBuffer());
  writeFileSync(join(pasta, "quatro.jpeg"), await cor(3000, 2000).jpeg().toBuffer());
  // Profissional que já existe (cadastrado por uma pessoa), parecido com o 7.
  const existente: DadosDoProfissional = {
    tipo: "Fisioterapeutas", tratamento: "", nome: "Fulanana Maria Exemplo", registro: "Crefito 77777", metodos: [], pais: "BR", uf: "AL", cidades: ["Cidade Sete"],
    telerreabilitacao: false, whatsapp: "", telefones: [], instagram: "perfil.outro", facebook: "", email: "", endereco: "", site: "", outrosPerfis: [], emailsExtras: [], bio: "", ativo: true, ordem: 0, fotoMidiaId: null,
  };
  assert.ok((await gravarProfissional(db, null, existente, PESSOA)).ok);
});

after(async () => {
  rmSync(pasta, { recursive: true, force: true });
  await deleteApp(app);
});

describe("Cadastro de profissionais em lote: entrada e conversão", () => {
  test("recusa campo fora do combinado e chave repetida, sem citar valores", () => {
    const lida = validarEntradaDoLote({
      versao: 1,
      pastaDasFotos: "x",
      profissionais: [
        { ...ARQUIVO.profissionais[0], bio: "texto secreto" },
        { ...ARQUIVO.profissionais[0] },
      ],
    });
    assert.equal(lida.ok, false);
    if (lida.ok) return;
    assert.ok(lida.erros.some((erro) => erro.includes("Registro 1: campos desconhecidos: bio")));
    assert.ok(lida.erros.some((erro) => erro.includes("Registro 2: chave repetida")));
    assert.ok(lida.erros.every((erro) => !erro.includes("texto secreto") && !erro.includes("Fictícia")));
  });

  test("passa pelo validador do painel: ativo, ordem 0, Instagram pelo link e Bolívia sem UF", () => {
    const quatro = entrada().registros[3];
    const resultado = converterRegistroDoLote(quatro);
    assert.ok(resultado.ok);
    if (!resultado.ok) return;
    assert.equal(resultado.dados.instagram, "perfil.quatro");
    assert.equal(resultado.dados.uf, "");
    assert.equal(resultado.dados.pais, "BO");
    assert.equal(resultado.dados.registro, "Em andamento.");
    assert.equal(resultado.dados.tratamento, "Dr");
    assert.equal(resultado.dados.ativo, true);
    assert.equal(resultado.dados.ordem, 0);
    assert.equal(resultado.dados.telerreabilitacao, false);
    assert.deepEqual(resultado.dados.metodos, []);
    assert.equal(resultado.dados.bio, "");
    assert.equal(resultado.dados.fotoMidiaId, null);
    const tres = converterRegistroDoLote(entrada().registros[2]);
    assert.ok(tres.ok && tres.dados.whatsapp === "551432000000");
    assert.equal(converterRegistroDoLote(entrada().registros[4]).ok, false);
  });

  test("chave da foto e possíveis duplicados", () => {
    assert.equal(chaveDaFoto("lote1-exemplo"), "exemplo");
    const registro = entrada().registros[6];
    assert.deepEqual(possiveisDuplicados(registro, [{ id: "a", nome: "Fulana Exemplo", registro: "" }]), [{ id: "a", motivo: "nome igual" }]);
    assert.deepEqual(possiveisDuplicados(registro, [{ id: "b", nome: "Outra Pessoa", registro: "Crefito 77777" }]), [{ id: "b", motivo: "mesmo número de registro" }]);
    assert.deepEqual(possiveisDuplicados(registro, [{ id: "c", nome: "Outra Pessoa", registro: "123" }]), []);
  });
});

describe("Cadastro de profissionais em lote (emulador)", () => {
  test("simulação não grava nada e prevê recusas, fotos e duplicados", async () => {
    const relatorio = await executar("20261104-000000-0001", "simulacao");
    assert.equal(await contar("profissionais"), 1);
    assert.equal(await contar(COLECAO_MIDIAS), 0);
    assert.equal((await servicos.bucket.getFiles())[0].length, 0);
    const c = relatorio.contagens;
    assert.equal(c.noArquivo, 7);
    assert.equal(c.aCriar, 5);
    assert.equal(c.recusados, 2);
    assert.deepEqual(Object.keys(relatorio.registros[4].recusas), ["whatsapp"]);
    assert.deepEqual(Object.keys(relatorio.registros[5].recusas), ["uf"]);
    assert.deepEqual(c.fotos, { aEnviarOuLigar: 3, jaLigadas: 0, semArquivo: 2, recusadas: 0, naLixeira: 0, baixaResolucao: 1, reduzidas: 1 });
    assert.equal(relatorio.registros[1].fotoMedidas?.baixaResolucao, true);
    assert.equal(relatorio.registros[3].fotoMedidas?.reduzidaComoNoNavegador, true);
    assert.equal(c.possiveisDuplicados, 1);
    assert.equal(relatorio.registros[6].possiveisDuplicados[0].motivo, "primeiro nome parecido e mesmo sobrenome");
    // O relatório não leva nomes, chaves nem contatos.
    const texto = JSON.stringify(relatorio);
    for (const proibido of ["Fictícia", "lote9-", "perfil.", "exemplo.invalid", "32000000"]) assert.ok(!texto.includes(proibido), proibido);
  });

  test("execução cria os válidos, ativos, com a foto da biblioteca e o registro da migração", async () => {
    const execucao = "20261104-000000-0002";
    const relatorio = await executar(execucao);
    assert.equal(relatorio.contagens.criados, 5);
    assert.equal(relatorio.contagens.fotosLigadas, 3);
    assert.equal(relatorio.contagens.falhas, 0);
    assert.equal(await contar("profissionais"), 6);

    const um = await doLote("lote9-um");
    assert.equal(um.get("ativo"), true);
    assert.equal(um.get("ordem"), 0);
    assert.deepEqual(um.get("origem"), { sistema: SISTEMA_DO_LOTE, chave: "lote9-um", execucao });
    const fotoId = um.get("fotoMidiaId");
    assert.ok(fotoId);
    const foto = await db.collection(COLECAO_MIDIAS).doc(fotoId).get();
    assert.equal(foto.get("alt"), "Foto de Pessoa Fictícia Um");
    assert.equal(foto.get("altProvisorio"), true);
    assert.equal(foto.get("conferenciaDeMenor"), "pendente");
    assert.deepEqual(foto.get("dono"), { tipo: "profissional", id: um.id, campo: "foto" });
    assert.deepEqual(foto.get("origem"), { sistema: SISTEMA_DO_LOTE, midiaId: "lote9-um", execucao });
    assert.deepEqual(foto.get("variantes").map((variante: { largura: number }) => variante.largura), [480, 800]);
    for (const variante of foto.get("variantes")) assert.equal((await servicos.bucket.file(variante.caminho).exists())[0], true);

    const quatro = await doLote("lote9-quatro");
    const grande = await db.collection(COLECAO_MIDIAS).doc(quatro.get("fotoMidiaId")).get();
    assert.deepEqual(grande.get("variantes").map((variante: { largura: number }) => variante.largura), [480, 960, 1600]);
    assert.equal(quatro.get("uf"), "");

    const tres = await doLote("lote9-tres");
    assert.equal(tres.get("fotoMidiaId"), null);
    assert.equal(tres.get("ativo"), true);
    assert.equal((await db.collection("profissionais").where("origem.chave", "in", ["lote9-cinco", "lote9-seis"]).get()).size, 0);

    // Toda linha do registro desta execução vem da migração.
    const registros = (await db.collection(COLECAO_LOG).where("execucao", "==", execucao).get()).docs;
    assert.ok(registros.length >= 5 + 3 + 3);
    assert.ok(registros.every((registro) => registro.get("origem") === "migracao" && registro.get("usuarioId") === "migracao"));
  });

  test("repetir não duplica; a foto que chega depois só é enviada e ligada", async () => {
    const antes = { profissionais: await contar("profissionais"), midias: await contar(COLECAO_MIDIAS) };
    const repetida = await executar("20261104-000000-0003");
    assert.equal(repetida.contagens.criados, 0);
    assert.equal(repetida.contagens.fotosLigadas, 0);
    assert.equal(repetida.contagens.jaExistentes, 5);
    assert.equal(await contar("profissionais"), antes.profissionais);
    assert.equal(await contar(COLECAO_MIDIAS), antes.midias);

    writeFileSync(join(pasta, "tres.webp"), await cor(600, 600).webp().toBuffer());
    const comFoto = await executar("20261104-000000-0004");
    assert.equal(comFoto.contagens.criados, 0);
    assert.equal(comFoto.contagens.fotosLigadas, 1);
    assert.equal(await contar("profissionais"), antes.profissionais);
    assert.equal(await contar(COLECAO_MIDIAS), antes.midias + 1);
    const tres = await doLote("lote9-tres");
    assert.ok(tres.get("fotoMidiaId"));
    // A origem do profissional continua a da primeira execução.
    assert.equal(tres.get("origem.execucao"), "20261104-000000-0002");
  });

  test("desfazer a execução da foto tardia tira a foto e deixa o profissional", async () => {
    const simulacao = await desfazerLote({ servicos, execucaoAlvo: "20261104-000000-0004", execucao: "20261104-000000-0005", modo: "simulacao" });
    assert.equal(simulacao.contagens.fotosDesfeitas, 1);
    assert.ok((await doLote("lote9-tres")).get("fotoMidiaId"));

    const tresAntes = await doLote("lote9-tres");
    const fotoId = tresAntes.get("fotoMidiaId");
    const caminhos = (await db.collection(COLECAO_MIDIAS).doc(fotoId).get()).get("variantes").map((variante: { caminho: string }) => variante.caminho);
    const feito = await desfazerLote({ servicos, execucaoAlvo: "20261104-000000-0004", execucao: "20261104-000000-0006", modo: "executar" });
    assert.equal(feito.contagens.profissionaisDesfeitos, 0);
    assert.equal(feito.contagens.fotosDesfeitas, 1);
    assert.equal(feito.contagens.fotosDesligadas, 1);
    assert.equal((await doLote("lote9-tres")).get("fotoMidiaId"), null);
    assert.equal((await db.collection(COLECAO_MIDIAS).doc(fotoId).get()).exists, false);
    for (const caminho of caminhos) assert.equal((await servicos.bucket.file(caminho).exists())[0], false);
  });

  test("desfazer a primeira execução pula o profissional alterado por uma pessoa e a foto dele", async () => {
    const um = await doLote("lote9-um");
    // Como o painel: só os campos do formulário, com a apresentação escrita.
    const atual = { ...um.data() } as Record<string, unknown>;
    for (const campo of ["origem", "criadoEm", "atualizadoEm", "excluidoEm"]) delete atual[campo];
    assert.ok((await gravarProfissional(db, um.id, { ...atual, bio: "Apresentação escrita no painel." } as DadosDoProfissional, PESSOA)).ok);

    const simulacao = await desfazerLote({ servicos, execucaoAlvo: "20261104-000000-0002", execucao: "20261104-000000-0007", modo: "simulacao" });
    assert.equal(simulacao.contagens.profissionaisEncontrados, 5);
    assert.equal(simulacao.contagens.profissionaisDesfeitos, 4);
    assert.equal(await contar("profissionais"), 6);

    const feito = await desfazerLote({ servicos, execucaoAlvo: "20261104-000000-0002", execucao: "20261104-000000-0008", modo: "executar" });
    assert.equal(feito.contagens.profissionaisDesfeitos, 4);
    assert.equal(feito.contagens.fotosEncontradas, 3);
    assert.equal(feito.contagens.fotosDesfeitas, 2);
    assert.deepEqual(feito.pulados.map((item) => item.motivo).sort(), ["alterado por uma pessoa depois do cadastro", "em uso fora do cadastro em lote"]);
    // Ficam o profissional de antes e o alterado por pessoa, com a foto.
    assert.equal(await contar("profissionais"), 2);
    const fica = await doLote("lote9-um");
    assert.equal((await db.collection(COLECAO_MIDIAS).doc(fica.get("fotoMidiaId")).get()).exists, true);
    assert.equal(await contar(COLECAO_MIDIAS), 1);
  });
});
