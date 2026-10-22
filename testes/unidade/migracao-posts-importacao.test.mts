// Testes das partes puras da importação dos posts (npm run test:unidade):
// slug novo, resumo, tempo de leitura, troca das imagens e redirecionamentos.
// Só textos e slugs fictícios.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { redirecionamentosDoBlog, resumoDoPost, slugNovoDoPost, tempoDeLeitura, trocarImagens } from "../../src/lib/migracao/posts.ts";

const hex = (n: number) => n.toString(16).padStart(32, "0");
const ID = (n: number) => `7dce06_${hex(n)}~mv2.jpg`;

describe("Importação dos posts: partes puras", () => {
  test("slug novo é o antigo sem acento, sempre o mesmo", () => {
    assert.equal(slugNovoDoPost("ação-e-reação-fictícia"), "acao-e-reacao-ficticia");
    assert.equal(slugNovoDoPost("ação-e-reação-fictícia"), slugNovoDoPost("ação-e-reação-fictícia"));
    assert.equal(slugNovoDoPost("já-sem-acento"), "ja-sem-acento");
    assert.equal(slugNovoDoPost("ééé".replace(/é/g, "!")), "post");
  });

  test("resumo: meta description quando existe; senão o primeiro parágrafo, cortado num espaço perto de 160", () => {
    assert.deepEqual(resumoDoPost("Primeiro.", "  Descrição   fictícia. "), { resumo: "Descrição fictícia.", fonte: "meta" });
    assert.deepEqual(resumoDoPost("## Título\n\n**Curto** e [link](/a).\n\nSegundo.", null), { resumo: "Curto e link.", fonte: "primeiroParagrafo" });
    const longo = `${"palavra ".repeat(40).trim()}.`;
    const { resumo, fonte } = resumoDoPost(longo, "");
    assert.equal(fonte, "primeiroParagrafo");
    assert.ok(resumo.endsWith("...") && resumo.length <= 163, resumo);
    assert.doesNotMatch(resumo, /palavr\.\.\.$|\s\.\.\.$/, "corta entre palavras");
    assert.deepEqual(resumoDoPost(`![x](midia:wix:${ID(1)})\n\n- só lista`, null), { resumo: "", fonte: "vazio" });
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
