// Regras comuns das ações de conteúdo do painel (04/11/2026): permissões por
// papel, situação de cada item, confirmação reforçada e mensagens.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { decidirAcessoAoPainel, papelPodeExecutar } from "../../src/lib/auth/papeis.ts";
import {
  LIMITE_DO_LOTE,
  ehAcaoEmLote,
  lerIdsDoLote,
  resumoDoLote,
  COLECOES_DO_PAINEL,
  confirmacaoDeExclusaoValida,
  ehColecaoDoPainel,
  mensagemDeUso,
  nomeDoItem,
  resumoDaAcao,
  situacaoDoItem,
} from "../../src/lib/lixeira.ts";

describe("Permissões das ações de conteúdo", () => {
  test("editor cria, edita, duplica, publica, move para a lixeira e restaura, mas não exclui de vez", () => {
    for (const acao of ["conteudo.editar", "conteudo.publicar", "conteudo.excluir", "conteudo.restaurar", "registro.ver"] as const) {
      assert.equal(papelPodeExecutar("editor", acao), true, acao);
    }
    assert.equal(papelPodeExecutar("editor", "conteudo.excluirDeVez"), false);
    assert.deepEqual(decidirAcessoAoPainel({ papel: "editor" }, "conteudo.excluirDeVez"), { permitido: false, motivo: "sem-permissao" });
  });

  test("administrador faz tudo, inclusive excluir de vez", () => {
    for (const acao of ["conteudo.editar", "conteudo.publicar", "conteudo.excluir", "conteudo.restaurar", "conteudo.excluirDeVez", "registro.ver"] as const) {
      assert.equal(papelPodeExecutar("administrador", acao), true, acao);
    }
  });

  test("sem papel, nenhuma ação de conteúdo", () => {
    assert.deepEqual(decidirAcessoAoPainel({}, "conteudo.editar"), { permitido: false, motivo: "sem-papel" });
    assert.deepEqual(decidirAcessoAoPainel(null, "conteudo.excluir"), { permitido: false, motivo: "sem-sessao" });
  });
});

describe("Situação dos itens", () => {
  test("lixeira vale antes de tudo", () => {
    assert.equal(situacaoDoItem("posts", { status: "publicado", excluidoEm: new Date() }), "lixeira");
    assert.equal(situacaoDoItem("tagsDePosts", { excluidoEm: new Date() }), "lixeira");
  });

  test("cada coleção pelo próprio campo", () => {
    assert.equal(situacaoDoItem("posts", { status: "publicado" }), "publicado");
    assert.equal(situacaoDoItem("artigos", { status: "rascunho" }), "rascunho");
    assert.equal(situacaoDoItem("profissionais", { ativo: true }), "publicado");
    assert.equal(situacaoDoItem("profissionais", { ativo: false }), "rascunho");
    assert.equal(situacaoDoItem("produtos", { publicado: false }), "rascunho");
    // Categoria sem o campo ativa vale como ativa.
    assert.equal(situacaoDoItem("categoriasDePosts", {}), "publicado");
    assert.equal(situacaoDoItem("categoriasDeArtigos", { ativa: false }), "rascunho");
    // Sem campo de situação: fora da lixeira, aparece no site.
    assert.equal(situacaoDoItem("categoriasDeProdutos", {}), "publicado");
  });

  test("só posts e artigos viram rascunho na lixeira; tags e categorias da loja sem publicação", () => {
    const comRascunho = Object.entries(COLECOES_DO_PAINEL).filter(([, configuracao]) => configuracao.rascunhoNaLixeira).map(([colecao]) => colecao);
    assert.deepEqual(comRascunho, ["posts", "artigos"]);
    const semSituacao = Object.entries(COLECOES_DO_PAINEL).filter(([, configuracao]) => !configuracao.situacao).map(([colecao]) => colecao);
    assert.deepEqual(semSituacao, ["tagsDePosts", "tagsDeArtigos", "categoriasDeProdutos"]);
  });

  test("nome do item e coleção conhecida", () => {
    assert.equal(nomeDoItem("posts", { titulo: "  Exemplo  " }), "Exemplo");
    assert.equal(nomeDoItem("produtos", { nome: "" }), "Sem título");
    assert.equal(ehColecaoDoPainel("posts"), true);
    assert.equal(ehColecaoDoPainel("midias"), false);
    assert.equal(ehColecaoDoPainel("__proto__"), false);
  });
});

describe("Confirmação reforçada", () => {
  test("aceita EXCLUIR ou o nome, sem diferença de maiúsculas e espaços", () => {
    assert.equal(confirmacaoDeExclusaoValida("EXCLUIR", "Post exemplo"), true);
    assert.equal(confirmacaoDeExclusaoValida(" excluir ", "Post exemplo"), true);
    assert.equal(confirmacaoDeExclusaoValida("post   EXEMPLO", "Post exemplo"), true);
  });

  test("recusa vazio, parcial, outro tipo e nome vazio", () => {
    assert.equal(confirmacaoDeExclusaoValida("", "Post exemplo"), false);
    assert.equal(confirmacaoDeExclusaoValida("EXCLU", "Post exemplo"), false);
    assert.equal(confirmacaoDeExclusaoValida("Post", "Post exemplo"), false);
    assert.equal(confirmacaoDeExclusaoValida(null, "Post exemplo"), false);
    assert.equal(confirmacaoDeExclusaoValida("   ", ""), false);
  });
});

describe("Mensagens", () => {
  test("uso que impede a exclusão, em português, com exemplos", () => {
    const mensagem = mensagemDeUso([{ onde: "post(s)", quantidade: 3, exemplos: ["A", "B"] }]);
    assert.equal(mensagem, 'Não é possível excluir de vez: está em uso em 3 post(s) (ex.: "A", "B"). Tire o vínculo nesses itens antes, inclusive nos que estão na lixeira.');
  });

  test("resumo do registro sem o nome, com o gênero certo e sem travessão", () => {
    assert.equal(resumoDaAcao("posts", "lixeira"), "Post movido para a lixeira.");
    assert.equal(resumoDaAcao("categoriasDePosts", "lixeira"), "Categoria movida para a lixeira.");
    assert.equal(resumoDaAcao("tagsDeArtigos", "excluirDeVez"), "Tag excluída de vez.");
    assert.equal(resumoDaAcao("profissionais", "ligar"), "Profissional ativado.");
    assert.equal(resumoDaAcao("categoriasDeArtigos", "desligar"), "Categoria desativada.");
    assert.equal(resumoDaAcao("produtos", "desligar"), "Produto despublicado.");
    for (const colecao of Object.keys(COLECOES_DO_PAINEL)) {
      for (const acao of ["lixeira", "restaurar", "excluirDeVez", "ligar", "desligar"] as const) {
        assert.ok(!resumoDaAcao(colecao as keyof typeof COLECOES_DO_PAINEL, acao).includes("—"));
      }
    }
  });
});

describe("Ações em lote", () => {
  const ehId = (id: unknown): id is string => typeof id === "string" && /^[A-Za-z0-9]{1,30}$/.test(id);

  test("só as três ações e uma seleção válida", () => {
    assert.equal(ehAcaoEmLote("lixeira"), true);
    assert.equal(ehAcaoEmLote("excluirDeVez"), false, "excluir de vez nunca é em lote");
    assert.deepEqual(lerIdsDoLote(["a", "b", "a"], ehId), ["a", "b"]);
    assert.equal(lerIdsDoLote([], ehId), null);
    assert.equal(lerIdsDoLote(["a", "../x"], ehId), null);
    assert.equal(lerIdsDoLote("a", ehId), null);
    assert.equal(lerIdsDoLote(Array.from({ length: LIMITE_DO_LOTE + 1 }, (_, i) => `id${i}`), ehId), null);
  });

  test("resumo em português, com plural e gênero, sem nomes", () => {
    assert.equal(resumoDoLote("posts", "lixeira", { feitos: ["A", "B", "C"], semMudanca: [], falhas: [] }), "3 posts foram para a lixeira.");
    assert.equal(resumoDoLote("posts", "despublicar", { feitos: ["A"], semMudanca: ["B"], falhas: [] }), "1 post foi despublicado. 1 já estava assim.");
    assert.equal(resumoDoLote("profissionais", "despublicar", { feitos: ["A", "B"], semMudanca: [], falhas: [] }), "2 profissionais foram desativados.");
    assert.equal(resumoDoLote("produtos", "restaurar", { feitos: ["A"], semMudanca: [], falhas: [{ nome: "B", motivo: "x" }] }), "1 produto foi restaurado. 1 não pôde ser alterado; veja o motivo abaixo.");
    assert.equal(resumoDoLote("artigos", "lixeira", { feitos: [], semMudanca: [], falhas: [] }), "Nada foi alterado.");
  });
});
