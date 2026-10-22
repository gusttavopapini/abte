// Testes da migração das imagens do site antigo nos emuladores de Firestore e
// Storage (npm run test:sessao). Rodam num projeto e num bucket só deles
// (demo-abte-migracao), para não mexer na contagem de midias dos outros
// testes. Nenhum pedido sai da máquina: o Wix é substituído por uma função
// que devolve imagens geradas aqui (sem pessoas), e o script de verdade só
// roda em simulação. Nada aqui toca o projeto real.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { COLECAO_LOG, type AutorDaAlteracao } from "../../src/lib/log/alteracoes.ts";
import { COLECAO_MIDIAS, editarAlt, enviarImagem, moverParaLixeiraOuRestaurar, type ServicosDeMidia } from "../../src/lib/midia/biblioteca.ts";
import { desfazerExecucao, migrarImagens, relatorioEmMarkdown, relatorioSemEnderecoDoWix, type Baixar } from "../../src/lib/migracao/imagens.ts";
import { lerMapaParaAlt, validarImagensOrigem, type ImagemDeOrigem, type MapaParaAlt } from "../../src/lib/migracao/imagensOrigem.ts";
import { ErroDeRede } from "../../src/lib/migracao/rede.ts";

const PROJETO = "demo-abte-migracao";
const BUCKET = "demo-abte-migracao.appspot.com";
const PESSOA: AutorDaAlteracao = { uid: "teste-migracao-editor", nome: "TESTE Editor", papel: "editor" };

let app: App;
let db: Firestore;
let servicos: ServicosDeMidia;

const hex = (n: number) => n.toString(16).padStart(32, "0");
const IDS = {
  jpegGrande: `7dce06_${hex(1)}~mv2.jpg`,
  png: `7dce06_${hex(2)}~mv2.png`,
  webp: `3b1f25_${hex(3)}.jpg`,
  gif: `7dce06_${hex(4)}~mv2.gif`,
  avif: `7dce06_${hex(5)}~mv2.avif`,
  sumiu: `7dce06_${hex(6)}~mv2.jpg`,
  produtoA: `7dce06_${hex(7)}~mv2.jpg`,
  produtoB: `7dce06_${hex(8)}~mv2.jpg`,
};

const MAPA_TEXTO = [
  JSON.stringify({ tipo: "post", slug: "post-de-teste", titulo: "Post de Teste" }),
  JSON.stringify({ tipo: "produto", slug: "produto-de-teste", nome: "Produto de Teste" }),
].join("\n");

function entrada(): unknown {
  const uso = (tipo: string, chaveDeOrigem: string, posicao = 1, rotulo = chaveDeOrigem) => ({ tipo, chaveDeOrigem, rotulo, posicao });
  return {
    versao: 1,
    imagens: [
      { midiaIdWix: IDS.jpegGrande, usos: [uso("post", "post-de-teste")], prioridade: "alta" },
      { midiaIdWix: IDS.png, usos: [uso("profissional", "pessoa-ficticia", 1, "Pessoa Fictícia")], prioridade: "alta" },
      { midiaIdWix: IDS.webp, usos: [uso("pagina", "triagem")], prioridade: "baixa" },
      { midiaIdWix: IDS.gif, usos: [uso("post", "post-com-gif")] },
      { midiaIdWix: IDS.avif, usos: [uso("pagina", "home")] },
      { midiaIdWix: IDS.sumiu, usos: [uso("postCorpo", "post-de-teste", 2)] },
      { midiaIdWix: IDS.produtoA, usos: [{ ...uso("produto", "produto-de-teste", 1), papel: "galeria" }] },
      { midiaIdWix: IDS.produtoB, usos: [{ ...uso("produto", "produto-de-teste", 2), papel: "galeria" }] },
    ],
  };
}

let imagens: ImagemDeOrigem[];
let mapa: MapaParaAlt;
const arquivos = new Map<string, Uint8Array>();
let pedidos: string[] = [];
// Imagens do teste de --tipo e --limite (a primeira é importada na execução 0005).
let imagensDaExecucaoComLimite: ImagemDeOrigem[] = [];

const baixarFalso: Baixar = async (caminho) => {
  pedidos.push(caminho);
  const bytes = arquivos.get(caminho.replace("/media/", ""));
  if (!bytes) throw new ErroDeRede("naoEncontrado", "Não encontrado (404).", 404);
  return { bytes };
};

async function contar(colecao: string) {
  return (await db.collection(colecao).count().get()).data().count;
}

async function migrar(opcoes: { modo: "simulacao" | "executar"; execucao: string; limite?: number | null; tipo?: string | null; baixar?: Baixar; lista?: ImagemDeOrigem[] }) {
  pedidos = [];
  return migrarImagens({
    servicos,
    imagens: opcoes.lista ?? imagens,
    mapa,
    modo: opcoes.modo,
    execucao: opcoes.execucao,
    limite: opcoes.limite ?? null,
    tipo: opcoes.tipo ?? null,
    baixar: opcoes.baixar ?? baixarFalso,
  });
}

async function documentosDa(execucao: string) {
  return (await db.collection(COLECAO_MIDIAS).where("origem.execucao", "==", execucao).get()).docs;
}

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: PROJETO }, "testes-migracao");
  db = getFirestore(app);
  servicos = { db, bucket: getStorage(app).bucket(BUCKET) };

  const cor = (largura: number, altura: number) => sharp({ create: { width: largura, height: altura, channels: 3, background: { r: 40, g: 140, b: 90 } } });
  arquivos.set(IDS.jpegGrande, await cor(3000, 2000).jpeg().withExif({ IFD0: { Make: "Camera de teste" }, IFD3: { GPSLatitudeRef: "S", GPSLatitude: "23/1 33/1 0/1" } }).toBuffer());
  arquivos.set(IDS.png, await cor(800, 600).png().toBuffer());
  // Extensão .jpg, conteúdo WebP: vale a assinatura.
  arquivos.set(IDS.webp, await cor(600, 400).webp().toBuffer());
  arquivos.set(IDS.gif, await cor(20, 20).gif().toBuffer());
  arquivos.set(IDS.avif, new Uint8Array([0, 0, 0, 0x1c, ...Buffer.from("ftypavif"), 0, 0, 0, 0]));
  arquivos.set(IDS.produtoA, await cor(700, 700).jpeg().toBuffer());
  arquivos.set(IDS.produtoB, await cor(700, 700).jpeg().toBuffer());

  const validacao = validarImagensOrigem(entrada());
  assert.ok(validacao.ok);
  imagens = validacao.imagens;
  const lido = lerMapaParaAlt(MAPA_TEXTO);
  assert.ok(lido.ok);
  mapa = lido.mapa;
});

after(async () => {
  await deleteApp(app);
});

describe("Migração das imagens (emulador)", () => {
  test("simulação não baixa nem grava nada e prevê as recusas pela extensão", async () => {
    const relatorio = await migrar({ modo: "simulacao", execucao: "20261021-000000-0001" });
    assert.equal(pedidos.length, 0);
    assert.equal(await contar(COLECAO_MIDIAS), 0);
    assert.equal(await contar(COLECAO_LOG), 0);
    assert.equal((await servicos.bucket.getFiles())[0].length, 0);
    assert.equal(relatorio.contagens.encontradas, 8);
    assert.equal(relatorio.contagens.previstasAceitas, 6);
    assert.equal(relatorio.contagens.previstasRecusadas, 2);
    assert.deepEqual(relatorio.recusadas.map((item) => [item.formato, item.previsto]), [["gif", true], ["avif", true]]);
    assert.equal(relatorio.previstas.length, 8);
    assert.equal(relatorio.verificacao, null);
    assert.ok(relatorioSemEnderecoDoWix(relatorio));
  });

  test("o relatório não leva nome de profissional", async () => {
    const relatorio = await migrar({ modo: "simulacao", execucao: "20261021-000000-0002" });
    assert.doesNotMatch(JSON.stringify(relatorio), /Pessoa Fictícia|pessoa-ficticia/);
  });

  test("execução: importa pelo processamento do painel, recusa GIF e AVIF pela assinatura e segue depois de uma falha", async () => {
    const execucao = "20261021-000000-0003";
    const relatorio = await migrar({ modo: "executar", execucao, tipo: null });
    const c = relatorio.contagens;
    assert.equal(c.baixadas, 7);
    assert.equal(c.migradas, 5);
    assert.equal(c.reduzidas, 1);
    assert.deepEqual(relatorio.recusadas.map((item) => [item.midiaIdWix, item.formato, item.previsto]), [[IDS.gif, "gif", false], [IDS.avif, "avif", false]]);
    assert.deepEqual(relatorio.recusadas[0].usos, [{ tipo: "post", papel: null, chave: "post-com-gif", posicao: 1 }]);
    assert.deepEqual(relatorio.falhas, [{ midiaIdWix: IDS.sumiu, motivo: "Não encontrado (404)." }]);
    assert.deepEqual(relatorio.verificacao?.problemas, []);
    assert.equal(relatorio.verificacao?.documentos, 5);
    assert.equal(relatorio.verificacao?.registros, 5);
    assert.ok((relatorio.verificacao?.variantes ?? 0) >= 5);
    assert.ok(relatorioSemEnderecoDoWix(relatorio));

    const porOrigem = new Map((await documentosDa(execucao)).map((documento) => [documento.get("origem.midiaId"), documento]));
    const grande = porOrigem.get(IDS.jpegGrande);
    assert.ok(grande);
    assert.equal(grande.get("largura"), 2560);
    assert.equal(grande.get("alt"), "Capa do post: Post de Teste");
    assert.equal(grande.get("altProvisorio"), true);
    assert.equal(grande.get("conferenciaDeMenor"), "pendente");
    assert.equal(grande.get("enviadoPor"), "migracao");
    assert.deepEqual(grande.get("origem"), { sistema: "wix", midiaId: IDS.jpegGrande, execucao });
    for (const campo of ["indicaMenor", "autorizacaoConfirmadaPor", "autorizacaoConfirmadaEm"]) assert.equal(grande.get(campo), undefined, campo);
    // Dentro dos limites, foi como veio: o tamanho é o do arquivo baixado.
    assert.equal(porOrigem.get(IDS.png)?.get("tamanho"), arquivos.get(IDS.png)?.length);
    assert.equal(porOrigem.get(IDS.png)?.get("alt"), "Foto de Pessoa Fictícia");
    assert.equal(porOrigem.get(IDS.produtoB)?.get("alt"), "Produto de Teste, imagem 2 de 2");
    for (const variante of grande.get("variantes")) assert.equal((await servicos.bucket.file(variante.caminho).exists())[0], true);

    const registros = (await db.collection(COLECAO_LOG).where("execucao", "==", execucao).get()).docs.map((documento) => documento.data());
    assert.equal(registros.length, 5);
    for (const registro of registros) {
      assert.equal(registro.usuarioId, "migracao");
      assert.equal(registro.papel, "sistema");
      assert.equal(registro.origem, "migracao");
      assert.equal(registro.acao, "criar");
      assert.doesNotMatch(String(registro.usuarioNome), /@/);
    }
  });

  test("idempotente: a segunda execução não baixa de novo o que já existe", async () => {
    const relatorio = await migrar({ modo: "executar", execucao: "20261021-000000-0004" });
    assert.equal(relatorio.contagens.jaExistentes, 5);
    assert.equal(relatorio.contagens.migradas, 0);
    assert.deepEqual(pedidos.sort(), [IDS.gif, IDS.avif, IDS.sumiu].map((id) => `/media/${id}`).sort());
    assert.equal(await contar(COLECAO_MIDIAS), 5);
  });

  test("--tipo e --limite escolhem só parte das candidatas", async () => {
    const lista: ImagemDeOrigem[] = [
      { midiaIdWix: `7dce06_${hex(20)}~mv2.jpg`, usos: [{ tipo: "produto", chaveDeOrigem: "outro-produto", rotulo: "outro-produto", posicao: 1, papel: null }], altNoSiteAntigo: null, observacao: null, prioridade: null },
      { midiaIdWix: `7dce06_${hex(21)}~mv2.jpg`, usos: [{ tipo: "produto", chaveDeOrigem: "outro-produto", rotulo: "outro-produto", posicao: 2, papel: null }], altNoSiteAntigo: null, observacao: null, prioridade: null },
      { midiaIdWix: `7dce06_${hex(22)}~mv2.jpg`, usos: [{ tipo: "pagina", chaveDeOrigem: "home", rotulo: "home", posicao: 1, papel: null }], altNoSiteAntigo: null, observacao: null, prioridade: null },
    ];
    for (const item of lista) arquivos.set(item.midiaIdWix, await sharp({ create: { width: 500, height: 500, channels: 3, background: { r: 1, g: 2, b: 3 } } }).jpeg().toBuffer());
    imagensDaExecucaoComLimite = lista;
    const relatorio = await migrar({ modo: "executar", execucao: "20261021-000000-0005", tipo: "produto", limite: 1, lista });
    assert.equal(relatorio.contagens.filtradasPeloTipo, 2);
    assert.equal(relatorio.contagens.nestaExecucao, 1);
    assert.equal(relatorio.contagens.migradas, 1);
    assert.deepEqual(pedidos, [`/media/${lista[0].midiaIdWix}`]);
  });

  test("imagem já importada que está na lixeira conta como existente, com aviso no relatório", async () => {
    const [documento] = await documentosDa("20261021-000000-0005");
    const lista = imagensDaExecucaoComLimite;
    assert.deepEqual(await moverParaLixeiraOuRestaurar(servicos, documento.id, true, PESSOA), { ok: true });
    const relatorio = await migrar({ modo: "simulacao", execucao: "20261021-000000-0011", lista });
    assert.equal(relatorio.contagens.jaExistentes, 1);
    assert.equal(relatorio.contagens.jaExistentesNaLixeira, 1);
    assert.deepEqual(relatorio.existentesNaLixeira, [{ midiaIdWix: lista[0].midiaIdWix, midiaId: documento.id }]);
    assert.match(relatorioEmMarkdown(relatorio, PROJETO), /\*\*Aviso:\*\* estas imagens já foram importadas/);
    assert.deepEqual(await moverParaLixeiraOuRestaurar(servicos, documento.id, false, PESSOA), { ok: true });
  });

  test("bloqueio (403 ou 429) interrompe a execução inteira", async () => {
    const lista: ImagemDeOrigem[] = [30, 31].map((n) => ({
      midiaIdWix: `7dce06_${hex(n)}~mv2.jpg`,
      usos: [{ tipo: "pagina" as const, chaveDeOrigem: "home", rotulo: "home", posicao: n, papel: null }],
      altNoSiteAntigo: null,
      observacao: null,
      prioridade: null,
    }));
    const bloqueado: Baixar = async (caminho) => {
      pedidos.push(caminho);
      throw new ErroDeRede("bloqueio", "O site respondeu 429 (bloqueio).", 429);
    };
    const relatorio = await migrar({ modo: "executar", execucao: "20261021-000000-0006", lista, baixar: bloqueado });
    assert.match(relatorio.interrompido ?? "", /429/);
    assert.equal(pedidos.length, 1);
    assert.equal(relatorio.contagens.migradas, 0);
  });

  test("a verificação acusa endereço do Wix gravado num documento", async () => {
    const id = `7dce06_${hex(40)}~mv2.jpg`;
    arquivos.set(id, await sharp({ create: { width: 300, height: 300, channels: 3, background: { r: 9, g: 9, b: 9 } } }).jpeg().toBuffer());
    const lista: ImagemDeOrigem[] = [
      { midiaIdWix: id, usos: [{ tipo: "profissional", chaveDeOrigem: "x", rotulo: "static.wixstatic.com", posicao: 1, papel: null }], altNoSiteAntigo: null, observacao: null, prioridade: null },
    ];
    const relatorio = await migrar({ modo: "executar", execucao: "20261021-000000-0007", lista });
    assert.equal(relatorio.verificacao?.problemas.length, 1);
    assert.match(relatorio.verificacao?.problemas[0] ?? "", /^midias\/.+contém endereço do Wix/);
  });

  test("editar o alt no painel limpa a marca de provisório", async () => {
    const [documento] = await documentosDa("20261021-000000-0005");
    assert.equal(documento.get("altProvisorio"), true);
    assert.deepEqual(await editarAlt(servicos, documento.id, "Produto na mesa, visto de cima", PESSOA), { ok: true });
    assert.equal((await documento.ref.get()).get("altProvisorio"), false);
    const [registro] = (await db.collection(COLECAO_LOG).where("documentoId", "==", documento.id).where("acao", "==", "editar").get()).docs;
    assert.deepEqual(registro.get("campos"), ["alt", "altProvisorio"]);
    assert.equal(registro.get("origem"), undefined);
  });

  test("desfazer: simula primeiro, depois apaga só a execução indicada e pula o que está em uso ou foi editado", async () => {
    const execucao = "20261021-000000-0003";
    const documentos = await documentosDa(execucao);
    const emUso = documentos.find((documento) => documento.get("origem.midiaId") === IDS.produtoA);
    const editada = documentos.find((documento) => documento.get("origem.midiaId") === IDS.png);
    assert.ok(emUso && editada);
    await db.collection("produtos").doc("produto-teste-migracao").set({ nome: "Produto de Teste", imagens: [{ midiaId: emUso.id, ordem: 0 }] });
    await editarAlt(servicos, editada.id, "Foto revisada por uma pessoa", PESSOA);
    const manual = await enviarImagem(servicos, { bytes: arquivos.get(IDS.produtoB) as Uint8Array, alt: "Envio manual", indicaMenor: false, autorizacaoConfirmada: false }, PESSOA);
    assert.ok(manual.ok);
    const outraExecucao = (await documentosDa("20261021-000000-0005")).length;

    const simulado = await desfazerExecucao({ servicos, execucaoAlvo: execucao, execucao: "20261021-000000-0008", modo: "simulacao", incluirEditadas: false });
    assert.equal(simulado.contagens.encontradas, 5);
    assert.equal(simulado.contagens.desfeitas, 3);
    assert.equal(simulado.contagens.puladas, 2);
    assert.equal((await documentosDa(execucao)).length, 5);

    const caminhos = documentos.filter((documento) => documento.id !== emUso.id && documento.id !== editada.id).flatMap((documento) => documento.get("variantes").map((variante: { caminho: string }) => variante.caminho));
    const feito = await desfazerExecucao({ servicos, execucaoAlvo: execucao, execucao: "20261021-000000-0009", modo: "executar", incluirEditadas: false });
    assert.equal(feito.contagens.desfeitas, 3);
    assert.deepEqual(feito.puladas.map((item) => item.motivo).sort(), ["alterada por uma pessoa depois da importação", "em uso (1 registro(s))"]);
    assert.doesNotMatch(JSON.stringify(feito), /Produto de Teste/);
    assert.deepEqual((await documentosDa(execucao)).map((documento) => documento.id).sort(), [emUso.id, editada.id].sort());
    for (const caminho of caminhos) assert.equal((await servicos.bucket.file(caminho).exists())[0], false, caminho);
    assert.equal((await documentosDa("20261021-000000-0005")).length, outraExecucao);
    assert.equal((await db.collection(COLECAO_MIDIAS).doc(manual.id).get()).exists, true);

    const reversoes = await db.collection(COLECAO_LOG).where("execucao", "==", "20261021-000000-0009").get();
    assert.equal(reversoes.size, 3);
    for (const registro of reversoes.docs) {
      assert.equal(registro.get("acao"), "excluir_definitivo");
      assert.equal(registro.get("papel"), "sistema");
    }

    // Com as editadas: a simulação mostra quantas sairiam; sem a segunda confirmação certa, nada sai.
    const simuladoComEditadas = await desfazerExecucao({ servicos, execucaoAlvo: execucao, execucao: "20261021-000000-0012", modo: "simulacao", incluirEditadas: true });
    assert.equal(simuladoComEditadas.contagens.editadasPorPessoaQueSairiam, 1);
    for (const confirmacao of [null, 0, 2]) {
      const recusado = await desfazerExecucao({ servicos, execucaoAlvo: execucao, execucao: "20261021-000000-0013", modo: "executar", incluirEditadas: true, confirmacaoDeEditadas: confirmacao });
      assert.match(recusado.bloqueado ?? "", /Nada foi apagado: 1 imagem/);
      assert.equal(recusado.contagens.desfeitas, 0);
      assert.equal((await documentosDa(execucao)).length, 2);
    }
    const comEditadas = await desfazerExecucao({ servicos, execucaoAlvo: execucao, execucao: "20261021-000000-0010", modo: "executar", incluirEditadas: true, confirmacaoDeEditadas: 1 });
    assert.equal(comEditadas.bloqueado, null);
    assert.equal(comEditadas.contagens.desfeitas, 1);
    assert.deepEqual((await documentosDa(execucao)).map((documento) => documento.id), [emUso.id]);
  });
});

describe("Script migrar-imagens (emulador, só simulação e recusas)", () => {
  let pasta: string;
  const criados: string[] = [];

  before(() => {
    pasta = mkdtempSync(join(tmpdir(), "abte-migracao-"));
    writeFileSync(join(pasta, "imagens.json"), JSON.stringify(entrada()));
    writeFileSync(join(pasta, "mapa.jsonl"), MAPA_TEXTO);
  });

  after(() => {
    rmSync(pasta, { recursive: true, force: true });
    for (const arquivo of criados) rmSync(arquivo, { force: true });
  });

  function rodar(args: string[], projeto = PROJETO): Promise<{ codigo: number; saida: string }> {
    return new Promise((resolver) => {
      execFile(
        process.execPath,
        ["scripts/migrar-imagens.mts", ...args],
        { encoding: "utf8", env: { ...process.env, FIREBASE_ADMIN_PROJECT_ID: projeto, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: BUCKET } },
        (erro, stdout, stderr) => {
          const saida = `${stdout}${stderr}`;
          for (const [, caminho] of saida.matchAll(/Relatório: (\S+)\.md/g)) criados.push(`${caminho}.md`, `${caminho}.json`);
          resolver({ codigo: erro ? Number(erro.code ?? 1) : 0, saida });
        },
      );
    });
  }

  test("simulação: mostra projeto, modo e contagens, sem gravar", async () => {
    const antes = await contar(COLECAO_MIDIAS);
    const { codigo, saida } = await rodar([`--entrada=${join(pasta, "imagens.json")}`, `--mapa=${join(pasta, "mapa.jsonl")}`]);
    assert.equal(codigo, 0, saida);
    assert.match(saida, /Projeto: demo-abte-migracao \(emuladores\)/);
    assert.match(saida, /Modo: simulação/);
    assert.match(saida, /Imagens no arquivo: 8/);
    assert.match(saida, /Previstas aceitas: 6; previstas recusadas: 2/);
    assert.doesNotMatch(saida, /Pessoa Fictícia/);
    assert.equal(await contar(COLECAO_MIDIAS), antes);
  });

  test("--executar sem a confirmação certa não grava; projeto fora de demo- nos emuladores é recusado", async () => {
    const antes = await contar(COLECAO_MIDIAS);
    for (const args of [["--executar"], ["--executar", "--confirmo-projeto=abte-dev"]]) {
      const { codigo, saida } = await rodar([...args, `--entrada=${join(pasta, "imagens.json")}`, `--mapa=${join(pasta, "mapa.jsonl")}`]);
      assert.equal(codigo, 1, saida);
      assert.match(saida, /Nada foi gravado/);
    }
    const { codigo, saida } = await rodar([], "abte-dev");
    assert.equal(codigo, 1);
    assert.match(saida, /só projetos "demo-/);
    assert.equal(await contar(COLECAO_MIDIAS), antes);
  });

  test("entrada inválida é recusada sem gravar", async () => {
    writeFileSync(join(pasta, "ruim.json"), JSON.stringify({ versao: 1, imagens: [{ midiaIdWix: "b3206b_" + hex(1) + "~mv2.png", usos: [{ tipo: "pagina", chaveDeOrigem: "home", rotulo: "home", posicao: 1 }] }] }));
    const { codigo, saida } = await rodar([`--entrada=${join(pasta, "ruim.json")}`, `--mapa=${join(pasta, "mapa.jsonl")}`]);
    assert.equal(codigo, 1);
    assert.match(saida, /Entrada recusada/);
    assert.match(saida, /layout/);
  });
});
