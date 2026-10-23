// Testes das partes puras da importação dos posts (npm run test:unidade):
// slug novo, resumo, tempo de leitura, troca das imagens e redirecionamentos.
// Só textos e slugs fictícios.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validarImagensOrigem } from "../../src/lib/migracao/imagensOrigem.ts";
import { ehMetaAutomaticaDoWix, redirecionamentosDoBlog, resumoDoPost, slugNovoDoPost, sugestaoPelaAssinatura, sugestoesPelaAssinatura, sugestoesPelaDiretoria, tempoDeLeitura, trocarImagens, type PostConvertido } from "../../src/lib/migracao/posts.ts";

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

  test("foto do autor só da diretoria: a sugestão vai para a lista (slug e cargo), nunca para o post", () => {
    const uso = (tipo: string, chave: string) => ({ tipo, chaveDeOrigem: chave, rotulo: chave, posicao: 1 });
    const validacao = validarImagensOrigem({
      versao: 1,
      imagens: [
        { midiaIdWix: ID(1), usos: [uso("diretoria", "presidente")] },
        { midiaIdWix: ID(2), usos: [uso("diretoria", "vice-presidente"), uso("profissional", "profissional-ficticio")] },
        { midiaIdWix: ID(3), usos: [uso("pagina", "home")] },
      ],
    });
    assert.ok(validacao.ok);
    const post = (slug: string, foto: string | null): PostConvertido => ({ doMapa: { slug, titulo: "T", publicadoEm: "2024-01-01T00:00:00.000Z", atualizadoEm: null, idiomaEstimado: "pt", capa: null }, markdown: "x\n", descricaoMeta: null, fotoDoAutorWix: foto, capaRemovidaDoCorpo: false, paraRevisar: [] });
    assert.deepEqual(sugestoesPelaDiretoria([post("pós-um", ID(1)), post("dois", ID(2)), post("tres", ID(3)), post("quatro", null)], validacao.imagens), [{ slugAntigo: "pós-um", slugNovo: "pos-um", cargos: ["presidente"] }]);
  });

  test("sugestão pela assinatura: só o nome completo de um profissional nos 3 últimos blocos antes das referências", () => {
    const profissionais = [
      { chave: "ana-ficticia", nome: "Ana Clara Fictícia" },
      { chave: "bruno-teste", nome: "Bruno Teste Exemplo" },
    ];
    const corpo = "Primeiro parágrafo.\n\nSegundo parágrafo.\n\nTerceiro parágrafo.\n\nQuarto parágrafo.";
    // Nome antes das referências (com acento e maiúsculas diferentes): conta.
    assert.equal(sugestaoPelaAssinatura(`${corpo}\n\nTexto por **ana clara ficticia**, fisioterapeuta.\n\n## Referências\n\n- Autor A. Estudo fictício.`, profissionais), "ana-ficticia");
    // Nome só dentro das referências: não conta.
    assert.equal(sugestaoPelaAssinatura(`${corpo}\n\n## Referências\n\n- Ana Clara Fictícia. Estudo fictício.`, profissionais), null);
    // Dois nomes diferentes no fim: não conta.
    assert.equal(sugestaoPelaAssinatura(`${corpo}\n\nAna Clara Fictícia e Bruno Teste Exemplo.`, profissionais), null);
    // Nome parcial: não conta.
    assert.equal(sugestaoPelaAssinatura(`${corpo}\n\nTexto de Ana Fictícia.`, profissionais), null);
    assert.equal(sugestaoPelaAssinatura(`${corpo}\n\nTexto de Ana Clara.`, profissionais), null);
    // Fora dos 3 últimos blocos: não conta.
    assert.equal(sugestaoPelaAssinatura(`Ana Clara Fictícia.\n\n${corpo}`, profissionais), null);
    // Dois profissionais com o mesmo nome: não conta.
    assert.equal(sugestaoPelaAssinatura(`${corpo}\n\nAna Clara Fictícia.`, [...profissionais, { chave: "outra-ana", nome: "Ana Clara Ficticia" }]), null);
    // Palavra inteira: "Ana Clara Fictíciaxyz" não casa.
    assert.equal(sugestaoPelaAssinatura(`${corpo}\n\nAna Clara Fictíciaxyz.`, profissionais), null);
  });

  test("sugestão pela assinatura só para post sem profissional pela foto", () => {
    const uso = (tipo: string, chave: string) => ({ tipo, chaveDeOrigem: chave, rotulo: chave, posicao: 1 });
    const validacao = validarImagensOrigem({ versao: 1, imagens: [{ midiaIdWix: ID(5), usos: [uso("profissional", "bruno-teste")] }, { midiaIdWix: ID(6), usos: [uso("pagina", "home")] }] });
    assert.ok(validacao.ok);
    const profissionais = [{ chave: "ana-ficticia", nome: "Ana Clara Fictícia" }];
    const post = (slug: string, foto: string | null): PostConvertido => ({ doMapa: { slug, titulo: "T", publicadoEm: "2024-01-01T00:00:00.000Z", atualizadoEm: null, idiomaEstimado: "pt", capa: null }, markdown: "Texto.\n\nAna Clara Fictícia\n", descricaoMeta: null, fotoDoAutorWix: foto, capaRemovidaDoCorpo: false, paraRevisar: [] });
    assert.deepEqual(
      sugestoesPelaAssinatura([post("sem-foto", null), post("foto-institucional", ID(6)), post("foto-de-profissional", ID(5))], validacao.imagens, profissionais).map((item) => [item.slugAntigo, item.chave]),
      [["sem-foto", "ana-ficticia"], ["foto-institucional", "ana-ficticia"]],
    );
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
