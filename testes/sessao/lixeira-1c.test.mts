// Etapa 1c do painel (04/11/2026), no emulador do Firestore (npm run
// test:sessao), num projeto só dela (demo-abte-lixeira-1c): profissionais,
// produtos e banners da home com lixeira, restaurar, ativar e excluir de vez,
// e produtos com registro e duplicação. Dados fictícios; nada aqui toca o
// projeto real.
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { excluirBannerDeVez, moverBannerParaLixeira, mudarSituacaoDoBanner, restaurarBanner, salvarBanner } from "../../src/lib/gravacao/home.ts";
import { excluirDeVez, moverParaLixeira } from "../../src/lib/gravacao/lixeira.ts";
import { duplicarProduto, gravarProduto } from "../../src/lib/gravacao/produtos.ts";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { MENSAGENS_DA_LIXEIRA } from "../../src/lib/lixeira.ts";
import type { DadosDoProduto } from "../../src/lib/produtos.ts";
import { LIMITE_DE_BANNERS, lerConfiguracaoDaHome, slidesDaHome, type DadosDoBanner } from "../../src/lib/site/home.ts";

const PROJETO = "demo-abte-lixeira-1c";
const EDITOR: AutorDaAlteracao = { uid: "teste-1c-editor", nome: "TESTE Editor", papel: "editor" };
const ADMIN: AutorDaAlteracao = { uid: "teste-1c-admin", nome: "TESTE Administrador", papel: "administrador" };

let app: App;
let db: Firestore;

const PRODUTO: DadosDoProduto = { nome: "Produto fictício", descricao: "Descrição.", preco: 1990, precoPromocional: null, categoria: "cat", tipo: "fisico", status: "disponivel", selo: "", ordem: 1, publicado: true, imagens: [] };
const banner = (chave: string, extra: Partial<DadosDoBanner> = {}): DadosDoBanner => ({
  chave, midiaId: "midiaUm", midiaMobileId: null, midiaTabletId: null, alt: "Imagem fictícia", href: "", ativo: true, posicao: 99, pontoDeFoco: "centro", pontoDeFocoVertical: "centro",
  titulo: "", trechoEmDestaque: "", subtitulo: "", textoDoBotao: "", posicaoDoTexto: "esquerda", ...extra,
});
const home = async () => lerConfiguracaoDaHome((await db.collection("configuracoes").doc("home").get()).data());

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: PROJETO }, "testes-lixeira-1c");
  db = getFirestore(app);
});

beforeEach(async () => {
  for (const colecao of ["profissionais", "posts", "diretoria", "produtos", "categoriasDeProdutos", "midias", "configuracoes", COLECAO_LOG]) {
    await Promise.all((await db.collection(colecao).listDocuments()).map((documento) => documento.delete()));
  }
  await db.collection("categoriasDeProdutos").doc("cat").set({ nome: "Categoria fictícia", excluidoEm: null });
  await db.collection("midias").doc("midiaUm").set({ alt: "Imagem fictícia", variantes: [{ largura: 480, caminho: "publico/midias/midiaUm/480.webp" }], excluidoEm: null });
});

after(async () => {
  await deleteApp(app);
});

describe("Profissionais", () => {
  test("excluir de vez recusa quem é autor de post, com mensagem clara", async () => {
    await db.collection("profissionais").doc("pf").set({ nome: "Pessoa Fictícia", ativo: true, excluidoEm: null });
    await db.collection("posts").doc("p").set({ titulo: "Post de autoria fictícia", autorProfissionalId: "pf" });
    await moverParaLixeira(db, "profissionais", "pf", EDITOR);
    assert.equal((await db.collection("profissionais").doc("pf").get()).get("ativo"), true, "a lixeira não muda a situação do profissional");
    const recusa = await excluirDeVez(db, "profissionais", "pf", "EXCLUIR", ADMIN);
    assert.deepEqual(recusa, {
      ok: false,
      mensagem: 'Não é possível excluir de vez: está em uso em 1 post(s) como autor (ex.: "Post de autoria fictícia"). Tire o vínculo nesses itens antes, inclusive nos que estão na lixeira.',
    });
    await db.collection("diretoria").doc("d").set({ cargo: "Cargo fictício", profissionalId: "pf" });
    const duas = await excluirDeVez(db, "profissionais", "pf", "EXCLUIR", ADMIN);
    assert.match(duas.ok ? "" : duas.mensagem, /1 membro\(s\) da diretoria \(ex\.: "Cargo fictício"\) e em 1 post\(s\) como autor/);
    assert.equal((await db.collection("profissionais").doc("pf").get()).exists, true);
  });
});

describe("Produtos", () => {
  test("criar e editar gravam no registro; categoria na lixeira é recusada", async () => {
    const criado = await gravarProduto(db, null, PRODUTO, EDITOR);
    assert.ok(criado.ok);
    if (!criado.ok) return;
    const documento = (await db.collection("produtos").doc(criado.id).get()).data() ?? {};
    assert.equal(documento.slug, "produto-ficticio");
    assert.equal(documento.excluidoEm, null);
    await gravarProduto(db, criado.id, { ...PRODUTO, preco: 2990 }, EDITOR);
    const registros = (await db.collection(COLECAO_LOG).where("documentoId", "==", criado.id).get()).docs.map((registro) => registro.data());
    assert.deepEqual(registros.map((registro) => registro.resumo).sort(), ["Produto alterado.", "Produto criado."]);
    assert.deepEqual(registros.find((registro) => registro.acao === "editar")?.campos, ["preco"]);
    await db.collection("categoriasDeProdutos").doc("cat").update({ excluidoEm: new Date() });
    assert.equal((await gravarProduto(db, null, PRODUTO, EDITOR)).ok, false);
  });

  test("duplicar cria a cópia fora da loja, com slug novo e só as imagens disponíveis", async () => {
    await db.collection("midias").doc("midiaNaLixeira").set({ variantes: [{ largura: 480, caminho: "x" }], excluidoEm: new Date() });
    const criado = await gravarProduto(db, null, { ...PRODUTO, imagens: [{ midiaId: "midiaUm", ordem: 0 }] }, EDITOR);
    assert.ok(criado.ok);
    if (!criado.ok) return;
    await db.collection("produtos").doc(criado.id).update({ imagens: [{ midiaId: "midiaNaLixeira", ordem: 0 }, { midiaId: "midiaUm", ordem: 1 }], origem: { sistema: "wix" }, revisarMigracao: true });
    const copia = await duplicarProduto(db, criado.id, EDITOR);
    assert.ok(copia.ok);
    if (!copia.ok) return;
    const dados = (await db.collection("produtos").doc(copia.id).get()).data() ?? {};
    assert.equal(dados.nome, "Cópia de Produto fictício");
    assert.equal(dados.slug, "copia-de-produto-ficticio");
    assert.equal(dados.publicado, false);
    assert.equal(dados.preco, 1990);
    assert.deepEqual(dados.imagens, [{ midiaId: "midiaUm", ordem: 0 }]);
    assert.equal("origem" in dados || "revisarMigracao" in dados, false);
    assert.equal((await db.collection(COLECAO_LOG).where("documentoId", "==", copia.id).get()).docs[0]?.get("resumo"), "Produto duplicado fora da loja.");
    // O original continua publicado.
    assert.equal((await db.collection("produtos").doc(criado.id).get()).get("publicado"), true);
  });
});

describe("Banners da home", () => {
  test("ativar, lixeira, restaurar e excluir de vez, com o registro", async () => {
    await salvarBanner(db, banner("banner-um000001"), EDITOR);
    await salvarBanner(db, banner("banner-dois00002"), EDITOR);
    await salvarBanner(db, banner("banner-tres00003"), EDITOR);

    assert.deepEqual(await mudarSituacaoDoBanner(db, "banner-dois00002", false, EDITOR), { ok: true, nome: "Segundo banner", mudou: true });
    assert.deepEqual(await mudarSituacaoDoBanner(db, "banner-dois00002", false, EDITOR), { ok: true, nome: "Segundo banner", mudou: false });
    assert.equal((await home()).banners.find((item) => item.chave === "banner-dois00002")?.ativo, false);

    assert.deepEqual(await moverBannerParaLixeira(db, "banner-um000001", EDITOR), { ok: true, nome: "Primeiro banner", mudou: true });
    let banners = (await home()).banners;
    assert.deepEqual(banners.map((item) => [item.chave, item.ordem, item.ativo, Boolean(item.excluidoEm)]), [
      ["banner-dois00002", 1, false, false],
      ["banner-tres00003", 2, true, false],
      ["banner-um000001", 3, false, true],
    ]);
    // Na lixeira, some do site e não volta a ser ativado.
    const imagens = new Map([["midiaUm", { alt: "a", largura: 480, altura: 480, variantes: [{ largura: 480, url: "https://exemplo.invalid/a.webp" }] }]]);
    assert.equal(slidesDaHome(await home(), imagens).length, 1);
    assert.deepEqual(await mudarSituacaoDoBanner(db, "banner-um000001", true, EDITOR), { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.naLixeira });
    assert.deepEqual(await salvarBanner(db, banner("banner-um000001", { ativo: true }), EDITOR), { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.naLixeira });
    assert.deepEqual(await excluirBannerDeVez(db, "banner-tres00003", "EXCLUIR", ADMIN), { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.soDaLixeira });
    assert.deepEqual(await excluirBannerDeVez(db, "banner-um000001", "EXCL", ADMIN), { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.confirmacao });

    // Restaurar: volta para o fim da lista, desativado.
    await restaurarBanner(db, "banner-um000001", EDITOR);
    banners = (await home()).banners;
    assert.deepEqual(banners.map((item) => [item.chave, item.ordem, item.ativo, Boolean(item.excluidoEm)]), [
      ["banner-dois00002", 1, false, false],
      ["banner-tres00003", 2, true, false],
      ["banner-um000001", 3, false, false],
    ]);

    await moverBannerParaLixeira(db, "banner-um000001", EDITOR);
    assert.deepEqual(await excluirBannerDeVez(db, "banner-um000001", "banner banner-um000001", ADMIN), { ok: true, nome: "Banner banner-um000001", mudou: true });
    assert.deepEqual((await home()).banners.map((item) => item.chave), ["banner-dois00002", "banner-tres00003"]);

    const resumos = (await db.collection(COLECAO_LOG).get()).docs.map((registro) => [registro.get("acao"), registro.get("resumo")]);
    for (const esperado of [["editar", "Banner desativado."], ["excluir", "Banner movido para a lixeira."], ["restaurar", "Banner restaurado da lixeira."], ["excluir_definitivo", "Banner excluído de vez."]]) {
      assert.ok(resumos.some((resumo) => JSON.stringify(resumo) === JSON.stringify(esperado)), esperado.join(" "));
    }
  });

  test("os da lixeira contam no limite; a posição conta só os de fora; salvar mantém a lixeira", async () => {
    for (let numero = 1; numero <= LIMITE_DE_BANNERS; numero++) await salvarBanner(db, banner(`banner-lim0000${numero}`), EDITOR);
    await moverBannerParaLixeira(db, "banner-lim00001", EDITOR);
    const cheio = await salvarBanner(db, banner("banner-novo0001"), EDITOR);
    assert.equal(cheio.ok, false);
    assert.match(cheio.ok ? "" : cheio.mensagem, /contando os da lixeira/);
    // Banner da lixeira salvo desativado continua na lixeira; mover outro para
    // a primeira posição não passa os da lixeira à frente.
    assert.equal((await salvarBanner(db, banner("banner-lim00001", { ativo: false, alt: "Outro texto" }), EDITOR)).ok, true);
    await salvarBanner(db, banner("banner-lim00008", { posicao: 1 }), EDITOR);
    const banners = (await home()).banners;
    assert.ok(banners.find((item) => item.chave === "banner-lim00001")?.excluidoEm);
    assert.equal(banners[0].chave, "banner-lim00008");
    assert.equal(banners.at(-1)?.chave, "banner-lim00001");
  });
});
