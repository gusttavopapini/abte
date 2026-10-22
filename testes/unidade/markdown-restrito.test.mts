// Testes da leitura do Markdown restrito (npm run test:unidade): o subconjunto
// aceito e as tentativas de sair dele (HTML, javascript:, data:, imagens
// externas, aninhamento exagerado). Só textos sintéticos.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { enderecoPermitido, lerMarkdownRestrito, lerTrechos, midiasDoMarkdown, textoDoMarkdown, type Bloco, type Trecho } from "../../src/lib/markdownRestrito.ts";

const texto = (valor: string): Trecho => ({ tipo: "texto", texto: valor });
const paragrafo = (...trechos: Trecho[]): Bloco => ({ tipo: "paragrafo", trechos });

// Todo texto que chega à tela, para conferir que nada vira elemento.
function soTexto(blocos: Bloco[]): boolean {
  const trechosSoTexto = (trechos: Trecho[]) => trechos.every((trecho) => trecho.tipo === "texto");
  return blocos.every((bloco) => bloco.tipo === "paragrafo" && trechosSoTexto(bloco.trechos));
}

describe("Markdown restrito: subconjunto", () => {
  test("parágrafos, títulos, listas, citação e imagem", () => {
    const blocos = lerMarkdownRestrito("Um parágrafo\ncontinua aqui.\n\n## Seção\n\n### Parte\n\n- a\n- b\n\n3. c\n4. d\n\n> dito\n> mais\n\n![Descrição](midia:abc123)\n");
    assert.deepEqual(blocos, [
      paragrafo(texto("Um parágrafo continua aqui.")),
      { tipo: "titulo", nivel: 2, trechos: [texto("Seção")] },
      { tipo: "titulo", nivel: 3, trechos: [texto("Parte")] },
      { tipo: "lista", numerada: false, inicio: 1, itens: [[texto("a")], [texto("b")]] },
      { tipo: "lista", numerada: true, inicio: 3, itens: [[texto("c")], [texto("d")]] },
      { tipo: "citacao", paragrafos: [[texto("dito")], [texto("mais")]] },
      { tipo: "imagem", alt: "Descrição", midia: "abc123" },
    ]);
    assert.deepEqual(midiasDoMarkdown(blocos), ["abc123"]);
  });

  test("negrito, itálico e um dentro do outro", () => {
    assert.deepEqual(lerTrechos("a **forte** e *leve* e **muito *junto***"), [
      texto("a "),
      { tipo: "negrito", trechos: [texto("forte")] },
      texto(" e "),
      { tipo: "italico", trechos: [texto("leve")] },
      texto(" e "),
      { tipo: "negrito", trechos: [texto("muito "), { tipo: "italico", trechos: [texto("junto")] }] },
    ]);
    assert.deepEqual(lerTrechos("***tudo***"), [{ tipo: "negrito", trechos: [{ tipo: "italico", trechos: [texto("tudo")] }] }]);
    assert.deepEqual(lerTrechos("*leve **forte** leve*"), [{ tipo: "italico", trechos: [texto("leve "), { tipo: "negrito", trechos: [texto("forte")] }, texto(" leve")] }]);
    // Sem fechamento, as estrelas ficam como texto.
    assert.deepEqual(lerTrechos("2 * 3 e **aberto"), [texto("2 * 3 e **aberto")]);
    assert.deepEqual(lerTrechos("*a* **b**"), [{ tipo: "italico", trechos: [texto("a")] }, texto(" "), { tipo: "negrito", trechos: [texto("b")] }]);
  });

  test("links permitidos: https, mailto e caminho interno, com ênfase no texto", () => {
    assert.deepEqual(lerTrechos("[site](https://exemplo.invalid/a?b=1) [e-mail](mailto:x@exemplo.invalid) [blog](/blog/um-post) **[forte](/x)**"), [
      { tipo: "link", endereco: "https://exemplo.invalid/a?b=1", trechos: [texto("site")] },
      texto(" "),
      { tipo: "link", endereco: "mailto:x@exemplo.invalid", trechos: [texto("e-mail")] },
      texto(" "),
      { tipo: "link", endereco: "/blog/um-post", trechos: [texto("blog")] },
      texto(" "),
      { tipo: "negrito", trechos: [{ tipo: "link", endereco: "/x", trechos: [texto("forte")] }] },
    ]);
  });

  test("escapes do conversor voltam a ser o sinal, inclusive no começo do parágrafo", () => {
    const blocos = lerMarkdownRestrito("\\# não é título\n\n\\- não é item\n\n\\1. não é lista\n\n\\> não é citação\n\na \\*b\\* \\[c\\] \\_d\\_ \\\\ e\n");
    assert.deepEqual(blocos, [
      paragrafo(texto("# não é título")),
      paragrafo(texto("- não é item")),
      paragrafo(texto("1. não é lista")),
      paragrafo(texto("> não é citação")),
      paragrafo(texto("a *b* [c] _d_ \\ e")),
    ]);
  });

  test("fora do subconjunto vira texto como foi escrito", () => {
    const blocos = lerMarkdownRestrito("# Título 1\n\n#### Título 4\n\n_sublinhado_\n\n`código`\n\n---\n\n* item com estrela\n");
    assert.ok(soTexto(blocos));
    assert.deepEqual(textoDoMarkdown(blocos), ["# Título 1", "#### Título 4", "_sublinhado_", "`código`", "---", "* item com estrela"]);
  });

  test("texto simples para resumo e tempo de leitura, sem as imagens", () => {
    const blocos = lerMarkdownRestrito("**Forte** e [link](/a).\n\n![x](midia:abc)\n\n- item\n");
    assert.deepEqual(textoDoMarkdown(blocos), ["Forte e link.", "item"]);
  });
});

describe("Markdown restrito: segurança", () => {
  test("HTML fica como texto (nenhum elemento é criado a partir dele)", () => {
    const entradas = ['<script>alert(1)</script>', '<img src=x onerror="alert(1)">', '<a href="javascript:alert(1)">x</a>', '<iframe src="https://exemplo.invalid"></iframe>', "<b>negrito</b>"];
    for (const entrada of entradas) {
      const blocos = lerMarkdownRestrito(entrada);
      assert.ok(soTexto(blocos), entrada);
      assert.equal(textoDoMarkdown(blocos).join(""), entrada);
    }
  });

  test("javascript:, data:, vbscript:, http: e outros esquemas não viram link", () => {
    const enderecos = ["javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:x", "http://exemplo.invalid", "ftp://exemplo.invalid", "file:///etc/passwd", "mailto:", "midia:abc"];
    for (const endereco of enderecos) {
      assert.equal(enderecoPermitido(endereco), null, endereco);
      const blocos = lerMarkdownRestrito(`[clique](${endereco})`);
      assert.ok(soTexto(blocos), endereco);
    }
  });

  test("caminhos que o navegador leva para outro site não são internos", () => {
    for (const endereco of ["//exemplo.invalid/x", "/\\exemplo.invalid", "/a b", "/a\tb", "https://", "https://usuario:senha@exemplo.invalid/", "https://exemplo.invalid/a\\b"]) {
      assert.equal(enderecoPermitido(endereco), null, endereco);
    }
    assert.equal(enderecoPermitido("/blog/um-post"), "/blog/um-post");
  });

  test("imagens externas ou fora da linha própria não viram imagem nem link", () => {
    for (const entrada of ["![x](https://exemplo.invalid/a.png)", "![x](http://exemplo.invalid/a.png)", "![x](data:image/png;base64,AAAA)", "![x](/imagem.png)", "texto ![x](midia:abc) no meio", "![x](midia:id com espaço)"]) {
      const blocos = lerMarkdownRestrito(entrada);
      assert.ok(soTexto(blocos), entrada);
      assert.deepEqual(midiasDoMarkdown(blocos), []);
    }
  });

  test("aninhamento exagerado: um nível de cada, o resto é texto, e não fica lento", () => {
    const inicio = performance.now();
    const fundo = `${"**".repeat(5000)}x${"**".repeat(5000)}`;
    const estrelas = "*a".repeat(50_000);
    const colchetes = "[a](".repeat(20_000);
    const citacoes = `${"> ".repeat(5000)}texto`;
    for (const entrada of [fundo, estrelas, colchetes, citacoes, "**a *b **c *d***", "[a [b](/x)](/y)"]) {
      const blocos = lerMarkdownRestrito(entrada);
      const profundidade = (trechos: Trecho[]): number => Math.max(0, ...trechos.map((trecho) => (trecho.tipo === "texto" ? 0 : 1 + profundidade(trecho.trechos))));
      for (const bloco of blocos) {
        const listas = bloco.tipo === "paragrafo" || bloco.tipo === "titulo" ? [bloco.trechos] : bloco.tipo === "citacao" ? bloco.paragrafos : bloco.tipo === "lista" ? bloco.itens : [];
        for (const trechos of listas) assert.ok(profundidade(trechos) <= 3, "no máximo negrito, itálico e link, um dentro do outro");
      }
    }
    // Link dentro de link: o de dentro fica como texto.
    const [link] = lerTrechos("[a [b](/x)](/y)").filter((trecho) => trecho.tipo === "link");
    assert.ok(!link || link.trechos.every((trecho) => trecho.tipo !== "link"));
    assert.ok(performance.now() - inicio < 2000, "leitura em menos de 2 s");
  });

  test("conteúdo acima do limite é cortado, sem erro", () => {
    const blocos = lerMarkdownRestrito("a".repeat(300_000));
    assert.equal(textoDoMarkdown(blocos).join("").length, 200_000);
  });
});
