// Testes da importação dos posts no emulador do Firestore (npm run
// test:sessao), num projeto só deles (demo-abte-posts). Posts, imagens e
// profissionais fictícios; nada sai da máquina. Nada aqui toca o projeto real.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { gravarPost } from "../../src/lib/gravacao/posts.ts";
import { COLECAO_LOG } from "../../src/lib/log/alteracoes.ts";
import { listarUsos } from "../../src/lib/midia/biblioteca.ts";
import { lerMarkdownRestrito, midiasDoMarkdown } from "../../src/lib/markdownRestrito.ts";
import { validarImagensOrigem, type ImagemDeOrigem } from "../../src/lib/migracao/imagensOrigem.ts";
import { MENSAGEM_SEM_IMAGENS_DOS_POSTS, desfazerPosts, migrarPosts, type PostConvertido } from "../../src/lib/migracao/posts.ts";

const PROJETO = "demo-abte-posts";
const hex = (n: number) => n.toString(16).padStart(32, "0");
const ID = (n: number) => `7dce06_${hex(n)}~mv2.jpg`;
const GIF = `7dce06_${hex(99)}~mv2.gif`;

let app: App;
let db: Firestore;
let imagensDeOrigem: ImagemDeOrigem[];

function post(slug: string, titulo: string, markdown: string, extra: Partial<PostConvertido> = {}): PostConvertido {
  return {
    doMapa: { slug, titulo, publicadoEm: "2024-03-04T05:06:07.000Z", atualizadoEm: null, idiomaEstimado: slug.startsWith("es-") ? "es" : "pt", capa: null },
    markdown,
    descricaoMeta: null,
    fotoDoAutorWix: null,
    capaRemovidaDoCorpo: false,
    paraRevisar: [],
    ...extra,
  };
}

const POSTS: PostConvertido[] = [
  post("pós-fictício-um", "Post Fictício Um", `Primeiro parágrafo **fictício**.\n\n![Imagem](midia:wix:${ID(2)})\n\n![Outra](midia:wix:${ID(3)})\n`, { descricaoMeta: "Descrição fictícia.", fotoDoAutorWix: ID(5), capaRemovidaDoCorpo: true }),
  post("es-post-ficticio", "Post Ficticio", "Texto en español ficticio.\n"),
  post("post-com-gif", "Post com GIF", "Sem imagem no corpo.\n", { paraRevisar: ["título h5 virou ### (conferir o nível)"] }),
];

const migrar = (modo: "simulacao" | "executar", execucao: string, limite: number | null = null, posts = POSTS, banco = db) => migrarPosts({ db: banco, posts, imagensDeOrigem, modo, execucao, limite });

async function contar(colecao: string, banco = db) {
  return (await banco.collection(colecao).count().get()).data().count;
}

async function daExecucao(execucao: string) {
  return (await db.collection("posts").where("origem.execucao", "==", execucao).get()).docs;
}

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: PROJETO }, "testes-migracao-posts");
  db = getFirestore(app);
  const uso = (tipo: string, chave: string, posicao: number) => ({ tipo, chaveDeOrigem: chave, rotulo: chave, posicao });
  const validacao = validarImagensOrigem({
    versao: 1,
    imagens: [
      { midiaIdWix: ID(1), usos: [uso("post", "pós-fictício-um", 1)] },
      { midiaIdWix: ID(2), usos: [uso("postCorpo", "pós-fictício-um", 1)] },
      { midiaIdWix: ID(3), usos: [uso("postCorpo", "pós-fictício-um", 2)] },
      { midiaIdWix: ID(4), usos: [uso("post", "es-post-ficticio", 1)] },
      { midiaIdWix: ID(5), usos: [uso("profissional", "profissional-ficticio", 1)] },
      { midiaIdWix: GIF, usos: [uso("post", "post-com-gif", 1)] },
    ],
  });
  assert.ok(validacao.ok, validacao.ok ? "" : validacao.erros.join(" "));
  imagensDeOrigem = validacao.imagens;
});

after(async () => {
  await deleteApp(app);
});

describe("Migração dos posts (emulador)", () => {
  test("simulação não grava nada e mostra o que faria", async () => {
    const relatorio = await migrar("simulacao", "20261022-000000-0201");
    assert.ok(relatorio.ok);
    assert.equal(await contar("posts"), 0);
    assert.equal(await contar(COLECAO_LOG), 0);
    assert.deepEqual(relatorio.contagens.porIdioma, { es: 1, "pt-BR": 2 });
    assert.deepEqual(relatorio.contagens.porStatus, { rascunho: 3 });
    assert.deepEqual(relatorio.contagens.resumoPorFonte, { meta: 1, primeiroParagrafo: 2 });
    assert.equal(relatorio.contagens.colisoesDeSlug, 0);
    assert.deepEqual(relatorio.posts.map((item) => item.slugNovo), ["pos-ficticio-um", "es-post-ficticio", "post-com-gif"]);
    assert.deepEqual(relatorio.listas.imagemRecusadaPeloTipo, ["post-com-gif (capa)"]);
    assert.deepEqual(relatorio.listas.capaRemovidaDoCorpo, ["pós-fictício-um"]);
    assert.ok(relatorio.redirecionamentos.some((item) => item.de === "/post/p%C3%B3s-fict%C3%ADcio-um" && item.para === "/blog/pos-ficticio-um"));
  });

  test("execução real exige as imagens já importadas", async () => {
    assert.deepEqual(await migrar("executar", "20261022-000000-0202"), { ok: false, mensagem: MENSAGEM_SEM_IMAGENS_DOS_POSTS });
    assert.equal(await contar("posts"), 0);
  });

  test("execução: rascunhos com Markdown, imagens pela biblioteca, pendentes marcadas, sugestão de autor e um registro por post", async () => {
    // Capa e 1ª imagem do corpo do post um importadas; a 2ª, na lixeira; a capa do post em espanhol, ainda não.
    await db.collection("midias").doc("capaUm").set({ tipo: "imagem", origem: { sistema: "wix", midiaId: ID(1), execucao: "x" }, excluidoEm: null });
    await db.collection("midias").doc("corpoUm").set({ tipo: "imagem", origem: { sistema: "wix", midiaId: ID(2), execucao: "x" }, excluidoEm: null });
    await db.collection("midias").doc("naLixeira").set({ tipo: "imagem", origem: { sistema: "wix", midiaId: ID(3), execucao: "x" }, excluidoEm: new Date() });
    await db.collection("profissionais").doc("profFicticio").set({ nome: "TESTE", origem: { sistema: "wix", chave: "profissional-ficticio", execucao: "x" } });

    const execucao = "20261022-000000-0203";
    const relatorio = await migrar("executar", execucao);
    assert.ok(relatorio.ok);
    assert.equal(relatorio.contagens.criados, 3);

    const posts = new Map((await daExecucao(execucao)).map((documento) => [documento.get("origem.chave"), documento.data()]));
    const um = posts.get("pós-fictício-um");
    assert.ok(um);
    assert.deepEqual(
      [um.slug, um.titulo, um.status, um.formatoConteudo, um.idioma, um.capaMidiaId, um.resumo, um.tempoLeitura, um.sugestaoDeAutor, um.revisarMigracao],
      ["pos-ficticio-um", "Post Fictício Um", "rascunho", "markdown", "pt-BR", "capaUm", "Descrição fictícia.", 1, "profFicticio", true],
    );
    assert.equal(um.publicadoEm.toDate().toISOString(), "2024-03-04T05:06:07.000Z");
    assert.equal(um.conteudo, `Primeiro parágrafo **fictício**.\n\n![Imagem](midia:corpoUm)\n\n![Outra](midia:wix:${ID(3)})\n`);
    assert.deepEqual(midiasDoMarkdown(lerMarkdownRestrito(um.conteudo)), ["corpoUm", `wix:${ID(3)}`], "a pendente não é um id de documento: não aparece no site");
    // A imagem do texto conta como em uso (o desfazer das imagens e o "Excluir" do painel veem).
    const usos = await listarUsos(db, "corpoUm");
    assert.deepEqual(usos.find((uso) => uso.rotulo === "Posts do blog (imagem no texto)")?.registros, ["Post Fictício Um"]);
    assert.ok((await listarUsos(db, "capaUm")).every((uso) => uso.rotulo !== "Posts do blog (imagem no texto)" || uso.registros.length === 0));

    const es = posts.get("es-post-ficticio");
    assert.deepEqual([es?.idioma, es?.capaMidiaId, es?.resumo, es?.sugestaoDeAutor], ["es", null, "Texto en español ficticio.", null]);
    assert.equal(posts.get("post-com-gif")?.capaMidiaId, null);
    assert.ok(relatorio.listas.capaPendente.includes("es-post-ficticio"));
    assert.ok(relatorio.listas.imagemDoCorpoPendente.includes("pós-fictício-um"));
    assert.deepEqual(relatorio.contagens.sugestaoDeAutor, { "profissional ligado": 1, "sem foto do autor": 2 });

    const registros = (await db.collection(COLECAO_LOG).where("execucao", "==", execucao).get()).docs.map((documento) => documento.data());
    assert.equal(registros.length, 3);
    for (const registro of registros) assert.deepEqual([registro.usuarioId, registro.papel, registro.origem, registro.acao, registro.colecao], ["migracao", "sistema", "migracao", "criar", "posts"]);
  });

  test("idempotente: a segunda execução não cria nada; --limite vale só para os novos", async () => {
    const relatorio = await migrar("executar", "20261022-000000-0204", 1);
    assert.ok(relatorio.ok);
    assert.deepEqual([relatorio.contagens.jaExistentes, relatorio.contagens.nestaExecucao, relatorio.contagens.criados], [3, 0, 0]);
    assert.equal(await contar("posts"), 3);

    const novo = post("post-novo-ficticio", "Novo", "Texto.\n");
    const comLimite = await migrar("executar", "20261022-000000-0205", 1, [...POSTS, novo, post("outro-novo-ficticio", "Outro", "Texto.\n")]);
    assert.ok(comLimite.ok);
    assert.deepEqual([comLimite.contagens.candidatos, comLimite.contagens.criados], [2, 1]);
    assert.equal(await contar("posts"), 4);
  });

  test("colisão de slug com post do painel ou entre posts do mapa: recusa gravar", async () => {
    const appDaColisao = initializeApp({ projectId: "demo-abte-posts-colisao" }, "testes-posts-colisao");
    const outroProjeto = getFirestore(appDaColisao);
    await outroProjeto.collection("midias").doc("m1").set({ origem: { sistema: "wix", midiaId: ID(1), execucao: "x" }, excluidoEm: null });
    await outroProjeto.collection("posts").doc("manual").set({ titulo: "Manual", slug: "pos-ficticio-um", status: "publicado" });
    const comPainel = await migrar("executar", "20261022-000000-0206", null, POSTS, outroProjeto);
    assert.equal(comPainel.ok, false);
    assert.match(comPainel.ok ? "" : comPainel.mensagem, /Colisão de slug: pos-ficticio-um \(já usado pelo post manual \(criado no painel\)\)/);

    const simulacao = await migrar("simulacao", "20261022-000000-0207", null, [post("ação-fictícia", "A", "x\n"), post("acao-ficticia", "B", "y\n")], outroProjeto);
    assert.ok(simulacao.ok);
    assert.equal(simulacao.contagens.colisoesDeSlug, 1);
    assert.equal(await contar("posts", outroProjeto), 1, "nada gravado");
    await deleteApp(appDaColisao);
  });

  test("desfazer: pula o post editado no painel (sem registro de alterações); editados só com a confirmação certa", async () => {
    const execucao = "20261022-000000-0203";
    const um = (await daExecucao(execucao)).find((documento) => documento.get("origem.chave") === "pós-fictício-um");
    assert.ok(um);
    // Edição pelo painel: mesma função das ações de servidor; o slug não muda.
    const editado = await gravarPost(db, um.id, { titulo: "Título revisado", conteudo: um.get("conteudo"), status: "rascunho", capaMidiaId: "capaUm" });
    assert.ok(editado.ok);
    assert.equal(editado.slug, "pos-ficticio-um");
    assert.equal((await um.ref.get()).get("formatoConteudo"), "markdown", "a edição não muda o formato");

    const simulado = await desfazerPosts({ db, execucaoAlvo: execucao, execucao: "20261022-000000-0208", modo: "simulacao", incluirEditados: false });
    assert.deepEqual(simulado.contagens, { encontrados: 3, desfeitos: 2, pulados: 1, editadosPorPessoaQueSairiam: 0 });

    const feito = await desfazerPosts({ db, execucaoAlvo: execucao, execucao: "20261022-000000-0209", modo: "executar", incluirEditados: false });
    assert.equal(feito.contagens.desfeitos, 2);
    assert.equal(await contar("posts"), 2, "o editado e o da execução com --limite");

    const recusado = await desfazerPosts({ db, execucaoAlvo: execucao, execucao: "20261022-000000-0210", modo: "executar", incluirEditados: true, confirmacaoDeEditados: 0 });
    assert.match(recusado.bloqueado ?? "", /Nada foi apagado: 1 post/);
    const confirmado = await desfazerPosts({ db, execucaoAlvo: execucao, execucao: "20261022-000000-0211", modo: "executar", incluirEditados: true, confirmacaoDeEditados: 1 });
    assert.equal(confirmado.contagens.desfeitos, 1);
    assert.equal(await contar("posts"), 1);
    const apagados = (await db.collection(COLECAO_LOG).where("acao", "==", "excluir_definitivo").get()).size;
    assert.equal(apagados, 3);
  });

  test("sugestão pela assinatura: grava só em sugestaoDeAutor, com o motivo de revisão, e o relatório não leva o nome", async () => {
    await db.collection("profissionais").doc("profAssinatura").set({ nome: "TESTE Nome Assinatura", origem: { sistema: "wix", chave: "prof-assinatura", execucao: "x" } });
    const assinado = post("post-assinado-ficticio", "Assinado", "Texto fictício.\n\nPor TESTE Nome Assinatura.\n\n## Referências\n\n- Outro Autor Fictício.\n");
    const execucao = "20261023-000000-0212";
    const relatorio = await migrarPosts({ db, posts: [assinado], imagensDeOrigem, profissionaisDoArquivo: [{ chave: "prof-assinatura", nome: "TESTE Nome Assinatura" }], modo: "executar", execucao, limite: null });
    assert.ok(relatorio.ok);
    const [documento] = await daExecucao(execucao);
    assert.deepEqual([documento.get("sugestaoDeAutor"), documento.get("autorProfissionalId"), documento.get("revisarMigracao")], ["profAssinatura", undefined, true]);
    // No relatório, só a contagem: a linha do post não diz que ganhou a sugestão.
    assert.equal(relatorio.contagens.porMotivo.sugestaoPelaAssinatura, 1);
    assert.ok(!("autor" in relatorio.posts[0]), "nenhuma marcação de sugestão de autor ao lado do slug");
    assert.deepEqual(relatorio.contagens.sugestaoDeAutor, { "pela assinatura, profissional ligado": 1 });
    assert.doesNotMatch(JSON.stringify(relatorio), /TESTE Nome Assinatura/);
  });
});

describe("Script migrar-posts (emulador, só recusas)", () => {
  function rodar(args: string[], projeto = PROJETO): Promise<{ codigo: number; saida: string }> {
    return new Promise((resolver) => {
      execFile(process.execPath, ["scripts/migrar-posts.mts", ...args], { encoding: "utf8", env: { ...process.env, FIREBASE_ADMIN_PROJECT_ID: projeto } }, (erro, stdout, stderr) =>
        resolver({ codigo: erro ? Number(erro.code ?? 1) : 0, saida: `${stdout}${stderr}` }),
      );
    });
  }

  test("--executar sem a confirmação certa não grava; projeto fora de demo- no emulador é recusado", async () => {
    const antes = await contar("posts");
    for (const args of [["--executar"], ["--executar", "--confirmo-projeto=abte-dev"]]) {
      const { codigo, saida } = await rodar(args);
      assert.equal(codigo, 1, saida);
      assert.match(saida, /Nada foi gravado/);
    }
    assert.equal((await rodar([], "abte-dev")).codigo, 1);
    assert.equal(await contar("posts"), antes);
  });
});
