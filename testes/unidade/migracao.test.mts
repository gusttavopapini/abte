// Testes das regras puras da migração do site antigo (npm run test:unidade):
// argumentos, projeto permitido, id da execução, validação do
// imagens-origem.json, leitura do mapa, alt provisório e o ajuste das imagens
// baixadas (o mesmo teto do navegador) e a lista da conferência de menores.
// Os dados aqui são fictícios.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import sharp from "sharp";
import { ajustarComoNoNavegador } from "../../src/lib/midia/biblioteca.ts";
import { LADO_MAXIMO_NO_NAVEGADOR } from "../../src/lib/midia/regras.ts";
import { validarListaDeConferencia } from "../../src/lib/migracao/conferenciaDeMenor.ts";
import { PROJETOS_PERMITIDOS, conferirProjeto, ehIdDeExecucao, lerArgumentos, novoIdDeExecucao } from "../../src/lib/migracao/execucao.ts";
import { formatoPelaAssinatura, relatorioSemEnderecoDoWix } from "../../src/lib/migracao/imagens.ts";
import {
  LIMITE_DO_ALT_PROVISORIO,
  contarImagensPorProduto,
  ehIdDeMidiaWix,
  formatoPrevisto,
  lerMapaParaAlt,
  montarAltProvisorio,
  previstoComoRecusado,
  validarImagensOrigem,
  type ImagemDeOrigem,
} from "../../src/lib/migracao/imagensOrigem.ts";

const HEX = "0123456789abcdef0123456789abcdef";
const ID = `7dce06_${HEX}~mv2.jpg`;

function imagem(id: string, usos: Record<string, unknown>[], extra: Record<string, unknown> = {}) {
  return { midiaIdWix: id, usos, altNoSiteAntigo: null, observacao: null, ...extra };
}
const uso = (tipo: string, chave: string, posicao = 1, extra: Record<string, unknown> = {}) => ({ tipo, chaveDeOrigem: chave, rotulo: chave, posicao, ...extra });

describe("Argumentos e projeto", () => {
  test("sem --executar é sempre simulação", () => {
    const lidos = lerArgumentos([]);
    assert.ok(lidos.ok);
    assert.equal(lidos.argumentos.modo, "simulacao");
    assert.equal(lidos.argumentos.desfazer, false);
  });

  test("lê --executar, --confirmo-projeto, --limite e --tipo", () => {
    const lidos = lerArgumentos(["--executar", "--confirmo-projeto=abte-dev", "--limite=5", "--tipo=produto"]);
    assert.ok(lidos.ok);
    assert.deepEqual(
      { modo: lidos.argumentos.modo, projeto: lidos.argumentos.confirmoProjeto, limite: lidos.argumentos.limite, tipo: lidos.argumentos.tipo },
      { modo: "executar", projeto: "abte-dev", limite: 5, tipo: "produto" },
    );
  });

  test("recusa argumento desconhecido, repetido, limite inválido e desfazer sem execução", () => {
    for (const argv of [["--apagar"], ["--limite=2", "--limite=3"], ["--limite=0"], ["--limite=x"], ["--desfazer"], ["--desfazer", "--execucao=abc"], ["--execucao=20261021-223015-a1b2"], ["--desfazer", "--execucao=20261021-223015-a1b2", "--limite=1"]]) {
      assert.equal(lerArgumentos(argv).ok, false, argv.join(" "));
    }
    assert.ok(lerArgumentos(["--desfazer", "--execucao=20261021-223015-a1b2"]).ok);
  });

  test("id da execução: data e hora UTC e sufixo de 4 letras", () => {
    const id = novoIdDeExecucao(new Date(Date.UTC(2026, 9, 21, 22, 30, 15)), () => 0.5);
    assert.equal(id, "20261021-223015-8000");
    assert.ok(ehIdDeExecucao(id));
    assert.equal(ehIdDeExecucao("20261021-223015"), false);
  });

  test("lista de projetos permitidos tem só o abte-dev por enquanto", () => {
    assert.deepEqual([...PROJETOS_PERMITIDOS], ["abte-dev"]);
  });

  test("projeto fora da lista é recusado, inclusive em simulação", () => {
    assert.equal(conferirProjeto({ projectId: "outro", emulador: false, modo: "simulacao", confirmoProjeto: null }).ok, false);
    assert.equal(conferirProjeto({ projectId: undefined, emulador: false, modo: "simulacao", confirmoProjeto: null }).ok, false);
    assert.ok(conferirProjeto({ projectId: "abte-dev", emulador: false, modo: "simulacao", confirmoProjeto: null }).ok);
  });

  test("gravar exige --confirmo-projeto igual ao projeto", () => {
    assert.equal(conferirProjeto({ projectId: "abte-dev", emulador: false, modo: "executar", confirmoProjeto: null }).ok, false);
    assert.equal(conferirProjeto({ projectId: "abte-dev", emulador: false, modo: "executar", confirmoProjeto: "abte-prod" }).ok, false);
    assert.ok(conferirProjeto({ projectId: "abte-dev", emulador: false, modo: "executar", confirmoProjeto: "abte-dev" }).ok);
  });

  test("outro projeto entra pela lista, sem mudar o script", () => {
    const permitidos = ["abte-dev", "abte-producao"];
    assert.ok(conferirProjeto({ projectId: "abte-producao", emulador: false, modo: "executar", confirmoProjeto: "abte-producao", permitidos }).ok);
  });

  test("nos emuladores, só projetos demo-", () => {
    assert.ok(conferirProjeto({ projectId: "demo-abte-migracao", emulador: true, modo: "executar", confirmoProjeto: "demo-abte-migracao" }).ok);
    assert.equal(conferirProjeto({ projectId: "abte-dev", emulador: true, modo: "simulacao", confirmoProjeto: null }).ok, false);
    assert.equal(conferirProjeto({ projectId: "demo-abte-migracao", emulador: false, modo: "simulacao", confirmoProjeto: null }).ok, false);
  });
});

describe("Validação do imagens-origem.json", () => {
  test("aceita os formatos de id vistos no site antigo", () => {
    for (const id of [ID, `7dce06_${HEX}~mv2.png`, `7dce06_${HEX}~mv2_d_3500_3516_s_4_2.png`, `7dce06_${HEX}~mv2_d_1696_1717_s_2.jpg`, `3b1f25_${HEX}.jpg`, `${HEX}.jpg`, `7dce06_${HEX}~mv2.jpeg`]) {
      assert.ok(ehIdDeMidiaWix(id), id);
    }
  });

  test("recusa id que pode apontar para outro lugar ou fora do formato", () => {
    for (const id of [`https://static.wixstatic.com/media/${ID}`, `../${ID}`, `7dce06_${HEX}~mv2.svg`, `7dce06_${HEX.slice(1)}~mv2.jpg`, `7dce06_${HEX}~mv2.jpg?x=1`, `media/${ID}`, ""]) {
      assert.equal(ehIdDeMidiaWix(id), false, id);
    }
  });

  test("aceita papel e prioridade opcionais e os 8 tipos", () => {
    const tipos = ["profissional", "post", "postCorpo", "produto", "artigo", "categoriaDeProduto", "diretoria", "pagina"];
    const imagens = tipos.map((tipo, i) => imagem(`7dce06_${HEX.slice(0, 31)}${i.toString(16)}~mv2.jpg`, [uso(tipo, `chave-${i}`)], i % 2 ? { prioridade: "alta" } : {}));
    imagens[0].usos[0] = { ...imagens[0].usos[0], papel: "foto" };
    const resultado = validarImagensOrigem({ versao: 1, imagens });
    assert.ok(resultado.ok, JSON.stringify(!resultado.ok && resultado.erros));
    assert.equal(resultado.imagens.length, 8);
    assert.equal(resultado.imagens[0].usos[0].papel, "foto");
    assert.equal(resultado.imagens[0].prioridade, null);
    assert.equal(resultado.imagens[1].prioridade, "alta");
  });

  test("recusa tipo, papel e prioridade desconhecidos, versão errada, id repetido e uso repetido", () => {
    const casos: [string, unknown][] = [
      ["tipo", { versao: 1, imagens: [imagem(ID, [uso("categoriaDeArtigo", "x")])] }],
      ["papel", { versao: 1, imagens: [imagem(ID, [uso("post", "x", 1, { papel: "banner" })])] }],
      ["prioridade", { versao: 1, imagens: [imagem(ID, [uso("post", "x")], { prioridade: "urgente" })] }],
      ["versao", { versao: 2, imagens: [imagem(ID, [uso("post", "x")])] }],
      ["repetido", { versao: 1, imagens: [imagem(ID, [uso("post", "x")]), imagem(ID, [uso("post", "y")])] }],
      ["uso repetido", { versao: 1, imagens: [imagem(ID, [uso("post", "x"), uso("post", "x")])] }],
      ["sem usos", { versao: 1, imagens: [imagem(ID, [])] }],
      ["posicao", { versao: 1, imagens: [imagem(ID, [uso("post", "x", 0)])] }],
      ["vazia", { versao: 1, imagens: [] }],
    ];
    for (const [nome, dados] of casos) assert.equal(validarImagensOrigem(dados).ok, false, nome);
  });

  test("recusa os ids do layout do site antigo (logo, menu e ícones)", () => {
    for (const prefixo of ["b3206b", "ecc471", "0a5ee7", "6fc301", "1966d4", "11062b"]) {
      const resultado = validarImagensOrigem({ versao: 1, imagens: [imagem(`${prefixo}_${HEX}~mv2.png`, [uso("pagina", "home")])] });
      assert.equal(resultado.ok, false, prefixo);
      assert.match(!resultado.ok ? resultado.erros[0] : "", /layout/);
    }
  });

  test("as mensagens de erro não repetem o rótulo (que pode ser um nome)", () => {
    const resultado = validarImagensOrigem({ versao: 1, imagens: [imagem("x", [{ tipo: "zzz", chaveDeOrigem: "a", rotulo: "Nome Fictício Pessoal", posicao: 1 }])] });
    assert.equal(resultado.ok, false);
    assert.doesNotMatch(!resultado.ok ? resultado.erros.join(" ") : "", /Fictício/);
  });

  test("GIF e AVIF são previstos como recusados pela extensão", () => {
    assert.equal(formatoPrevisto(`7dce06_${HEX}~mv2.gif`), "gif");
    assert.ok(previstoComoRecusado(`7dce06_${HEX}~mv2.gif`));
    assert.ok(previstoComoRecusado(`7dce06_${HEX}~mv2.avif`));
    assert.equal(previstoComoRecusado(ID), false);
    assert.equal(formatoPrevisto(`7dce06_${HEX}~mv2.jpeg`), "jpeg");
  });
});

describe("Mapa e alt provisório", () => {
  const conteudo = [
    JSON.stringify({ tipo: "meta" }),
    JSON.stringify({ tipo: "post", slug: "post-um", titulo: "Título do Post Um" }),
    JSON.stringify({ tipo: "produto", slug: "kit-teste", nome: "Kit de Teste" }),
    JSON.stringify({ tipo: "diretoria", cargo: "secretaria-geral", nome: "Pessoa Fictícia" }),
    JSON.stringify({ tipo: "categoria", url: "/category/abte", titulo: "Produtos ABTE | ABTE" }),
    JSON.stringify({ tipo: "categoria", url: "/blogtratandoescoliose", titulo: "Blog | ABTE" }),
    "",
  ].join("\n");
  const lido = lerMapaParaAlt(conteudo);
  assert.ok(lido.ok);
  const mapa = lido.mapa;

  function alt(usos: ReturnType<typeof uso>[], todas?: ImagemDeOrigem[]) {
    const img: ImagemDeOrigem = { midiaIdWix: ID, usos: usos.map((u) => ({ ...u, papel: null })) as ImagemDeOrigem["usos"], altNoSiteAntigo: null, observacao: null, prioridade: null };
    return montarAltProvisorio(img, mapa, contarImagensPorProduto(todas ?? [img]));
  }

  test("lê títulos de posts, nomes de produtos, diretoria pelo cargo e categorias pelo slug", () => {
    assert.equal(mapa.posts.get("post-um"), "Título do Post Um");
    assert.equal(mapa.produtos.get("kit-teste"), "Kit de Teste");
    assert.equal(mapa.diretoria.get("secretaria-geral"), "Pessoa Fictícia");
    assert.equal(mapa.categorias.get("abte"), "Produtos ABTE");
    assert.equal(mapa.categorias.size, 1);
    assert.equal(lerMapaParaAlt("{quebrado").ok, false);
  });

  test("uma regra por tipo", () => {
    assert.deepEqual(alt([{ ...uso("profissional", "pessoa-ficticia"), rotulo: "Pessoa Fictícia" }]), { alt: "Foto de Pessoa Fictícia", regra: "profissional", semDadoNoMapa: false });
    assert.equal(alt([uso("diretoria", "secretaria-geral")]).alt, "Foto de Pessoa Fictícia, secretária-geral");
    assert.equal(alt([uso("post", "post-um")]).alt, "Capa do post: Título do Post Um");
    assert.equal(alt([uso("postCorpo", "post-um", 2)]).alt, "Imagem do post: Título do Post Um");
    assert.equal(alt([uso("artigo", "artigo-3")]).alt, "Imagem do artigo: título a confirmar (artigo 3)");
    assert.equal(alt([uso("categoriaDeProduto", "abte")]).alt, "Imagem da categoria Produtos ABTE");
    assert.equal(alt([uso("pagina", "triagem")]).alt, "Imagem da página Triagem");
    assert.deepEqual(alt([uso("pagina", "desconhecida")]), { alt: "Imagem do site, a descrever", regra: "paginaGenerica", semDadoNoMapa: false });
  });

  test("produto: imagem n de total, contando todas as imagens do produto", () => {
    const daGaleria = (posicao: number) => ({ tipo: "produto" as const, chaveDeOrigem: "kit-teste", rotulo: "kit-teste", posicao, papel: "galeria" });
    const um: ImagemDeOrigem = { midiaIdWix: ID, usos: [daGaleria(2)], altNoSiteAntigo: null, observacao: null, prioridade: null };
    const outro: ImagemDeOrigem = { ...um, midiaIdWix: `3b1f25_${HEX}.jpg`, usos: [daGaleria(1)] };
    assert.equal(montarAltProvisorio(um, mapa, contarImagensPorProduto([um, outro])).alt, "Kit de Teste, imagem 2 de 2");
  });

  test("vários usos: vale profissional, depois diretoria, produto, post", () => {
    assert.equal(alt([uso("postCorpo", "post-um"), uso("diretoria", "secretaria-geral")]).regra, "diretoria");
    assert.equal(alt([uso("pagina", "home"), uso("post", "post-um")]).regra, "post");
    assert.equal(alt([uso("diretoria", "secretaria-geral"), { ...uso("profissional", "x"), rotulo: "Pessoa Fictícia" }]).regra, "profissional");
  });

  test("sem título no mapa: usa a chave e marca", () => {
    const resultado = alt([uso("post", "post-sem-titulo")]);
    assert.equal(resultado.alt, "Capa do post: post-sem-titulo");
    assert.equal(resultado.semDadoNoMapa, true);
  });

  test("corta em 200 caracteres", () => {
    const resultado = alt([{ ...uso("profissional", "x"), rotulo: "N".repeat(300) }]);
    assert.equal(resultado.alt.length, LIMITE_DO_ALT_PROVISORIO);
    assert.ok(resultado.alt.endsWith("…"));
  });
});

describe("Assinatura e ajuste das imagens baixadas", () => {
  const cor = (largura: number, altura: number) => sharp({ create: { width: largura, height: altura, channels: 3, background: { r: 200, g: 60, b: 40 } } });

  test("nomeia GIF e AVIF pela assinatura", async () => {
    assert.equal(formatoPelaAssinatura(await cor(10, 10).gif().toBuffer()), "gif");
    assert.equal(formatoPelaAssinatura(await cor(10, 10).jpeg().toBuffer()), "jpeg");
    const avif = new Uint8Array([0, 0, 0, 0x1c, ...Buffer.from("ftypavif"), 0, 0, 0, 0]);
    assert.equal(formatoPelaAssinatura(avif), "avif");
    assert.equal(formatoPelaAssinatura(new Uint8Array([1, 2, 3])), "outro");
  });

  test("dentro dos limites, vai como veio (sem regravar em JPEG)", async () => {
    const png = await cor(800, 600).png().toBuffer();
    const ajuste = await ajustarComoNoNavegador(png);
    assert.ok(ajuste.ok);
    assert.equal(ajuste.reduzida, false);
    assert.equal(ajuste.formato, "png");
    assert.deepEqual(Buffer.from(ajuste.bytes), png);
  });

  test("acima de 2560 px, reduz como o navegador (JPEG, sem ampliar, transparência em branco)", async () => {
    const grande = await sharp({ create: { width: 3200, height: 1600, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const ajuste = await ajustarComoNoNavegador(grande);
    assert.ok(ajuste.ok);
    assert.equal(ajuste.reduzida, true);
    const metadados = await sharp(ajuste.bytes).metadata();
    assert.equal(metadados.format, "jpeg");
    assert.equal(metadados.width, LADO_MAXIMO_NO_NAVEGADOR);
    assert.equal(metadados.height, 1280);
    const { data } = await sharp(ajuste.bytes).extract({ left: 10, top: 10, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
    assert.ok(data[0] > 240 && data[1] > 240 && data[2] > 240, "transparência pintada de branco");
  });

  test("GIF e arquivo que não é imagem são recusados", async () => {
    const gif = await ajustarComoNoNavegador(await cor(10, 10).gif().toBuffer());
    assert.equal(gif.ok, false);
    assert.equal((await ajustarComoNoNavegador(new Uint8Array([1, 2, 3]))).ok, false);
  });

  test("relatório com endereço do Wix é barrado", () => {
    assert.equal(relatorioSemEnderecoDoWix({ a: "https://static.wixstatic.com/media/x.jpg" }), false);
    assert.equal(relatorioSemEnderecoDoWix({ a: "algo.wix.com" }), false);
    assert.ok(relatorioSemEnderecoDoWix({ midiaIdWix: ID, sistema: "wix" }));
  });
});

describe("Lista da conferência de menores", () => {
  test("aceita conferido e naoSeAplica, com ids de documento", () => {
    const resultado = validarListaDeConferencia({ conferido: ["abc", "def"], naoSeAplica: ["ghi"] });
    assert.ok(resultado.ok);
    assert.deepEqual(resultado.itens, [
      { midiaId: "abc", valor: "conferido" },
      { midiaId: "def", valor: "conferido" },
      { midiaId: "ghi", valor: "naoSeAplica" },
    ]);
  });

  test("recusa chave desconhecida (inclusive pendente), id inválido, id repetido e lista vazia", () => {
    for (const dados of [{ pendente: ["abc"] }, { conferido: ["a/b"] }, { conferido: ["abc"], naoSeAplica: ["abc"] }, { conferido: [] }, {}, [], { conferido: "abc" }, null]) {
      assert.equal(validarListaDeConferencia(dados).ok, false, JSON.stringify(dados));
    }
  });
});
