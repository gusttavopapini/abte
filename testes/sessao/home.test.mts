// Imagens da home (29/10/2026) nos emuladores (npm run test:sessao; projeto
// demo, nada toca o projeto real): decisão de acesso com sessões reais e a
// gravação em configuracoes/home com o registro em logAlteracoes.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { decidirAcessoAoPainel } from "../../src/lib/auth/papeis.ts";
import { verificarCookieDeSessao } from "../../src/lib/auth/verificacao.ts";
import { MENSAGEM_IMAGEM_CELULAR_INDISPONIVEL, MENSAGEM_IMAGEM_DA_HOME_INDISPONIVEL, excluirBanner, salvarBanner, salvarImagemDoEspaco } from "../../src/lib/gravacao/home.ts";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { COLECAO_MIDIAS } from "../../src/lib/midia/biblioteca.ts";
import { LIMITE_DE_BANNERS, lerConfiguracaoDaHome } from "../../src/lib/site/home.ts";

const HOST_AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST;
let app: App;
let appDoLogin: App;
let auth: Auth;
let db: Firestore;

const EDITOR: AutorDaAlteracao = { uid: "teste-home-editor", nome: "TESTE Editor", papel: "editor" };
const ADMINISTRADOR: AutorDaAlteracao = { uid: "teste-home-admin", nome: "TESTE Administrador", papel: "administrador" };

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
  return verificarCookieDeSessao(auth, await auth.createSessionCookie(await entrar(email, "senha-de-teste"), { expiresIn: 60 * 60 * 1000 }));
}

async function configuracao() {
  return lerConfiguracaoDaHome((await db.collection("configuracoes").doc("home").get()).data());
}

async function registros() {
  const lidos = await db.collection(COLECAO_LOG).where("documentoId", "==", "home").get();
  return lidos.docs.map((documento) => documento.data()).sort((a, b) => a.criadoEm.toMillis() - b.criadoEm.toMillis());
}

// Imagem fictícia já "na biblioteca" (só o documento: a gravação confere se
// existe, está fora da lixeira e tem variantes).
async function midia(id: string, excluida = false) {
  await db.collection(COLECAO_MIDIAS).doc(id).set({ alt: "Imagem de teste", variantes: [{ largura: 480, caminho: `publico/midias/${id}/480.webp`, tamanho: 1 }], excluidoEm: excluida ? new Date() : null });
}

before(async () => {
  assert.ok(HOST_AUTH && process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: "demo-abte-home" }, "testes-home");
  appDoLogin = initializeApp({ projectId: "demo-abte-sessao" }, "testes-home-login");
  auth = getAuth(appDoLogin);
  db = getFirestore(app);
  await midia("midiaUm");
  await midia("midiaDois");
  await midia("midiaNaLixeira", true);
  await midia("celularUm");
  await midia("celularDois");
  await midia("celularNaLixeira", true);
  // Mídia "inativa": sem variantes (o envio não terminou).
  await db.collection(COLECAO_MIDIAS).doc("celularSemVariantes").set({ alt: "x", variantes: [], excluidoEm: null });
});

after(async () => {
  await deleteApp(app);
  await deleteApp(appDoLogin);
});

describe("Home: sessão e papel (sessões reais no emulador)", () => {
  test("sem sessão e sem papel: recusa; editor e administrador editam", async () => {
    assert.deepEqual(decidirAcessoAoPainel(await verificarCookieDeSessao(auth, undefined), "home.editar"), { permitido: false, motivo: "sem-sessao" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-home-sem-papel@exemplo.invalid"), "home.editar"), { permitido: false, motivo: "sem-papel" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-home-editor@exemplo.invalid", "editor"), "home.editar"), { permitido: true, papel: "editor" });
    assert.deepEqual(decidirAcessoAoPainel(await sessaoDe("teste-home-admin@exemplo.invalid", "administrador"), "home.editar"), { permitido: true, papel: "administrador" });
  });
});

describe("Home: gravação e registro", () => {
  test("cria, reordena, altera e exclui banners, com uma linha no registro por ação", async () => {
    assert.deepEqual(await salvarBanner(db, { chave: "banner-um000001", midiaId: "midiaUm", midiaMobileId: null, alt: "Um", href: "/loja", ativo: true, posicao: 1 }, EDITOR), { ok: true, nome: "Primeiro banner" });
    assert.deepEqual(await salvarBanner(db, { chave: "banner-dois00002", midiaId: "midiaDois", midiaMobileId: null, alt: "Dois", href: "https://www.exemplo.org", ativo: true, posicao: 1 }, EDITOR), { ok: true, nome: "Primeiro banner" });
    assert.deepEqual((await configuracao()).banners.map((banner) => [banner.chave, banner.ordem]), [["banner-dois00002", 1], ["banner-um000001", 2]]);

    assert.deepEqual(await salvarBanner(db, { chave: "banner-um000001", midiaId: "midiaUm", midiaMobileId: null, alt: "Um", href: "", ativo: false, posicao: 2 }, EDITOR), { ok: true, nome: "Segundo banner" });
    assert.deepEqual(await excluirBanner(db, "banner-dois00002", EDITOR), { ok: true, nome: "Primeiro banner" });
    assert.deepEqual((await configuracao()).banners.map((banner) => [banner.chave, banner.ordem, banner.ativo]), [["banner-um000001", 1, false]]);

    const linhas = await registros();
    assert.deepEqual(
      linhas.map((linha) => [linha.acao, linha.resumo]),
      [
        ["criar", "Primeiro banner criado."],
        ["criar", "Primeiro banner criado."],
        ["editar", "Segundo banner alterado: link, ativo."],
        ["excluir", "Primeiro banner excluído."],
      ],
    );
    for (const linha of linhas) {
      assert.deepEqual(linha.campos, ["banners"]);
      assert.equal(linha.usuarioId, EDITOR.uid);
      assert.doesNotMatch(JSON.stringify(linha), /exemplo\.org|\/loja/, "o registro não guarda valores");
    }
  });

  test("imagem fora da biblioteca e limite de banners recusam sem gravar", async () => {
    const antes = (await registros()).length;
    assert.deepEqual(await salvarBanner(db, { chave: "banner-lixo0001", midiaId: "midiaNaLixeira", midiaMobileId: null, alt: "x", href: "", ativo: true, posicao: 1 }, EDITOR), { ok: false, mensagem: MENSAGEM_IMAGEM_DA_HOME_INDISPONIVEL, campo: "midiaId" });
    for (let indice = (await configuracao()).banners.length; indice < LIMITE_DE_BANNERS; indice++) {
      await salvarBanner(db, { chave: `banner-limite${indice}x`, midiaId: null, midiaMobileId: null, alt: "", href: "", ativo: false, posicao: indice + 1 }, EDITOR);
    }
    const recusado = await salvarBanner(db, { chave: "banner-nono0009", midiaId: null, midiaMobileId: null, alt: "", href: "", ativo: false, posicao: 1 }, EDITOR);
    assert.deepEqual(recusado, { ok: false, mensagem: `A home aceita no máximo ${LIMITE_DE_BANNERS} banners.` });
    assert.equal((await configuracao()).banners.length, LIMITE_DE_BANNERS);
    assert.equal((await registros()).length, antes + LIMITE_DE_BANNERS - 1);
  });

  test("imagem de seção: salva, troca e remove (volta ao padrão), com registro", async () => {
    assert.deepEqual(await salvarImagemDoEspaco(db, "secao-mutiroes", { midiaId: "midiaUm", midiaMobileId: null, alt: "Mutirão" }, EDITOR), { ok: true, nome: "Mutirões que Transformam Vidas" });
    assert.deepEqual((await configuracao()).imagens["secao-mutiroes"], { midiaId: "midiaUm", midiaMobileId: null, alt: "Mutirão" });
    await salvarImagemDoEspaco(db, "secao-mutiroes", { midiaId: null, midiaMobileId: null, alt: "" }, EDITOR);
    assert.equal((await configuracao()).imagens["secao-mutiroes"], undefined);
    const ultimas = (await registros()).slice(-2);
    assert.deepEqual(ultimas.map((linha) => linha.campos), [["imagens.secao-mutiroes"], ["imagens.secao-mutiroes"]]);
    assert.equal(ultimas[1].resumo, 'Imagem de "Mutirões que Transformam Vidas" alterada: imagem, texto alternativo.');
  });
});

describe("Home: versão para celular (30/10/2026)", () => {
  test("editor e administrador gravam as duas versões, com registro só dos nomes", async () => {
    const antes = (await registros()).length;
    // A gravação começa limpa (os testes acima deixam 8 banners).
    for (const item of (await configuracao()).banners) await excluirBanner(db, item.chave, EDITOR);
    const inicio = (await registros()).length;
    assert.equal(inicio - antes > 0, true);

    assert.deepEqual(await salvarBanner(db, { chave: "banner-cel00001", midiaId: "midiaUm", midiaMobileId: "celularUm", alt: "Com celular", href: "", ativo: true, posicao: 1 }, EDITOR), { ok: true, nome: "Primeiro banner" });
    assert.deepEqual(await salvarBanner(db, { chave: "banner-cel00001", midiaId: "midiaUm", midiaMobileId: "celularDois", alt: "Com celular", href: "", ativo: true, posicao: 1 }, ADMINISTRADOR), { ok: true, nome: "Primeiro banner" });
    assert.deepEqual(await salvarImagemDoEspaco(db, "secao-faca-parte", { midiaId: "midiaDois", midiaMobileId: "celularUm", alt: "Chamada" }, ADMINISTRADOR), { ok: true, nome: "Faça parte dessa rede" });
    assert.deepEqual(await salvarImagemDoEspaco(db, "secao-faca-parte", { midiaId: "midiaDois", midiaMobileId: null, alt: "Chamada" }, EDITOR), { ok: true, nome: "Faça parte dessa rede" });

    const lida = await configuracao();
    assert.equal(lida.banners[0].midiaMobileId, "celularDois");
    assert.deepEqual(lida.imagens["secao-faca-parte"], { midiaId: "midiaDois", midiaMobileId: null, alt: "Chamada" }, "remover a versão celular não deixa a anterior pelo merge");

    const linhas = (await registros()).slice(inicio);
    assert.deepEqual(
      linhas.map((linha) => [linha.usuarioId, linha.campos, linha.resumo]),
      [
        [EDITOR.uid, ["banners"], "Primeiro banner criado."],
        [ADMINISTRADOR.uid, ["banners"], "Primeiro banner alterado: imagem para celular."],
        [ADMINISTRADOR.uid, ["imagens.secao-faca-parte"], 'Imagem de "Faça parte dessa rede" alterada: imagem, imagem para celular, texto alternativo.'],
        [EDITOR.uid, ["imagens.secao-faca-parte"], 'Imagem de "Faça parte dessa rede" alterada: imagem para celular.'],
      ],
    );
    for (const linha of linhas) assert.doesNotMatch(JSON.stringify(linha), /celularUm|celularDois|midiaUm|midiaDois/, "o registro não guarda ids");
  });

  test("versão celular inexistente, na lixeira ou sem variantes: recusa pelo campo, sem gravar", async () => {
    const antes = (await registros()).length;
    const configuracaoAntes = await configuracao();
    for (const midiaMobileId of ["naoExiste", "celularNaLixeira", "celularSemVariantes"]) {
      assert.deepEqual(
        await salvarBanner(db, { chave: "banner-cel00002", midiaId: "midiaUm", midiaMobileId, alt: "x", href: "", ativo: true, posicao: 1 }, EDITOR),
        { ok: false, mensagem: MENSAGEM_IMAGEM_CELULAR_INDISPONIVEL, campo: "midiaMobileId" },
      );
      assert.deepEqual(
        await salvarImagemDoEspaco(db, "secao-mutiroes", { midiaId: "midiaUm", midiaMobileId, alt: "x" }, EDITOR),
        { ok: false, mensagem: MENSAGEM_IMAGEM_CELULAR_INDISPONIVEL, campo: "midiaMobileId" },
      );
    }
    assert.equal((await registros()).length, antes);
    assert.deepEqual(await configuracao(), configuracaoAntes);
  });

  test("banner sem versão celular é gravado sem o campo, como antes", async () => {
    await salvarBanner(db, { chave: "banner-cel00003", midiaId: "midiaDois", midiaMobileId: null, alt: "Sem celular", href: "", ativo: true, posicao: 2 }, EDITOR);
    const bruto = (await db.collection("configuracoes").doc("home").get()).get("banners") as Record<string, unknown>[];
    const semCelular = bruto.find((item) => item.chave === "banner-cel00003");
    assert.ok(semCelular && !("midiaMobileId" in semCelular));
    assert.equal(bruto.find((item) => item.chave === "banner-cel00001")?.midiaMobileId, "celularDois");
  });
});
