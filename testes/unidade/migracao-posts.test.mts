// Testes da leitura dos posts do site antigo e do conversor para o Markdown
// restrito (npm run test:unidade). Só HTML sintético, escrito aqui: nenhum
// texto, nome ou id real de post.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { fotoDoAutor, lerPaginaDePost } from "../../src/lib/migracao/postsColeta.ts";
import { caminhoNovoDoSiteAntigo, converterCorpoDoPost, escaparTexto, idiomaDoPost, lerPostsDoMapa } from "../../src/lib/migracao/postsConversao.ts";

const hex = (n: number) => n.toString(16).padStart(32, "0");
const ID = (n: number) => `7dce06_${hex(n)}~mv2.jpg`;
const CAPA = ID(9);
const figura = (n: number, legenda = "") =>
  `<figure data-hook="figure-IMAGE"><div><wow-image id="${ID(n)}"><img src="https://static.wixstatic.com/media/${ID(n)}/v1/fill/w_740/${ID(n)}" alt=""></wow-image></div><button>ampliar</button>${legenda ? `<figcaption><span>${legenda}</span></figcaption>` : ""}</figure>`;
const artigo = (corpo: string) => `<article data-hook="post"><header><h1 data-hook="post-title">Título Fictício</h1><span data-hook="user-name">Autor Fictício</span></header><section data-hook="post-description">${corpo}</section><footer>rodapé</footer></article>`;

function converter(corpo: string, imagensEsperadas: string[] = [], capa: string | null = CAPA) {
  const resultado = converterCorpoDoPost(artigo(corpo), { imagensEsperadas, capa });
  assert.ok(resultado.ok, !resultado.ok ? resultado.erro : "");
  return resultado;
}

describe("Leitura da página do post", () => {
  test("guarda só o artigo, o título, a meta description e a data do ld+json", () => {
    const html = `<html><head><meta name="description" content="Descrição  fictícia."><meta property="og:description" content="Outra."><script type="application/ld+json">${JSON.stringify({ "@type": "BlogPosting", datePublished: "2026-01-02T03:04:05.000Z", dateModified: "2026-02-01T00:00:00.000Z" })}</script></head><body><nav>menu</nav>${artigo("<p>Corpo.</p>")}<section>posts recentes</section></body></html>`;
    const lido = lerPaginaDePost(html);
    assert.equal(lido.titulo, "Título Fictício");
    assert.equal(lido.descricao, "Descrição fictícia.");
    assert.equal(lido.publicadoEm, "2026-01-02T03:04:05.000Z");
    assert.equal(lido.atualizadoEm, "2026-02-01T00:00:00.000Z");
    assert.equal(lido.fonteDaData, "ldJson");
    assert.match(lido.artigoHtml ?? "", /^<article data-hook="post">/);
    assert.doesNotMatch(lido.artigoHtml ?? "", /menu|posts recentes/);
  });

  test("sem ld+json, a data vem da meta; sem artigo, null", () => {
    const lido = lerPaginaDePost(`<html><head><meta property="article:published_time" content="2025-05-05T00:00:00Z"><meta property="og:description" content="Só a og."></head><body><p>sem artigo</p></body></html>`);
    assert.deepEqual([lido.publicadoEm, lido.fonteDaData, lido.artigoHtml, lido.descricao], ["2025-05-05T00:00:00Z", "meta", null, "Só a og."]);
  });

  test("foto do autor: id da mídia no data-image-info do avatar; sem avatar ou com JSON quebrado, null", () => {
    const avatar = (info: string) => `<article data-hook="post"><wow-image class="x avatar-image" data-image-info='${info}'><img alt=""></wow-image></article>`;
    assert.equal(fotoDoAutor(avatar(JSON.stringify({ imageData: { uri: ID(3) } }))), ID(3));
    assert.equal(fotoDoAutor(avatar(JSON.stringify({ imageData: { uri: "https://exemplo.invalid/x.jpg" } }))), null);
    assert.equal(fotoDoAutor(avatar("{quebrado")), null);
    assert.equal(fotoDoAutor(artigo("<p>sem avatar</p>")), null);
  });
});

describe("Mapa e idioma", () => {
  test("lê os posts do mapa e recusa slug repetido", () => {
    const linha = JSON.stringify({ tipo: "post", slug: "post-ficticio", titulo: "Post Fictício", publicadoEm: "2026-01-01T00:00:00Z", idiomaEstimado: "pt", capa: ID(1) });
    const lido = lerPostsDoMapa(`${linha}\n${JSON.stringify({ tipo: "produto", slug: "x" })}`);
    assert.ok(lido.ok);
    assert.equal(lido.posts.length, 1);
    assert.equal(lerPostsDoMapa(`${linha}\n${linha}`).ok, false);
  });

  test("idioma: es quando o mapa marca espanhol; o resto, pt-BR", () => {
    assert.equal(idiomaDoPost({ idiomaEstimado: "es" }), "es");
    assert.equal(idiomaDoPost({ idiomaEstimado: "pt" }), "pt-BR");
    assert.equal(idiomaDoPost({ idiomaEstimado: "" }), "pt-BR");
  });
});

describe("Conversor para Markdown restrito", () => {
  test("parágrafos, títulos, listas e citação; linhas vazias do Wix somem", () => {
    const { markdown, relatorio } = converter(
      `<div><p><span>Primeiro parágrafo.</span></p></div><div><span><br role="presentation"></span></div>` +
        `<h2>Seção</h2><h3>Subseção</h3><ul><li><p>Item um</p></li><li><p>Item dois</p></li></ul>` +
        `<ol><li><p>Passo</p></li><li><p>Outro passo</p></li></ol><blockquote><p>Citação.</p></blockquote>`,
    );
    assert.equal(markdown, "Primeiro parágrafo.\n\n## Seção\n\n### Subseção\n\n- Item um\n- Item dois\n\n1. Passo\n2. Outro passo\n\n> Citação.\n");
    assert.deepEqual(relatorio.blocos, { paragrafos: 1, titulos: 2, itensDeLista: 4, citacoes: 1, imagens: 0 });
  });

  test("h1 vira ##, h4 a h6 viram ### e vão para revisão, e a mudança é contada", () => {
    const { markdown, relatorio } = converter("<h1>Grande</h1><h5>Pequeno</h5>");
    assert.equal(markdown, "## Grande\n\n### Pequeno\n");
    assert.deepEqual(relatorio.adaptados, { "h1 no corpo (virou ##)": 1, "h5 (virou ###)": 1 });
    assert.deepEqual(relatorio.paraRevisar, ["título h5 virou ### (conferir o nível)"]);
  });

  test("negrito e itálico viram ** e *; sublinhado vira texto simples", () => {
    const { markdown, relatorio } = converter("<p>Texto <strong>forte</strong>, <em>leve</em>, <b>b</b>, <i>i</i> e <u>sublinhado</u>.</p>");
    assert.equal(markdown, "Texto **forte**, *leve*, **b**, *i* e sublinhado.\n");
    assert.deepEqual([relatorio.enfase.negrito, relatorio.enfase.italico], [2, 2]);
    assert.deepEqual(relatorio.formatacaoDescartada, { u: 1 });
  });

  test("ênfase: espaços ficam do lado de fora, vazia some, colada se junta, aninhada e em título simplificadas", () => {
    const { markdown, relatorio } = converter(
      "<p>a<strong> forte </strong>b <strong> </strong>c <strong>um</strong><strong>dois</strong> <strong>fora <em>dentro</em></strong></p>" +
        "<p><strong>linha um<br>linha dois</strong></p><h2><strong>Título forte</strong></h2><p><strong>x</strong><em>y</em></p>",
    );
    assert.equal(markdown, "a **forte** b c **umdois** **fora dentro**\n\n**linha um**\n\n**linha dois**\n\n## Título forte\n\n**x**y\n");
    assert.equal(relatorio.enfase.aninhadaSimplificada, 1);
    assert.equal(relatorio.enfase.emTitulo, 1);
    assert.equal(relatorio.enfase.coladaSimplificada, 1);
  });

  test("ênfase no link: a que cobre o texto inteiro vai para fora; o resto sai", () => {
    const { markdown, relatorio } = converter('<p><strong><a href="https://exemplo.invalid/a">tudo</a></strong> <a href="https://exemplo.invalid/b"><strong>tudo</strong></a> <a href="https://exemplo.invalid/c">meio <em>leve</em></a></p>');
    assert.equal(markdown, "**[tudo](https://exemplo.invalid/a)** **[tudo](https://exemplo.invalid/b)** [meio leve](https://exemplo.invalid/c)\n");
    assert.equal(relatorio.enfase.emLinkSimplificada, 1);
  });

  test("quebra de linha dentro do parágrafo vira parágrafo novo", () => {
    assert.equal(converter("<p>Linha um<br>Linha dois</p>").markdown, "Linha um\n\nLinha dois\n");
  });

  test("escapes: colchetes, asteriscos e começo de linha que viraria marcação", () => {
    assert.equal(escaparTexto("a [b] *c* _d_ `e` \\"), "a \\[b\\] \\*c\\* \\_d\\_ \\`e\\` \\\\");
    assert.equal(converter("<p># não é título</p><p>- não é item</p><p>1. não é lista</p><p>> não é citação</p>").markdown, "\\# não é título\n\n\\- não é item\n\n\\1. não é lista\n\n\\> não é citação\n");
  });

  test("links: https e mailto ficam; http, Wix e caminho sem destino saem (texto fica e é listado); site antigo é reescrito", () => {
    const { markdown, relatorio } = converter(
      `<p><a href="https://exemplo.invalid/artigo">artigo</a> <a href="mailto:contato@exemplo.invalid">e-mail</a> ` +
        `<a href="http://exemplo.invalid/velho">velho</a> <a href="https://static.wixstatic.com/media/x.pdf">arquivo</a> ` +
        `<a href="https://www.abteescoliose.com.br/post/post-com-acentuação">outro post</a> ` +
        `<a href="https://www.abteescoliose.com.br/pagina-que-nao-existe">página</a> <a href="#ancora">âncora</a> <a href="https://exemplo.invalid/x"></a></p>`,
    );
    assert.equal(
      markdown,
      "[artigo](https://exemplo.invalid/artigo) [e-mail](mailto:contato@exemplo.invalid) velho arquivo [outro post](/blog/post-com-acentuacao) página âncora\n",
    );
    assert.equal(relatorio.links.mantidos, 2);
    assert.equal(relatorio.links.wixRemovidos, 1);
    assert.deepEqual(relatorio.links.httpRemovidos, [{ endereco: "http://exemplo.invalid/velho", texto: "velho" }]);
    assert.equal(relatorio.links.siteAntigoReescritos, 1);
    assert.deepEqual(relatorio.links.internosSemDestinoConhecido, [{ endereco: "/pagina-que-nao-existe", texto: "página" }]);
    assert.equal(relatorio.adaptados["link sem texto (descartado)"], 1);
  });

  test("caminhos do site antigo: post, produto, categorias e blog", () => {
    assert.deepEqual(
      ["/post/a-é", "/product-page/kit-pré", "/category/abte", "/category/loja", "/blogtratandoescoliose", "/outra"].map(caminhoNovoDoSiteAntigo),
      ["/blog/a-e", "/loja/produto/kit-pre", "/loja?categoria=produtos-abte", "/loja", "/blog", null],
    );
  });

  test("imagens pela posição do uso postCorpo; capa como primeira imagem sai (com a legenda), repetida adiante fica; legenda vira parágrafo", () => {
    const { markdown, relatorio } = converter(`${figura(9, "Legenda da capa")}<p>Texto.</p>${figura(1, "Legenda fictícia")}${figura(2)}${figura(9)}`, [ID(1), ID(2)]);
    assert.equal(markdown, `Texto.\n\n![](midia:wix:${ID(1)})\n\nLegenda fictícia\n\n![](midia:wix:${ID(2)})\n\n![](midia:wix:${ID(9)})\n`);
    assert.deepEqual(relatorio.imagens, { noCorpo: 4, casadas: 2, capaNoCorpo: 1, capaRemovidaDoCorpo: 1, semIdDaMidia: 0, semUsoNoArquivo: [], esperadasNaoAchadas: [] });
    assert.equal(relatorio.descartados["legenda de imagem que saiu"], 1);
    assert.deepEqual(relatorio.avisos, []);
    assert.doesNotMatch(markdown, /wixstatic/);
  });

  test("imagem dentro de item de lista entra logo depois do item", () => {
    const { markdown } = converter(`<ul><li><p>Item com figura</p><div>${figura(1)}</div></li><li><p>Outro</p></li></ul>`, [ID(1)]);
    assert.equal(markdown, `- Item com figura\n\n![](midia:wix:${ID(1)})\n\n- Outro\n`);
  });

  test("avisos: fora de posição, sem uso no arquivo, sem id e esperada não achada", () => {
    const { markdown, relatorio } = converter(`${figura(2)}${figura(5)}<figure><img src="sem-id.png"></figure>`, [ID(1), ID(2)]);
    assert.equal(markdown, `![](midia:wix:${ID(2)})\n`);
    assert.deepEqual(relatorio.imagens.semUsoNoArquivo, [ID(5)]);
    assert.equal(relatorio.imagens.semIdDaMidia, 1);
    assert.deepEqual(relatorio.imagens.esperadasNaoAchadas, [ID(1)]);
    assert.equal(relatorio.avisos.length, 4);
  });

  test("iframe, vídeo, script, estilo e divisor são descartados; nada de HTML na saída", () => {
    const { markdown, relatorio } = converter(`<p>Antes</p><div><iframe src="https://exemplo.invalid/video"></iframe></div><video></video><script>alerta()</script><style>p{}</style><hr><p style="color:red" onclick="x()">Depois</p>`);
    assert.equal(markdown, "Antes\n\nDepois\n");
    assert.deepEqual(relatorio.descartados, { iframe: 1, video: 1, script: 1, style: 1, "hr (divisor)": 1 });
    assert.doesNotMatch(markdown, /<|style|onclick/);
  });

  test("tabela vira um parágrafo por linha; sup vira texto; lista aninhada é achatada", () => {
    const { markdown, relatorio } = converter(`<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table><p>Nota<sup>1</sup></p><ul><li><p>Pai</p><ul><li><p>Filho</p></li></ul></li></ul>`);
    assert.equal(markdown, "A; B\n\n1; 2\n\nNota1\n\n- Pai\n- Filho\n");
    assert.deepEqual(relatorio.paraRevisar, ["1 nota(s) em sup viraram texto colado (conferir as referências)"]);
    assert.ok(Object.keys(relatorio.adaptados).some((chave) => chave.startsWith("tabela")));
    assert.equal(relatorio.adaptados["sup (nota ou índice, virou texto)"], 1);
    assert.equal(relatorio.adaptados["item de lista aninhada (achatado)"], 1);
  });

  test("detecta a seção de referências, sem mudar o texto", () => {
    const { markdown, relatorio } = converter("<h2>Referências</h2><p>Autor A. Título B. 2020.</p>");
    assert.equal(relatorio.temSecaoDeReferencias, true);
    assert.equal(markdown, "## Referências\n\nAutor A. Título B. 2020.\n");
  });

  test("não corrige erros de digitação", () => {
    assert.equal(converter("<p>Exmplo cmo errro de digitaçao.</p>").markdown, "Exmplo cmo errro de digitaçao.\n");
  });

  test("sem o corpo do post: erro", () => {
    const resultado = converterCorpoDoPost("<article data-hook=\"post\"><p>sem corpo</p></article>", { imagensEsperadas: [], capa: null });
    assert.equal(resultado.ok, false);
  });
});
