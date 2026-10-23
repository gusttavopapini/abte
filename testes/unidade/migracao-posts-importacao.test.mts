// Testes das partes puras da importação dos posts (npm run test:unidade):
// slug novo, resumo, tempo de leitura, troca das imagens e redirecionamentos.
// Só textos e slugs fictícios.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ehMetaAutomaticaDoWix, redirecionamentosDoBlog, resumoDoPost, slugNovoDoPost, tempoDeLeitura, trocarImagens } from "../../src/lib/migracao/posts.ts";

const hex = (n: number) => n.toString(16).padStart(32, "0");
const ID = (n: number) => `7dce06_${hex(n)}~mv2.jpg`;

describe("Importação dos posts: partes puras", () => {
  test("slug novo é o antigo sem acento, sempre o mesmo", () => {
    assert.equal(slugNovoDoPost("ação-e-reação-fictícia"), "acao-e-reacao-ficticia");
    assert.equal(slugNovoDoPost("ação-e-reação-fictícia"), slugNovoDoPost("ação-e-reação-fictícia"));
    assert.equal(slugNovoDoPost("já-sem-acento"), "ja-sem-acento");
    assert.equal(slugNovoDoPost("ééé".replace(/é/g, "!")), "post");
  });

  test("resumo: meta escrita à mão quando existe; senão (ou automática do Wix) o primeiro parágrafo, cortado no fim de uma palavra perto de 160", () => {
    assert.deepEqual(resumoDoPost("Primeiro.", "  Descrição   fictícia. "), { resumo: "Descrição fictícia.", fonte: "meta", metaAutomaticaIgnorada: false });
    assert.deepEqual(resumoDoPost("## Título\n\n**Curto** e [link](/a).\n\nSegundo.", null), { resumo: "Curto e link.", fonte: "primeiroParagrafo", metaAutomaticaIgnorada: false });
    const longo = `${"palavra ".repeat(40).trim()}.`;
    const { resumo, fonte } = resumoDoPost(longo, "");
    assert.equal(fonte, "primeiroParagrafo");
    assert.ok(resumo.endsWith("...") && resumo.length <= 163, resumo);
    assert.doesNotMatch(resumo, /palavr\.\.\.$|\s\.\.\.$/, "corta entre palavras");
    // Palavra enorme no ponto do corte: o corte vai para o espaço seguinte, nunca no meio dela.
    const comPalavraLonga = `${"a".repeat(150)} ${"b".repeat(30)} fim do texto ficticio`;
    assert.equal(resumoDoPost(comPalavraLonga, null).resumo, `${"a".repeat(150)}...`);
    assert.equal(resumoDoPost("x".repeat(200), null).resumo, "x".repeat(200), "sem espaço: o parágrafo inteiro");
    assert.deepEqual(resumoDoPost(`![x](midia:wix:${ID(1)})\n\n- só lista`, null), { resumo: "", fonte: "vazio", metaAutomaticaIgnorada: false });
  });

  test("meta automática do Wix (só o começo do texto, parágrafos juntos sem espaço, cortada no meio da palavra) vale como inexistente", () => {
    const markdown = "Primeiro parágrafo **fictício** do post.\n\nSegundo parágrafo com mais texto.\n";
    for (const meta of ["Primeiro parágrafo fictício do post.Segundo parágrafo com ma", "primeiro parágrafo fictício do post. Segundo...", "Primeiro parágrafo fictício"]) {
      assert.equal(ehMetaAutomaticaDoWix(meta, markdown), true, meta);
      assert.deepEqual(resumoDoPost(markdown, meta), { resumo: "Primeiro parágrafo fictício do post.", fonte: "primeiroParagrafo", metaAutomaticaIgnorada: true });
    }
    assert.equal(ehMetaAutomaticaDoWix("Resumo escrito à mão, diferente do texto.", markdown), false);
    assert.equal(resumoDoPost(markdown, "Resumo escrito à mão.").fonte, "meta");
  });

  test("tempo de leitura: 200 palavras por minuto, sem contar imagens, no mínimo 1", () => {
    assert.equal(tempoDeLeitura("Pouco texto."), 1);
    assert.equal(tempoDeLeitura(`${"palavra ".repeat(401)}\n\n![x](midia:abc)`), 3);
  });

  test("troca midia:wix pelo id da biblioteca; a ainda não importada fica e é listada", () => {
    const markdown = `Texto com midia:wix:${ID(1)} citado.\n\n![Alt \\] com colchete](midia:wix:${ID(1)})\n\n![](midia:wix:${ID(2)})\n`;
    const { conteudo, ligadas, pendentes } = trocarImagens(markdown, (id) => (id === ID(1) ? "docDaMidia1" : null));
    assert.equal(conteudo, `Texto com midia:wix:${ID(1)} citado.\n\n![Alt \\] com colchete](midia:docDaMidia1)\n\n![](midia:wix:${ID(2)})\n`);
    assert.deepEqual([ligadas, pendentes], [1, [ID(2)]]);
  });

  test("redirecionamentos: /post/{antigo} decodificado e codificado para /blog/{novo}, e o blog antigo", () => {
    assert.deepEqual(redirecionamentosDoBlog([{ slugAntigo: "pós-fictício", slugNovo: "pos-ficticio" }, { slugAntigo: "sem-acento", slugNovo: "sem-acento" }]), [
      { de: "/post/pós-fictício", para: "/blog/pos-ficticio", tipo: "post" },
      { de: "/post/p%C3%B3s-fict%C3%ADcio", para: "/blog/pos-ficticio", tipo: "post" },
      { de: "/post/sem-acento", para: "/blog/sem-acento", tipo: "post" },
      { de: "/blogtratandoescoliose", para: "/blog", tipo: "blog" },
    ]);
  });
});
