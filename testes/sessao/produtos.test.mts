// Testes da galeria dos produtos e da imagem das categorias de produto nos
// emuladores de Firestore e Storage (npm run test:sessao). Usam as mesmas
// funções que as ações de servidor chamam (gravacao/produtos.ts,
// gravacao/topicos.ts e biblioteca.ts). Dados de exemplo, marcados como TESTE.
// Nada aqui toca o projeto real.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { imagensDoProdutoValidas } from "../../src/lib/gravacao/produtos.ts";
import { imagemDaCategoriaValida } from "../../src/lib/gravacao/topicos.ts";
import type { AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { enviarImagem, listarUsos, moverParaLixeiraOuRestaurar, type ServicosDeMidia } from "../../src/lib/midia/biblioteca.ts";

let app: App;
let db: Firestore;
let servicos: ServicosDeMidia;
const EDITOR: AutorDaAlteracao = { uid: "teste-produtos-editor", nome: "TESTE Editor", papel: "editor" };
const emOrdem = (ids: string[]) => ids.map((midiaId, ordem) => ({ midiaId, ordem }));

// Imagem fictícia de uma cor só, sem pessoas.
async function novaImagem(alt: string): Promise<string> {
  const bytes = await sharp({ create: { width: 600, height: 800, channels: 3, background: { r: 230, g: 180, b: 60 } } }).jpeg().toBuffer();
  const envio = await enviarImagem(servicos, { bytes, alt, indicaMenor: false, autorizacaoConfirmada: false }, EDITOR);
  assert.ok(envio.ok);
  return envio.id;
}

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: "demo-abte-sessao" }, "testes-produtos");
  db = getFirestore(app);
  servicos = { db, bucket: getStorage(app).bucket("demo-abte-sessao.appspot.com") };
});

after(async () => {
  await deleteApp(app);
});

describe("Galeria do produto", () => {
  test("produto novo: todas as imagens precisam existir e estar fora da lixeira", async () => {
    const a = await novaImagem("Produto de teste, frente");
    const b = await novaImagem("Produto de teste, verso");
    assert.equal(await imagensDoProdutoValidas(db, null, emOrdem([a, b])), true);
    assert.equal(await imagensDoProdutoValidas(db, null, emOrdem([])), true);
    assert.equal(await imagensDoProdutoValidas(db, null, emOrdem([a, "naoExisteTeste"])), false);
    await moverParaLixeiraOuRestaurar(servicos, b, true, EDITOR);
    assert.equal(await imagensDoProdutoValidas(db, null, emOrdem([a, b])), false);
  });

  test("edição: as já gravadas podem ficar mesmo na lixeira; as novas não", async () => {
    const a = await novaImagem("Produto de teste, gravada");
    const b = await novaImagem("Produto de teste, nova");
    const produto = await db.collection("produtos").add({ nome: "TESTE Produto", imagens: emOrdem([a]), excluidoEm: null });
    await moverParaLixeiraOuRestaurar(servicos, a, true, EDITOR);
    await moverParaLixeiraOuRestaurar(servicos, b, true, EDITOR);
    assert.equal(await imagensDoProdutoValidas(db, produto.id, emOrdem([a])), true, "a gravada fica");
    assert.equal(await imagensDoProdutoValidas(db, produto.id, emOrdem([a, b])), false, "a nova, na lixeira, não entra");
  });

  test("imagem em uso: lista produtos pela galeria (em qualquer posição) e categorias de produto pelo nome", async () => {
    const imagem = await novaImagem("Imagem de teste compartilhada na loja");
    const outra = await novaImagem("Outra imagem de teste da loja");
    await db.collection("produtos").add({ nome: "TESTE Produto Principal", imagens: emOrdem([imagem, outra]), excluidoEm: null });
    await db.collection("produtos").add({ nome: "TESTE Produto Segunda", imagens: emOrdem([outra, imagem]), excluidoEm: new Date() });
    await db.collection("produtos").add({ nome: "TESTE Produto Sem", imagens: emOrdem([outra]), excluidoEm: null });
    const categoria = await db.collection("categoriasDeProdutos").add({ nome: "TESTE Categoria Loja", slug: "teste-categoria-loja", ordem: 0, imagemMidiaId: imagem, excluidoEm: null });
    assert.deepEqual(await listarUsos(db, imagem), [
      { rotulo: "Produtos (galeria)", registros: ["TESTE Produto Principal", "TESTE Produto Segunda (na lixeira)"] },
      { rotulo: "Categorias de produtos (imagem)", registros: ["TESTE Categoria Loja"] },
    ]);
    assert.equal(await imagemDaCategoriaValida(db, "categoriasDeProdutos", categoria.id, imagem), true);
    assert.equal(await imagemDaCategoriaValida(db, "categoriasDeProdutos", categoria.id, "naoExisteTeste"), false);
  });
});
