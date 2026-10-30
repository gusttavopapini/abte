// Vídeo de "Quem Somos" (30/10/2026) nos emuladores (npm run test:sessao;
// projeto demo): permissão com sessões reais, política de envio (com uma
// assinatura falsa, porque o emulador não assina), conferência do objeto
// enviado no Storage do emulador e a gravação com o registro.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { decidirAcessoAoPainel } from "../../src/lib/auth/papeis.ts";
import { verificarCookieDeSessao } from "../../src/lib/auth/verificacao.ts";
import sharp from "sharp";
import { MENSAGEM_CAPA_DO_VIDEO_INDISPONIVEL, conferirEnvioDoVideo, gerarCapaDoYoutube, prepararEnvioDoVideo, prepararEnvioRetomavel, salvarVideoQuemSomos, type Assinador, type Buscador } from "../../src/lib/gravacao/videoQuemSomos.ts";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { COLECAO_MIDIAS } from "../../src/lib/midia/biblioteca.ts";
import { lerConfiguracaoDaHome } from "../../src/lib/site/home.ts";

const HOST_AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST;
let app: App;
let appDoLogin: App;
let auth: Auth;
let db: Firestore;
let bucket: ReturnType<ReturnType<typeof getStorage>["bucket"]>;
const EDITOR: AutorDaAlteracao = { uid: "teste-video-editor", nome: "TESTE Editor", papel: "editor" };
const ID = "abcdefghij0123456789";

async function sessaoDe(email: string, papel?: string) {
  const usuario = await auth.createUser({ email, password: "senha-de-teste" });
  if (papel) await auth.setCustomUserClaims(usuario.uid, { papel });
  const resposta = await fetch(`http://${HOST_AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=chave-de-teste`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "senha-de-teste", returnSecureToken: true }),
  });
  const { idToken } = (await resposta.json()) as { idToken: string };
  return verificarCookieDeSessao(auth, await auth.createSessionCookie(idToken, { expiresIn: 60 * 60 * 1000 }));
}

before(async () => {
  assert.ok(HOST_AUTH && process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: "demo-abte-video" }, "testes-video");
  appDoLogin = initializeApp({ projectId: "demo-abte-sessao" }, "testes-video-login");
  auth = getAuth(appDoLogin);
  db = getFirestore(app);
  bucket = getStorage(app).bucket("demo-abte-video.appspot.com");
  await db.collection(COLECAO_MIDIAS).doc("capaUm").set({ alt: "Capa de teste", variantes: [{ largura: 480, caminho: "publico/midias/capaUm/480.webp", tamanho: 1 }], excluidoEm: null });
  await db.collection(COLECAO_MIDIAS).doc("capaNaLixeira").set({ alt: "x", variantes: [{ largura: 480, caminho: "x", tamanho: 1 }], excluidoEm: new Date() });
});

after(async () => {
  await deleteApp(app);
  await deleteApp(appDoLogin);
});

describe("Vídeo de Quem Somos: sessão e papel", () => {
  test("sem sessão e sem papel recusados; editor e administrador editam (home.editar)", async () => {
    assert.deepEqual(decidirAcessoAoPainel(await verificarCookieDeSessao(auth, undefined), "home.editar"), { permitido: false, motivo: "sem-sessao" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-video-sem-papel@exemplo.invalid"), "home.editar"), { permitido: false, motivo: "sem-papel" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-video-editor@exemplo.invalid", "editor"), "home.editar"), { permitido: true, papel: "editor" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-video-admin@exemplo.invalid", "administrador"), "home.editar"), { permitido: true, papel: "administrador" });
  });
});

describe("Vídeo de Quem Somos: assinatura e confirmação", () => {
  test("política com caminho próprio, tipo e tamanho; pedido fora do limite não assina", async () => {
    const pedidos: unknown[] = [];
    const assinar: Assinador = async (_bucket, caminho, contentType, condicoes) => {
      pedidos.push({ caminho, contentType, condicoes });
      return { url: "https://exemplo.invalid/envio", campos: { key: caminho } };
    };
    const preparado = await prepararEnvioDoVideo(bucket, { arquivo: "video", contentType: "video/mp4", tamanho: 1000 }, ID, assinar);
    assert.ok(preparado.ok);
    assert.equal(preparado.caminho, `publico/videos/${ID}/video.mp4`);
    assert.deepEqual(pedidos, [{ caminho: `publico/videos/${ID}/video.mp4`, contentType: "video/mp4", condicoes: [["content-length-range", 1, 1073741824], ["eq", "$Content-Type", "video/mp4"]] }]);
    assert.equal((await prepararEnvioDoVideo(bucket, { arquivo: "video", contentType: "video/quicktime", tamanho: 1000 }, ID, assinar)).ok, false);
    assert.equal(pedidos.length, 1, "pedido recusado não chega a ser assinado");
  });

  test("confirmação: aceita o objeto certo; tipo errado e legenda inválida são recusados e apagados", async () => {
    const video = `publico/videos/${ID}/video.mp4`;
    assert.deepEqual(await conferirEnvioDoVideo(bucket, "video", video), { ok: false, mensagem: "O arquivo não chegou ao armazenamento. Envie de novo." });
    await bucket.file(video).save(Buffer.from("video de teste"), { contentType: "video/mp4", resumable: false });
    assert.deepEqual(await conferirEnvioDoVideo(bucket, "video", video), { ok: true, caminho: video, contentType: "video/mp4", tamanho: 14 });

    const errado = "publico/videos/zzzzzzzzzz0123456789/video.mp4";
    await bucket.file(errado).save(Buffer.from("<html>"), { contentType: "text/html", resumable: false });
    assert.equal((await conferirEnvioDoVideo(bucket, "video", errado)).ok, false);
    assert.equal((await bucket.file(errado).exists())[0], false, "objeto recusado é apagado");

    const legenda = `publico/videos/${ID}/legenda.vtt`;
    await bucket.file(legenda).save(Buffer.from("isto não é webvtt"), { contentType: "text/vtt", resumable: false });
    assert.equal((await conferirEnvioDoVideo(bucket, "legenda", legenda)).ok, false);
    await bucket.file(legenda).save(Buffer.from("WEBVTT\n\n00:00.000 --> 00:01.000\nTeste"), { contentType: "text/vtt", resumable: false });
    assert.equal((await conferirEnvioDoVideo(bucket, "legenda", legenda)).ok, true);
    assert.equal((await conferirEnvioDoVideo(bucket, "video", "publico/midias/x/960.webp")).ok, false, "caminho fora de publico/videos");
  });
});

describe("Vídeo de Quem Somos: gravação", () => {
  test("grava YouTube, troca por arquivo sem misturar campos, remove; registro só com os nomes", async () => {
    const comum = { descricao: "Vídeo fictício de teste", capaMidiaId: "capaUm", legendaCaminho: null, indicaMenor: false };
    assert.deepEqual(await salvarVideoQuemSomos(db, { ...comum, tipo: "youtube", youtubeId: "dQw4w9WgXcQ" }, EDITOR), { ok: true, alterados: ["vídeo", "descrição", "capa"] });
    assert.deepEqual(await salvarVideoQuemSomos(db, { ...comum, tipo: "arquivo", caminho: `publico/videos/${ID}/video.mp4`, contentType: "video/mp4", tamanho: 14 }, EDITOR), { ok: true, alterados: ["vídeo"] });
    const bruto = (await db.collection("configuracoes").doc("home").get()).get("videoQuemSomos");
    assert.equal(bruto.youtubeId, undefined, "o campo é trocado inteiro");
    assert.deepEqual(bruto.dono, { tipo: "home", id: "quem-somos-video", campo: "video" });
    assert.equal(lerConfiguracaoDaHome((await db.collection("configuracoes").doc("home").get()).data()).video?.tipo, "arquivo");
    assert.deepEqual(await salvarVideoQuemSomos(db, { ...comum, capaMidiaId: "capaNaLixeira", tipo: "youtube", youtubeId: "dQw4w9WgXcQ" }, EDITOR), { ok: false, mensagem: MENSAGEM_CAPA_DO_VIDEO_INDISPONIVEL, campo: "capaMidiaId" });
    assert.deepEqual(await salvarVideoQuemSomos(db, null, EDITOR), { ok: true, alterados: ["vídeo removido"] });
    assert.equal(lerConfiguracaoDaHome((await db.collection("configuracoes").doc("home").get()).data()).video, null);
    const linhas = (await db.collection(COLECAO_LOG).where("documentoId", "==", "home").get()).docs.map((d) => d.data());
    assert.equal(linhas.length, 3);
    for (const linha of linhas) {
      assert.deepEqual(linha.campos, ["videoQuemSomos"]);
      assert.doesNotMatch(JSON.stringify(linha), /dQw4w9WgXcQ|fictício|publico\/videos/, "o registro não guarda valores");
    }
  });
});

describe("Vídeo de Quem Somos: envio retomável e capa automática (30/10/2026)", () => {
  test("sessão retomável: caminho próprio, tipo, origem e limite de 1 GB", async () => {
    const pedidos: unknown[] = [];
    const preparado = await prepararEnvioRetomavel(bucket, { contentType: "video/webm", tamanho: 500 * 1024 * 1024 }, ID, "http://localhost:3000", async (_bucket, caminho, contentType, origem) => {
      pedidos.push({ caminho, contentType, origem });
      return "https://exemplo.invalid/sessao";
    });
    assert.deepEqual(preparado, { ok: true, caminho: `publico/videos/${ID}/video.webm`, sessao: "https://exemplo.invalid/sessao" });
    assert.deepEqual(pedidos, [{ caminho: `publico/videos/${ID}/video.webm`, contentType: "video/webm", origem: "http://localhost:3000" }]);
    assert.equal((await prepararEnvioRetomavel(bucket, { contentType: "video/mp4", tamanho: 1073741825 }, ID, "x", async () => "nunca")).ok, false);
  });

  // Miniatura fictícia 16:9 com barras pretas dos lados (vídeo vertical).
  async function miniatura(largura: number, altura: number): Promise<Buffer> {
    const meio = Math.round(altura * 9 / 16);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}"><rect width="100%" height="100%" fill="#000"/><rect x="${(largura - meio) / 2}" width="${meio}" height="${altura}" fill="#1f5fbf"/></svg>`;
    return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
  }
  const resposta = (corpo: Buffer | null, status = 200, tipo = "image/jpeg") =>
    new Response(corpo ? new Uint8Array(corpo) : null, { status, headers: corpo ? { "content-type": tipo, "content-length": String(corpo.length) } : {} });

  test("capa a partir do YouTube: só i.ytimg.com com o id; maxres 404 cai para hq; barras cortadas; dono e alt provisório", async () => {
    const pedidos: string[] = [];
    const buscar: Buscador = async (url) => {
      pedidos.push(url);
      return url.endsWith("/maxresdefault.jpg") ? resposta(null, 404) : resposta(await miniatura(480, 360));
    };
    const servicos = { db, bucket };
    const gerada = await gerarCapaDoYoutube(servicos, { youtubeId: "dQw4w9WgXcQ", descricao: "Vídeo fictício de teste" }, EDITOR, buscar);
    assert.ok(gerada.ok);
    assert.deepEqual(pedidos, ["https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg", "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"]);
    assert.ok(gerada.proporcao < 0.7, `barras cortadas (proporção ${gerada.proporcao.toFixed(2)})`);
    const midia = (await db.collection(COLECAO_MIDIAS).doc(gerada.capaMidiaId).get()).data();
    assert.deepEqual(midia?.dono, { tipo: "home", id: "quem-somos-video", campo: "videoCapa" });
    assert.equal(midia?.alt, "Vídeo fictício de teste");
    assert.equal(midia?.altProvisorio, true);
    assert.equal(midia?.conferenciaDeMenor, "pendente");
  });

  test("miniatura recusada (tipo errado, minúscula, grande demais ou falha): sem capa, com mensagem", async () => {
    const servicos = { db, bucket };
    for (const buscar of [
      (async () => resposta(Buffer.from("<html>"), 200, "text/html")) as Buscador,
      (async () => resposta(await miniatura(120, 90))) as Buscador,
      (async () => resposta(Buffer.alloc(3 * 1024 * 1024), 200)) as Buscador,
      (async () => { throw new Error("tempo esgotado"); }) as Buscador,
    ]) {
      const gerada = await gerarCapaDoYoutube(servicos, { youtubeId: "dQw4w9WgXcQ", descricao: "x" }, EDITOR, buscar);
      assert.deepEqual(gerada, { ok: false, mensagem: "Não foi possível baixar a miniatura do YouTube. Envie uma imagem de capa." });
    }
  });
});


describe("Confirmação de menores do vídeo", () => {
  test("preserva confirmação em edição e renova ao trocar a fonte; desmarcar remove", async () => {
    const video = { descricao: "Vídeo fictício", capaMidiaId: null, legendaCaminho: null, indicaMenor: true, tipo: "youtube" as const, youtubeId: "dQw4w9WgXcQ" };
    const ref = db.collection("configuracoes").doc("home");
    await salvarVideoQuemSomos(db, video, EDITOR);
    const inicial = (await ref.get()).get("videoQuemSomos");
    const outro = { ...EDITOR, uid: "teste-outro-editor" };
    await salvarVideoQuemSomos(db, { ...video, descricao: "Descrição revisada" }, outro);
    const revisado = (await ref.get()).get("videoQuemSomos");
    assert.equal(revisado.autorizacaoConfirmadaPor, EDITOR.uid);
    assert.equal(revisado.autorizacaoConfirmadaEm.toMillis(), inicial.autorizacaoConfirmadaEm.toMillis());
    await salvarVideoQuemSomos(db, { ...video, youtubeId: "abcdefghijk" }, outro);
    assert.equal((await ref.get()).get("videoQuemSomos.autorizacaoConfirmadaPor"), outro.uid);
    await salvarVideoQuemSomos(db, { ...video, indicaMenor: false }, outro);
    assert.equal((await ref.get()).get("videoQuemSomos.autorizacaoConfirmadaPor"), undefined);
    assert.equal((await ref.get()).get("videoQuemSomos.autorizacaoConfirmadaEm"), undefined);
  });
});
