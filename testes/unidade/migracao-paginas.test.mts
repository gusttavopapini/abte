// Testes da coleta e da conversão das páginas institucionais do site antigo
// (npm run test:unidade), só com HTML sintético: lista do mapa, robots.txt,
// leitura do <main> e conversão para o Markdown restrito, com números da
// instituição, Pix e formulários fora.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { lerMarkdownRestrito } from "../../src/lib/markdownRestrito.ts";
import { lerPaginaDoSite, lerPaginasDoMapa, nomeDoArquivoDaPagina, permitidoPeloRobots } from "../../src/lib/migracao/paginasColeta.ts";
import { cabecalhoDaPagina, converterPagina } from "../../src/lib/migracao/paginasConversao.ts";

const hex = (n: number) => n.toString(16).padStart(32, "0");
const IMAGEM = (n: number) => `7dce06_${hex(n)}~mv2.jpg`;
const texto = (html: string) => `<div data-testid="richTextElement">${html}</div>`;

describe("Páginas do site antigo: coleta", () => {
  test("lê as páginas do mapa e separa as que só entram no relatório", () => {
    const mapa = ["/", "/doação", "/contato", "/cartilha", "/agendamento", "/nossa-historia", "/triagem"].map((caminho) => JSON.stringify({ tipo: "pagina", caminho, tituloSite: "Título | ABTE", caracteres: 10, imagens: [1, 2], links: 3 })).join("\n");
    const lido = lerPaginasDoMapa(mapa);
    assert.ok(lido.ok);
    assert.deepEqual(lido.paginas.filter((pagina) => pagina.lida).map((pagina) => pagina.caminho), ["/nossa-historia", "/triagem"]);
    assert.deepEqual(lido.paginas[0], { caminho: "/", tituloSite: "Título | ABTE", caracteres: 10, imagens: 2, links: 3, lida: false });
    assert.equal(lerPaginasDoMapa(JSON.stringify({ tipo: "pagina", caminho: "https://exemplo.invalid/x" })).ok, false);
    assert.equal(lerPaginasDoMapa([1, 2].map(() => JSON.stringify({ tipo: "pagina", caminho: "/x" })).join("\n")).ok, false);
    assert.equal(nomeDoArquivoDaPagina("/nossa-historia"), "nossa-historia");
  });

  test("robots.txt: vale o grupo *, a regra mais longa, e sem robots tudo é permitido", () => {
    const robots = "User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /account\nDisallow: /privado\nAllow: /privado/aberto # comentário\n";
    assert.equal(permitidoPeloRobots(robots, "/nossa-historia"), true);
    assert.equal(permitidoPeloRobots(robots, "/account/x"), false);
    assert.equal(permitidoPeloRobots(robots, "/privado"), false);
    assert.equal(permitidoPeloRobots(robots, "/privado/aberto"), true);
    assert.equal(permitidoPeloRobots("", "/qualquer"), true);
    assert.equal(permitidoPeloRobots("User-agent: *\nDisallow: /doa%C3%A7%C3%A3o", "/doação"), false, "caminho com acento, codificado");
  });

  test("guarda só o <main>, com o título e a meta description", () => {
    const lida = lerPaginaDoSite('<html><head><title> Página | ABTE </title><meta name="description" content=" Descrição "></head><body><header>menu</header><main id="PAGES_CONTAINER"><p>conteúdo</p></main><footer>rodapé</footer></body></html>');
    assert.deepEqual(lida, { conteudoHtml: '<main id="PAGES_CONTAINER"><p>conteúdo</p></main>', titulo: "Página | ABTE", descricao: "Descrição" });
    assert.equal(lerPaginaDoSite("<p>sem main</p>").conteudoHtml, null);
  });
});

describe("Páginas do site antigo: conversão", () => {
  const conhecidas = new Set([IMAGEM(1)]);

  test("blocos de texto, imagem conhecida, botão e link com texto viram Markdown restrito; o resto sai", () => {
    const html = `<main>
      ${texto("<h1>Nossa história</h1><p>Texto <strong>forte</strong> com <a href=\"https://exemplo.invalid/a\">link</a>.</p><h4>Subtítulo</h4>")}
      <wow-image><img src="https://static.wixstatic.com/media/${IMAGEM(1)}/v1/fill/x.jpg" alt="Foto fictícia"></wow-image>
      <wow-image><img src="https://static.wixstatic.com/media/${IMAGEM(2)}/v1/fill/x.jpg"></wow-image>
      <a data-testid="linkElement" href="https://www.abteescoliose.com.br/post/um-post"><span data-testid="stylablebutton-label">Ler o post</span></a>
      <a data-testid="linkElement" href="/fisioterapeutas"><span>Fisioterapeutas</span></a>
      <a data-testid="linkElement" href="https://wa.me/0"><img src="icone.png"></a>
      <ul><li><a href="https://exemplo.invalid"><img src="rede.png"></a></li></ul>
      <svg><text>ícone</text></svg><script>alert(1)</script>
      <div><span>texto solto</span></div>
    </main>`;
    const { markdown, relatorio } = converterPagina(html, conhecidas);
    assert.equal(
      markdown,
      `## Nossa história\n\nTexto **forte** com [link](https://exemplo.invalid/a).\n\n### Subtítulo\n\n![Foto fictícia](midia:wix:${IMAGEM(1)})\n\n[Ler o post](/blog/um-post)\n\nFisioterapeutas\n`,
    );
    assert.deepEqual([relatorio.blocosDeTexto, relatorio.imagensSoltas, relatorio.botoes, relatorio.caracteresForaDosBlocos], [1, 4, 2, "texto solto".length]);
    assert.deepEqual(relatorio.conversao.imagens.semUsoNoArquivo, [IMAGEM(2)]);
    assert.deepEqual(relatorio.conversao.links.internosSemDestinoConhecido, [{ endereco: "/fisioterapeutas", texto: "Fisioterapeutas" }]);
    assert.doesNotMatch(markdown, /wixstatic|alert|ícone|<|svg/);
    assert.ok(lerMarkdownRestrito(markdown).length > 0);
  });

  test("número da instituição, Pix e formulário de associação não entram e viram pendência (sem o texto)", () => {
    const html = `<main>
      ${texto("<p>+300</p><p>98%</p><p>Mais de 500 pacientes atendidos</p><p>2018</p><p>(21) 99999-0000</p>")}
      ${texto("<p>Doe pelo Pix: chave fictícia</p><p>CNPJ 00.000.000/0001-00</p>")}
      ${texto('<p>Quer se associar? <a href="https://docs.google.com/forms/d/x">Preencha aqui</a></p>')}
      ${texto("<p>Atendemos crianças desde 2010, com 15 anos de experiência em várias cidades e um texto longo o bastante para não ser um contador da página.</p>")}
      <form><p>Seja associado</p><input type="text" name="nome"><input type="email"></form>
      <form><input type="email" name="email"><button>Inscrever-se</button></form>
    </main>`;
    const { markdown, relatorio } = converterPagina(html, conhecidas);
    assert.equal(markdown, "2018\n\n(21) 99999-0000\n\nQuer se associar? Preencha aqui\n\nAtendemos crianças desde 2010, com 15 anos de experiência em várias cidades e um texto longo o bastante para não ser um contador da página.\n");
    assert.deepEqual(
      relatorio.pendencias.map((pendencia) => pendencia.tipo),
      ["associacao", "numero", "numero", "numero", "pix", "pix", "associacao", "formulario"],
    );
    assert.equal(relatorio.paragrafosComNumero, 1, "o parágrafo longo fica, contado para conferência");
    assert.ok(relatorio.pendencias.every((pendencia) => !/Pix: chave|500 pacientes|docs\.google/.test(pendencia.descricao)), "sem o texto da página");
  });

  test("cabeçalho do arquivo: o título da aba, sem o nome do site", () => {
    assert.equal(cabecalhoDaPagina("/triagem", "TRIAGEM | ABTE"), "## TRIAGEM\n\n");
    assert.equal(cabecalhoDaPagina("/x", ""), "## /x\n\n");
  });
});
