// Testes das regras puras da classificação dos posts importados, da leitura
// do arquivo de títulos dos artigos e dos filtros de categoria das listas
// públicas (npm run test:unidade). Só dados fictícios.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { CATEGORIAS_DOS_POSTS, CATEGORIA_GERAL, classificarPost, normalizar } from "../../src/lib/migracao/classificacaoRegras.ts";
import { lerTitulosDosArtigos, tituloProvisorioDaChave } from "../../src/lib/migracao/organizacaoArtigos.ts";
import { categoriaDoFiltro, categoriasComPublicados } from "../../src/lib/topicos.ts";

describe("Classificação dos posts: regras", () => {
  test("7 categorias neutras, com slugs únicos e a Geral por último na ordem", () => {
    const slugs = [...CATEGORIAS_DOS_POSTS.map((categoria) => categoria.slug), CATEGORIA_GERAL.slug];
    assert.equal(new Set(slugs).size, 7);
    assert.deepEqual([...CATEGORIAS_DOS_POSTS.map((categoria) => categoria.ordem), CATEGORIA_GERAL.ordem].sort(), [1, 2, 3, 4, 5, 6, 7]);
    assert.equal(CATEGORIA_GERAL.ordem, 7);
  });

  test("título vence o texto e segue a ordem de precedência", () => {
    assert.equal(classificarPost("Uso do colete com exercícios", "").slug, "colete-e-ortese", "colete antes de exercícios");
    assert.equal(classificarPost("Dor nas costas em adultos", "").slug, "escoliose-em-adultos", "adultos antes de dor nas costas");
    assert.equal(classificarPost("Reabilitação pós-artrodese com Schroth", "").slug, "exercicios-e-fisioterapia", "exercícios antes de cirurgia");
    assert.equal(classificarPost("Controle da dor após cirurgia", "").slug, "tratamentos-e-decisoes");
    assert.equal(classificarPost("Uma carta para os pais", "colete colete colete colete").slug, "adolescentes-e-familia");
  });

  test("sem acento, sem maiúsculas, palavra inteira ou início de palavra; espanhol", () => {
    assert.equal(normalizar("ÓRTESE e Diagnóstico"), "ortese e diagnostico");
    assert.equal(classificarPost("DIAGNÓSTICO PRECOCE", "").slug, "entendendo-a-escoliose");
    assert.equal(classificarPost("Importancia de los Ejercicios domiciliarios", "").slug, "exercicios-e-fisioterapia");
    assert.equal(classificarPost("Triage de Escoliosis Escolar", "").slug, "entendendo-a-escoliose");
    // "core" só como palavra inteira: "corrige" não conta.
    assert.notEqual(classificarPost("A coluna se corrige?", "").slug, "exercicios-e-fisioterapia");
    // "pais" só como palavra: "países" não conta.
    assert.notEqual(classificarPost("Escoliose em vários países", "").slug, "adolescentes-e-familia");
  });

  test("sem termo no título, a categoria com mais termos no texto (mínimo 3); sem nada, Geral", () => {
    const pelaTexto = classificarPost("Luz no fim", "O colete ajuda. O colete funciona. O colete e a órtese.");
    assert.equal(pelaTexto.slug, "colete-e-ortese");
    assert.match(pelaTexto.motivo, /^texto com 4 termos/);
    assert.deepEqual(classificarPost("Mãos atadas", "Um texto sem termo nenhum. Colete uma vez."), { slug: "geral", motivo: "nenhuma regra (título sem termo; texto com menos de 3 termos de uma categoria)" });
  });
});

describe("Organização dos artigos: arquivo de títulos", () => {
  test("lê título e autores; título vazio fica de fora; recusa e-mail, chave e tamanho", () => {
    const lido = lerTitulosDosArtigos({ artigos: { "artigo-1": { titulo: "  Título   fictício ", autores: "Pessoa Um" }, "artigo-2": { titulo: "" } } });
    assert.ok(lido.ok);
    assert.deepEqual(lido.artigos.get("artigo-1"), { titulo: "Título fictício", autores: "Pessoa Um" });
    assert.deepEqual(lido.artigos.get("artigo-2"), { titulo: "", autores: "" });
    assert.equal(lerTitulosDosArtigos({ artigos: { "artigo-1": { titulo: "x", autores: "a@b.c" } } }).ok, false);
    assert.equal(lerTitulosDosArtigos({ artigos: { artigo1: { titulo: "x" } } }).ok, false);
    assert.equal(lerTitulosDosArtigos({ artigos: { "artigo-1": { titulo: "x".repeat(301) } } }).ok, false);
    assert.equal(lerTitulosDosArtigos({}).ok, false);
  });

  test("título provisório pela chave", () => {
    assert.equal(tituloProvisorioDaChave("artigo-3"), "Título a confirmar (artigo 3)");
    assert.equal(tituloProvisorioDaChave("outro"), null);
  });
});

describe("Categorias nas listas públicas", () => {
  const categoria = (id: string, ativa = true, excluidoEm: Date | null = null) => ({ id, slug: `slug-${id}`, ativa, excluidoEm });

  test("só as ativas, fora da lixeira e com conteúdo publicado, na ordem de entrada", () => {
    const categorias = [categoria("a"), categoria("b"), categoria("c", false), categoria("d", true, new Date()), categoria("e")];
    const publicados = [{ categoria: "e" }, { categoria: "a" }, { categoria: "c" }, { categoria: "d" }, { categoria: "" }];
    assert.deepEqual(categoriasComPublicados(categorias, publicados).map((item) => item.id), ["a", "e"]);
  });

  test("filtro do /blog: slug conhecido escolhe; desconhecido ou ausente mostra todos", () => {
    const filtros = [categoria("a"), categoria("b")];
    assert.equal(categoriaDoFiltro(filtros, "slug-b")?.id, "b");
    assert.equal(categoriaDoFiltro(filtros, "outro"), null);
    assert.equal(categoriaDoFiltro(filtros, undefined), null);
  });
});
