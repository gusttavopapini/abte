// Testes da biblioteca de mídia nos emuladores de Authentication, Firestore e
// Storage (npm run test:sessao). Usam as mesmas funções que as ações de
// servidor chamam: a decisão de acesso com a ação (papeis.ts) e o módulo da
// biblioteca (biblioteca.ts). Nada aqui toca o projeto real.
import assert from "node:assert/strict";
import { after, before, describe, mock, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { Timestamp, getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { decidirAcessoAoPainel } from "../../src/lib/auth/papeis.ts";
import { verificarCookieDeSessao } from "../../src/lib/auth/verificacao.ts";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import {
  COLECAO_MIDIAS,
  editarAlt,
  enviarImagem,
  excluirDeVez,
  moverParaLixeiraOuRestaurar,
  type ServicosDeMidia,
} from "../../src/lib/midia/biblioteca.ts";
import { CACHE_DAS_IMAGENS, MENSAGENS, detectarFormato } from "../../src/lib/midia/regras.ts";

const HOST_AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST;
let app: App;
let auth: Auth;
let db: Firestore;
let servicos: ServicosDeMidia;

const EDITOR: AutorDaAlteracao = { uid: "teste-midia-editor", nome: "TESTE Editor", papel: "editor" };
const ADMINISTRADOR: AutorDaAlteracao = { uid: "teste-midia-admin", nome: "TESTE Administrador", papel: "administrador" };

// Imagem fictícia (duas cores, sem pessoas), com EXIF e GPS para provar a remoção.
async function imagemDeTeste(largura = 1200, altura = 800) {
  return sharp({ create: { width: largura, height: altura, channels: 3, background: { r: 30, g: 120, b: 200 } } })
    .jpeg()
    .withExif({ IFD0: { Make: "Camera de teste" }, IFD3: { GPSLatitudeRef: "S", GPSLatitude: "23/1 33/1 0/1" } })
    .toBuffer();
}

async function existe(caminho: string) {
  return (await servicos.bucket.file(caminho).exists())[0];
}

async function registrosDe(documentoId: string) {
  const registros = await db.collection(COLECAO_LOG).where("documentoId", "==", documentoId).get();
  return registros.docs.map((documento) => documento.data());
}

async function entrar(email: string, senha: string): Promise<string> {
  const resposta = await fetch(`http://${HOST_AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=chave-de-teste`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: senha, returnSecureToken: true }),
  });
  const corpo = (await resposta.json()) as { idToken?: string };
  assert.ok(corpo.idToken, "login no emulador falhou");
  return corpo.idToken;
}

async function sessaoDe(email: string, papel?: string) {
  const usuario = await auth.createUser({ email, password: "senha-de-teste" });
  if (papel) await auth.setCustomUserClaims(usuario.uid, { papel });
  const cookie = await auth.createSessionCookie(await entrar(email, "senha-de-teste"), { expiresIn: 60 * 60 * 1000 });
  return { uid: usuario.uid, cookie };
}

before(() => {
  assert.ok(HOST_AUTH && process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: "demo-abte-sessao" }, "testes-midia");
  auth = getAuth(app);
  db = getFirestore(app);
  servicos = { db, bucket: getStorage(app).bucket("demo-abte-sessao.appspot.com") };
});

after(async () => {
  await deleteApp(app);
});

describe("Permissões das ações de mídia (sessões reais no emulador)", () => {
  test("sem sessão: recusa em todas as ações", async () => {
    const sessao = await verificarCookieDeSessao(auth, undefined);
    for (const acao of ["midia.enviar", "midia.excluirDeVez"] as const) {
      assert.deepEqual(decidirAcessoAoPainel(sessao, acao), { permitido: false, motivo: "sem-sessao" });
    }
  });

  test("logado sem papel: recusa", async () => {
    const { cookie } = await sessaoDe("teste-midia-sem-papel@exemplo.invalid");
    const sessao = await verificarCookieDeSessao(auth, cookie);
    assert.ok(sessao);
    assert.deepEqual(decidirAcessoAoPainel(sessao, "midia.enviar"), { permitido: false, motivo: "sem-papel" });
  });

  test("editor envia, mas não exclui de vez; administrador exclui de vez", async () => {
    const editor = await verificarCookieDeSessao(auth, (await sessaoDe("teste-midia-editor@exemplo.invalid", "editor")).cookie);
    const admin = await verificarCookieDeSessao(auth, (await sessaoDe("teste-midia-admin@exemplo.invalid", "administrador")).cookie);
    assert.deepEqual(decidirAcessoAoPainel(editor, "midia.enviar"), { permitido: true, papel: "editor" });
    assert.deepEqual(decidirAcessoAoPainel(editor, "midia.excluirDeVez"), { permitido: false, motivo: "sem-permissao" });
    assert.deepEqual(decidirAcessoAoPainel(admin, "midia.excluirDeVez"), { permitido: true, papel: "administrador" });
  });

  test("sessão revogada: recusa", async () => {
    const { uid, cookie } = await sessaoDe("teste-midia-revogado@exemplo.invalid", "administrador");
    assert.ok(await verificarCookieDeSessao(auth, cookie), "antes de revogar, a sessão vale");
    // A revogação vale para tokens emitidos ANTES dela; o relógio do token tem precisão de segundos.
    await new Promise((resolver) => setTimeout(resolver, 1100));
    await auth.revokeRefreshTokens(uid);
    const sessao = await verificarCookieDeSessao(auth, cookie);
    assert.equal(sessao, null);
    assert.deepEqual(decidirAcessoAoPainel(sessao, "midia.enviar"), { permitido: false, motivo: "sem-sessao" });
  });
});

describe("Biblioteca de mídia no Storage e no Firestore", () => {
  test("envio: grava WebP sem EXIF em publico/, com cache de um ano, documento e registro", async () => {
    const resultado = await enviarImagem(servicos, { bytes: await imagemDeTeste(), alt: "Imagem de teste em azul", indicaMenor: false, autorizacaoConfirmada: false }, EDITOR);
    assert.equal(resultado.ok, true);
    if (!resultado.ok) return;

    const documento = (await db.collection(COLECAO_MIDIAS).doc(resultado.id).get()).data();
    assert.ok(documento);
    assert.deepEqual(Object.keys(documento).sort(), [
      "alt", "altura", "autorizacaoConfirmadaEm", "autorizacaoConfirmadaPor", "caminhoStorage", "criadoEm",
      "enviadoPor", "excluidoEm", "indicaMenor", "largura", "tamanho", "tipo", "variantes",
    ]);
    assert.equal(documento.caminhoStorage, `publico/midias/${resultado.id}`);
    assert.equal(documento.tipo, "imagem");
    assert.equal(documento.enviadoPor, EDITOR.uid);
    assert.deepEqual([documento.largura, documento.altura], [1200, 800]);
    assert.deepEqual(documento.variantes.map((v: { largura: number }) => v.largura), [480, 960]);
    assert.equal(documento.excluidoEm, null);
    assert.ok(documento.criadoEm instanceof Timestamp);
    assert.equal(JSON.stringify(documento).includes("@"), false, "nenhum e-mail no documento");

    for (const variante of documento.variantes) {
      const arquivo = servicos.bucket.file(variante.caminho);
      const [metadados] = await arquivo.getMetadata();
      assert.equal(metadados.contentType, "image/webp");
      assert.equal(metadados.cacheControl, CACHE_DAS_IMAGENS);
      const [conteudo] = await arquivo.download();
      assert.equal(detectarFormato(conteudo), "webp");
      assert.equal(conteudo.length, variante.tamanho);
      assert.equal((await sharp(conteudo).metadata()).exif, undefined, "sem EXIF");
    }

    const [registro] = await registrosDe(resultado.id);
    assert.deepEqual(Object.keys(registro).sort(), ["acao", "campos", "colecao", "criadoEm", "documentoId", "papel", "resumo", "usuarioId", "usuarioNome"]);
    assert.equal(registro.acao, "criar");
    assert.equal(registro.colecao, "midias");
    assert.equal(registro.usuarioId, EDITOR.uid);
    assert.equal(registro.usuarioNome, EDITOR.nome);
    assert.equal(registro.papel, "editor");
    assert.ok(registro.criadoEm instanceof Timestamp);
    assert.equal(JSON.stringify(registro).includes("@"), false, "nenhum e-mail no registro");
  });

  test("imagem com criança ou adolescente: exige a confirmação e grava quem confirmou", async () => {
    const semConfirmar = await enviarImagem(servicos, { bytes: await imagemDeTeste(600, 400), alt: "Teste", indicaMenor: true, autorizacaoConfirmada: false }, EDITOR);
    assert.equal(semConfirmar.ok, false);
    if (!semConfirmar.ok) assert.equal(semConfirmar.campo, "autorizacao");

    const confirmado = await enviarImagem(servicos, { bytes: await imagemDeTeste(600, 400), alt: "Teste", indicaMenor: true, autorizacaoConfirmada: true }, EDITOR);
    assert.equal(confirmado.ok, true);
    if (!confirmado.ok) return;
    const documento = (await db.collection(COLECAO_MIDIAS).doc(confirmado.id).get()).data();
    assert.equal(documento?.indicaMenor, true);
    assert.equal(documento?.autorizacaoConfirmadaPor, EDITOR.uid);
    assert.ok(documento?.autorizacaoConfirmadaEm instanceof Timestamp);
  });

  test("envio recusado não grava arquivo, documento nem registro", async () => {
    const antes = (await db.collection(COLECAO_MIDIAS).count().get()).data().count;
    const [arquivosAntes] = await servicos.bucket.getFiles({ prefix: "publico/" });
    const sem = await enviarImagem(servicos, { bytes: new TextEncoder().encode("não sou imagem"), alt: "Teste", indicaMenor: false, autorizacaoConfirmada: false }, EDITOR);
    assert.deepEqual(sem, { ok: false, mensagem: MENSAGENS.outroFormato, campo: "arquivo" });
    const semAlt = await enviarImagem(servicos, { bytes: await imagemDeTeste(), alt: "  ", indicaMenor: false, autorizacaoConfirmada: false }, EDITOR);
    assert.equal(semAlt.ok, false);
    assert.equal((await db.collection(COLECAO_MIDIAS).count().get()).data().count, antes);
    assert.equal((await servicos.bucket.getFiles({ prefix: "publico/" }))[0].length, arquivosAntes.length);
  });

  test("editar alt, excluir para a lixeira, restaurar e excluir de vez, com registros", async () => {
    const envio = await enviarImagem(servicos, { bytes: await imagemDeTeste(), alt: "Teste", indicaMenor: false, autorizacaoConfirmada: false }, EDITOR);
    assert.equal(envio.ok, true);
    if (!envio.ok) return;
    const id = envio.id;
    const referencia = db.collection(COLECAO_MIDIAS).doc(id);

    assert.deepEqual(await editarAlt(servicos, id, "Imagem de teste revisada", EDITOR), { ok: true });
    assert.equal((await referencia.get()).get("alt"), "Imagem de teste revisada");

    // De vez, fora da lixeira: recusado.
    assert.equal((await excluirDeVez(servicos, id, ADMINISTRADOR)).ok, false);

    assert.deepEqual(await moverParaLixeiraOuRestaurar(servicos, id, true, EDITOR), { ok: true });
    let documento = (await referencia.get()).data();
    assert.ok(documento?.excluidoEm instanceof Timestamp);
    assert.equal(documento?.caminhoStorage, `lixeira/midias/${id}`);
    for (const largura of [480, 960]) {
      assert.equal(await existe(`publico/midias/${id}/${largura}.webp`), false, "saiu do ar");
      assert.equal(await existe(`lixeira/midias/${id}/${largura}.webp`), true, "não foi apagado");
    }
    const [metadadosNaLixeira] = await servicos.bucket.file(`lixeira/midias/${id}/480.webp`).getMetadata();
    assert.equal(metadadosNaLixeira.cacheControl, CACHE_DAS_IMAGENS, "metadados preservados ao mover");

    assert.deepEqual(await moverParaLixeiraOuRestaurar(servicos, id, false, EDITOR), { ok: true });
    documento = (await referencia.get()).data();
    assert.equal(documento?.excluidoEm, null);
    assert.equal(documento?.caminhoStorage, `publico/midias/${id}`);
    assert.equal(await existe(`publico/midias/${id}/960.webp`), true);
    assert.equal(await existe(`lixeira/midias/${id}/960.webp`), false);

    await moverParaLixeiraOuRestaurar(servicos, id, true, EDITOR);
    assert.deepEqual(await excluirDeVez(servicos, id, ADMINISTRADOR), { ok: true });
    assert.equal((await referencia.get()).exists, false);
    assert.equal((await servicos.bucket.getFiles({ prefix: `lixeira/midias/${id}/` }))[0].length, 0);

    const acoes = (await registrosDe(id)).map((registro) => registro.acao).sort();
    assert.deepEqual(acoes, ["criar", "editar", "excluir", "excluir", "excluir_definitivo", "restaurar"].sort());
    const definitivo = (await registrosDe(id)).find((registro) => registro.acao === "excluir_definitivo");
    assert.equal(definitivo?.papel, "administrador");
  });

  test("divisão entre publico/ e lixeira/: repetir Excluir ou Restaurar conserta", async () => {
    const envio = await enviarImagem(servicos, { bytes: await imagemDeTeste(), alt: "Teste divisão", indicaMenor: false, autorizacaoConfirmada: false }, EDITOR);
    assert.ok(envio.ok);
    const id = envio.id;
    const larguras = ((await db.collection(COLECAO_MIDIAS).doc(id).get()).get("variantes") as { largura: number }[]).map((v) => v.largura);
    assert.ok(larguras.length >= 2);

    // Simula uma tentativa que parou no meio: só a primeira variante foi para a lixeira.
    await servicos.bucket.file(`publico/midias/${id}/${larguras[0]}.webp`).move(`lixeira/midias/${id}/${larguras[0]}.webp`);
    assert.deepEqual(await moverParaLixeiraOuRestaurar(servicos, id, true, EDITOR), { ok: true });
    for (const largura of larguras) {
      assert.equal(await existe(`lixeira/midias/${id}/${largura}.webp`), true);
      assert.equal(await existe(`publico/midias/${id}/${largura}.webp`), false);
    }

    // O mesmo na volta: uma variante já voltou para publico/.
    await servicos.bucket.file(`lixeira/midias/${id}/${larguras[1]}.webp`).move(`publico/midias/${id}/${larguras[1]}.webp`);
    assert.deepEqual(await moverParaLixeiraOuRestaurar(servicos, id, false, EDITOR), { ok: true });
    for (const largura of larguras) assert.equal(await existe(`publico/midias/${id}/${largura}.webp`), true);
    assert.equal((await db.collection(COLECAO_MIDIAS).doc(id).get()).get("excluidoEm"), null);
  });

  test("falha ao desfazer vai para o log do servidor com o id; depois, repetir conserta", async () => {
    const envio = await enviarImagem(servicos, { bytes: await imagemDeTeste(), alt: "Teste falha", indicaMenor: false, autorizacaoConfirmada: false }, EDITOR);
    assert.ok(envio.ok);
    const id = envio.id;
    const [primeira, segunda] = ((await db.collection(COLECAO_MIDIAS).doc(id).get()).get("variantes") as { largura: number }[]).map((v) => v.largura);

    // Bucket que falha ao mover a segunda variante e também ao devolver a primeira.
    const falhar = new Set([`publico/midias/${id}/${segunda}.webp`, `lixeira/midias/${id}/${primeira}.webp`]);
    const bucketComFalha = {
      file(caminho: string) {
        const arquivo = servicos.bucket.file(caminho);
        return {
          exists: () => arquivo.exists(),
          move: async (destino: string) => {
            if (falhar.has(caminho)) throw new Error(`falha simulada ao mover ${caminho}`);
            return arquivo.move(destino);
          },
        };
      },
    } as unknown as ServicosDeMidia["bucket"];

    const erros = mock.method(console, "error", () => undefined);
    try {
      await assert.rejects(moverParaLixeiraOuRestaurar({ db, bucket: bucketComFalha }, id, true, EDITOR), /falha simulada/);
      const mensagens = erros.mock.calls.map((chamada) => chamada.arguments.join(" "));
      assert.ok(mensagens.some((texto) => texto.includes(`Mídia ${id}: falha ao devolver`)), mensagens.join(" | "));
      assert.ok(mensagens.every((texto) => !texto.includes("@")), "sem e-mail no log");
    } finally {
      erros.mock.restore();
    }

    // Ficou dividido e o documento não mudou; repetir sem a falha conserta.
    assert.equal(await existe(`lixeira/midias/${id}/${primeira}.webp`), true);
    assert.equal(await existe(`publico/midias/${id}/${segunda}.webp`), true);
    assert.equal((await db.collection(COLECAO_MIDIAS).doc(id).get()).get("excluidoEm"), null);
    assert.deepEqual(await moverParaLixeiraOuRestaurar(servicos, id, true, EDITOR), { ok: true });
    assert.equal(await existe(`lixeira/midias/${id}/${segunda}.webp`), true);
    assert.equal(await existe(`publico/midias/${id}/${primeira}.webp`), false);
  });

  test("arquivo sumido dos dois lugares: recusa e desfaz o que moveu", async () => {
    const envio = await enviarImagem(servicos, { bytes: await imagemDeTeste(), alt: "Teste sumido", indicaMenor: false, autorizacaoConfirmada: false }, EDITOR);
    assert.ok(envio.ok);
    const id = envio.id;
    const [primeira, segunda] = ((await db.collection(COLECAO_MIDIAS).doc(id).get()).get("variantes") as { largura: number }[]).map((v) => v.largura);
    await servicos.bucket.file(`publico/midias/${id}/${segunda}.webp`).delete();
    await assert.rejects(moverParaLixeiraOuRestaurar(servicos, id, true, EDITOR), /não encontrado/);
    assert.equal(await existe(`publico/midias/${id}/${primeira}.webp`), true, "a primeira voltou");
    assert.equal((await db.collection(COLECAO_MIDIAS).doc(id).get()).get("excluidoEm"), null);
  });
});
