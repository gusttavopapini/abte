// Testes do filtro da loja (npm run test:unidade): URL, filtragem, contagens
// facetadas, preço efetivo e ordenação. Produtos, categorias e preços abaixo
// são de exemplo, marcados como TESTE.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  FILTROS_VAZIOS,
  MENSAGEM_DE_PRECO,
  contarOpcoes,
  enderecoDaLoja,
  erroDaFaixaDePreco,
  filtrarItens,
  filtrosAtivos,
  lerFiltrosDaUrl,
  lerPrecoDoFiltro,
  montarFiltroDaLoja,
  ordenarItens,
  parametrosDosFiltros,
  passaNosFiltros,
  precoParaCampoDoFiltro,
  precoParaUrl,
  rotuloDoSelo,
  semFiltros,
  type FiltrosDaLoja,
  type ItemDoFiltro,
} from "../../src/lib/filtrosDaLoja.ts";

const CATEGORIAS = [
  { id: "c1", slug: "teste-livros", nome: "TESTE Livros" },
  { id: "c2", slug: "teste-jogos", nome: "TESTE Jogos" },
  { id: "c3", slug: "teste-vazia", nome: "TESTE Vazia" },
];

type Produto = Parameters<typeof montarFiltroDaLoja>[0][number];
const produto = (dados: Partial<Produto> & { id: string; nome: string }): Produto => ({
  categoria: "c1",
  tipo: "fisico",
  status: "disponivel",
  preco: 1000,
  precoPromocional: null,
  selo: "",
  ...dados,
});

// Na ordem da loja (relevância).
const PRODUTOS: Produto[] = [
  produto({ id: "p1", nome: "TESTE Cartilha Ação", preco: 60000, selo: "MONTE SEU KIT" }),
  produto({ id: "p2", nome: "TESTE Jogo de tabuleiro", categoria: "c2", status: "esgotado", preco: 22500 }),
  produto({ id: "p3", nome: "TESTE Ebook", tipo: "digital", preco: 990 }),
  produto({ id: "p4", nome: "TESTE Banner digital", tipo: "digital", preco: 4999, precoPromocional: 3999 }),
  produto({ id: "p5", nome: "TESTE Sem categoria", categoria: "", tipo: "digital", preco: 2990 }),
  produto({ id: "p6", nome: "TESTE Kit", preco: 35000, selo: "Monte seu kit" }),
];

const { itens, opcoes } = montarFiltroDaLoja(PRODUTOS, CATEGORIAS);
const filtros = (dados: Partial<FiltrosDaLoja>): FiltrosDaLoja => ({ ...FILTROS_VAZIOS, ...dados });
const ids = (lista: ItemDoFiltro[]) => lista.map((item) => item.id);

describe("Montagem do filtro", () => {
  test("categorias só com produto, na ordem recebida; produto sem categoria fica com null", () => {
    assert.deepEqual(opcoes.categorias, [
      { valor: "teste-livros", rotulo: "TESTE Livros" },
      { valor: "teste-jogos", rotulo: "TESTE Jogos" },
    ]);
    assert.equal(itens.find((item) => item.id === "p5")?.categoria, null);
  });

  test("um selo por texto, com o rótulo em caixa de frase", () => {
    assert.deepEqual(opcoes.selos, [{ valor: "monte-seu-kit", rotulo: "Monte seu kit" }]);
    assert.equal(rotuloDoSelo("MONTE SEU KIT"), "Monte seu kit");
    assert.equal(rotuloDoSelo("Novidade da ABTE"), "Novidade da ABTE");
    assert.equal(rotuloDoSelo("2026"), "2026");
  });

  test("faixa de preço em reais inteiros, pelo preço efetivo", () => {
    assert.deepEqual(opcoes.faixaDePreco, { minimo: 900, maximo: 60000 });
    assert.equal(montarFiltroDaLoja([], CATEGORIAS).opcoes.faixaDePreco, null);
  });
});

describe("Leitura da URL", () => {
  test("sem parâmetros: filtros vazios e ordem por relevância", () => {
    assert.deepEqual(lerFiltrosDaUrl({}, opcoes), FILTROS_VAZIOS);
    assert.deepEqual(lerFiltrosDaUrl(new URLSearchParams(""), opcoes), FILTROS_VAZIOS);
  });

  test("todos os parâmetros, com os repetidos", () => {
    const lidos = lerFiltrosDaUrl(
      new URLSearchParams("busca=+jogo++de+&categoria=teste-livros&categoria=teste-jogos&tipo=digital&disponibilidade=esgotado&preco_min=10&preco_max=39,99&promocao=1&selo=monte-seu-kit&ordem=menor-preco"),
      opcoes,
    );
    assert.deepEqual(lidos, {
      busca: "jogo de",
      categorias: ["teste-livros", "teste-jogos"],
      tipos: ["digital"],
      disponibilidades: ["esgotado"],
      precoMinimo: 1000,
      precoMaximo: 3999,
      promocao: true,
      selos: ["monte-seu-kit"],
      ordem: "menor-preco",
    });
  });

  test("objeto do Next.js (searchParams) com valor único ou lista", () => {
    const lidos = lerFiltrosDaUrl({ categoria: "teste-jogos", tipo: ["fisico", "digital"], preco_max: "100.50" }, opcoes);
    assert.deepEqual(lidos.categorias, ["teste-jogos"]);
    assert.deepEqual(lidos.tipos, ["fisico", "digital"]);
    assert.equal(lidos.precoMaximo, 10050);
  });

  test("valores inválidos ou desconhecidos viram vazio", () => {
    const lidos = lerFiltrosDaUrl(
      { categoria: ["inexistente", "teste-vazia", "teste-livros", "teste-livros"], tipo: "outro", disponibilidade: "talvez", preco_min: "-5", preco_max: "abc", promocao: "sim", selo: "outro-selo", ordem: "aleatoria" },
      opcoes,
    );
    assert.deepEqual(lidos, { ...FILTROS_VAZIOS, categorias: ["teste-livros"] });
  });

  test("preço do filtro: negativo, NaN, vazio e formato estranho são ignorados; zero vale", () => {
    for (const entrada of [undefined, "", " ", "-1", "NaN", "Infinity", "1e5", "10,999", "abc"]) assert.equal(lerPrecoDoFiltro(entrada), null, String(entrada));
    assert.equal(lerPrecoDoFiltro("0"), 0);
    assert.equal(lerPrecoDoFiltro("R$ 1.250,50"), 125050);
  });

  test("busca longa é cortada no limite", () => {
    assert.equal(lerFiltrosDaUrl({ busca: "a".repeat(300) }, opcoes).busca.length, 100);
  });

  test("categoria antiga (?categoria=slug) continua valendo", () => {
    assert.deepEqual(lerFiltrosDaUrl(new URLSearchParams("categoria=teste-jogos"), opcoes).categorias, ["teste-jogos"]);
  });
});

describe("Escrita da URL", () => {
  test("filtros vazios: /loja sem parâmetros", () => {
    assert.equal(enderecoDaLoja(FILTROS_VAZIOS), "/loja");
  });

  test("ordem fixa dos parâmetros, sem a ordem padrão", () => {
    const endereco = enderecoDaLoja(
      filtros({ ordem: "nome", selos: ["monte-seu-kit"], promocao: true, precoMaximo: 3999, precoMinimo: 1000, disponibilidades: ["disponivel"], tipos: ["fisico"], categorias: ["teste-livros", "teste-jogos"], busca: "jogo de" }),
    );
    assert.equal(endereco, "/loja?busca=jogo+de&categoria=teste-livros&categoria=teste-jogos&tipo=fisico&disponibilidade=disponivel&preco_min=10&preco_max=39.99&promocao=1&selo=monte-seu-kit&ordem=nome");
  });

  test("ida e volta: escrever e ler dá os mesmos filtros", () => {
    const casos = [
      filtros({ busca: "ação & cia", categorias: ["teste-jogos"], precoMinimo: 0 }),
      filtros({ tipos: ["digital", "fisico"], disponibilidades: ["esgotado"], precoMaximo: 4990, ordem: "maior-preco" }),
      filtros({ promocao: true, selos: ["monte-seu-kit"], ordem: "menor-preco" }),
    ];
    for (const caso of casos) assert.deepEqual(lerFiltrosDaUrl(parametrosDosFiltros(caso), opcoes), caso);
  });

  test("preço em reais na URL e no campo", () => {
    assert.equal(precoParaUrl(3000), "30");
    assert.equal(precoParaUrl(3999), "39.99");
    assert.equal(precoParaUrl(3990), "39.90");
    assert.equal(precoParaCampoDoFiltro(3990), "39,90");
    assert.equal(precoParaCampoDoFiltro(0), "0");
    assert.equal(precoParaCampoDoFiltro(null), "");
  });
});

describe("Filtragem", () => {
  test("sem filtro: todos, na ordem da loja", () => {
    assert.deepEqual(ids(filtrarItens(itens, FILTROS_VAZIOS)), ["p1", "p2", "p3", "p4", "p5", "p6"]);
  });

  test("busca sem acento e sem diferença de maiúsculas, todas as palavras", () => {
    assert.deepEqual(ids(filtrarItens(itens, filtros({ busca: "CARTILHA acao" }))), ["p1"]);
    assert.deepEqual(ids(filtrarItens(itens, filtros({ busca: "teste jogo" }))), ["p2"]);
    assert.deepEqual(ids(filtrarItens(itens, filtros({ busca: "nada parecido" }))), []);
  });

  test("categorias somam entre si; produto sem categoria sai quando há categoria marcada", () => {
    assert.deepEqual(ids(filtrarItens(itens, filtros({ categorias: ["teste-jogos"] }))), ["p2"]);
    assert.deepEqual(ids(filtrarItens(itens, filtros({ categorias: ["teste-livros", "teste-jogos"] }))), ["p1", "p2", "p3", "p4", "p6"]);
  });

  test("tipo e disponibilidade (inclusive esgotado)", () => {
    assert.deepEqual(ids(filtrarItens(itens, filtros({ tipos: ["digital"] }))), ["p3", "p4", "p5"]);
    assert.deepEqual(ids(filtrarItens(itens, filtros({ tipos: ["digital", "fisico"] }))).length, 6);
    assert.deepEqual(ids(filtrarItens(itens, filtros({ disponibilidades: ["esgotado"] }))), ["p2"]);
  });

  test("preço pelo valor efetivo (promocional quando houver), com os limites incluídos", () => {
    // p4 custa 49,99, mas sai por 39,99.
    assert.deepEqual(ids(filtrarItens(itens, filtros({ precoMinimo: 3999, precoMaximo: 3999 }))), ["p4"]);
    assert.deepEqual(ids(filtrarItens(itens, filtros({ precoMinimo: 4000, precoMaximo: 4999 }))), []);
    assert.deepEqual(ids(filtrarItens(itens, filtros({ precoMaximo: 2990 }))), ["p3", "p5"]);
    assert.deepEqual(ids(filtrarItens(itens, filtros({ precoMinimo: 35000 }))), ["p1", "p6"]);
  });

  test("mínimo maior que o máximo: mensagem e a faixa não é aplicada", () => {
    const invertido = filtros({ precoMinimo: 5000, precoMaximo: 1000 });
    assert.equal(erroDaFaixaDePreco(invertido), MENSAGEM_DE_PRECO);
    assert.equal(filtrarItens(itens, invertido).length, 6);
    assert.equal(erroDaFaixaDePreco(filtros({ precoMinimo: 1000, precoMaximo: 1000 })), null);
    assert.equal(erroDaFaixaDePreco(filtros({ precoMinimo: 1000 })), null);
  });

  test("ofertas: promoção e selo somam entre si", () => {
    assert.deepEqual(ids(filtrarItens(itens, filtros({ promocao: true }))), ["p4"]);
    assert.deepEqual(ids(filtrarItens(itens, filtros({ selos: ["monte-seu-kit"] }))), ["p1", "p6"]);
    assert.deepEqual(ids(filtrarItens(itens, filtros({ promocao: true, selos: ["monte-seu-kit"] }))), ["p1", "p4", "p6"]);
  });

  test("todos os grupos juntos valem ao mesmo tempo", () => {
    const todos = filtros({ busca: "teste", categorias: ["teste-livros"], tipos: ["fisico"], disponibilidades: ["disponivel"], precoMinimo: 30000, precoMaximo: 70000, selos: ["monte-seu-kit"] });
    assert.deepEqual(ids(filtrarItens(itens, todos)), ["p1", "p6"]);
    assert.deepEqual(ids(filtrarItens(itens, { ...todos, precoMaximo: 40000 })), ["p6"]);
    assert.deepEqual(ids(filtrarItens(itens, { ...todos, tipos: ["digital"] })), []);
  });

  test("ignorar um grupo deixa de aplicar só ele", () => {
    const item = itens.find((candidato) => candidato.id === "p2") as ItemDoFiltro;
    const f = filtros({ categorias: ["teste-livros"], disponibilidades: ["esgotado"] });
    assert.equal(passaNosFiltros(item, f), false);
    assert.equal(passaNosFiltros(item, f, "categoria"), true);
    assert.equal(passaNosFiltros(item, f, "disponibilidade"), false);
  });

  test("loja vazia: nada a filtrar nem contar", () => {
    assert.deepEqual(filtrarItens([], filtros({ busca: "x" })), []);
    const vazio = montarFiltroDaLoja([], CATEGORIAS);
    assert.deepEqual(contarOpcoes(vazio.itens, FILTROS_VAZIOS, vazio.opcoes), { categorias: {}, tipos: { fisico: 0, digital: 0 }, disponibilidades: { disponivel: 0, esgotado: 0 }, promocao: 0, selos: {} });
  });
});

describe("Contagens facetadas", () => {
  test("sem filtro: cada opção conta os seus produtos", () => {
    assert.deepEqual(contarOpcoes(itens, FILTROS_VAZIOS, opcoes), {
      categorias: { "teste-livros": 4, "teste-jogos": 1 },
      tipos: { fisico: 3, digital: 3 },
      disponibilidades: { disponivel: 5, esgotado: 1 },
      promocao: 1,
      selos: { "monte-seu-kit": 2 },
    });
  });

  test("o grupo da própria opção não conta; os outros grupos contam", () => {
    const contagens = contarOpcoes(itens, filtros({ tipos: ["digital"] }), opcoes);
    // Tipo continua mostrando os dois lados (o grupo é ignorado).
    assert.deepEqual(contagens.tipos, { fisico: 3, digital: 3 });
    // Os outros grupos só contam os digitais.
    assert.deepEqual(contagens.categorias, { "teste-livros": 2, "teste-jogos": 0 });
    assert.deepEqual(contagens.disponibilidades, { disponivel: 3, esgotado: 0 });
    assert.equal(contagens.promocao, 1);
    assert.deepEqual(contagens.selos, { "monte-seu-kit": 0 });
  });

  test("categoria marcada continua contando as outras categorias", () => {
    const contagens = contarOpcoes(itens, filtros({ categorias: ["teste-jogos"] }), opcoes);
    assert.deepEqual(contagens.categorias, { "teste-livros": 4, "teste-jogos": 1 });
    assert.deepEqual(contagens.tipos, { fisico: 1, digital: 0 });
  });

  test("busca e preço entram nas contagens de todos os grupos", () => {
    const contagens = contarOpcoes(itens, filtros({ busca: "kit", precoMaximo: 40000 }), opcoes);
    assert.deepEqual(contagens.categorias, { "teste-livros": 1, "teste-jogos": 0 });
    assert.deepEqual(contagens.selos, { "monte-seu-kit": 1 });
    assert.equal(contagens.promocao, 0);
  });

  test("faixa de preço invertida não muda as contagens", () => {
    assert.deepEqual(contarOpcoes(itens, filtros({ precoMinimo: 9000, precoMaximo: 100 }), opcoes), contarOpcoes(itens, FILTROS_VAZIOS, opcoes));
  });

  test("zero resultados: as opções dos outros grupos ficam com 0", () => {
    const contagens = contarOpcoes(itens, filtros({ busca: "nada parecido" }), opcoes);
    assert.deepEqual(contagens.tipos, { fisico: 0, digital: 0 });
    assert.equal(contagens.promocao, 0);
  });
});

describe("Ordenação", () => {
  test("relevância mantém a ordem da loja", () => {
    assert.deepEqual(ids(ordenarItens(itens, "relevancia")), ["p1", "p2", "p3", "p4", "p5", "p6"]);
  });

  test("menor e maior preço pelo preço efetivo", () => {
    assert.deepEqual(ids(ordenarItens(itens, "menor-preco")), ["p3", "p5", "p4", "p2", "p6", "p1"]);
    assert.deepEqual(ids(ordenarItens(itens, "maior-preco")), ["p1", "p6", "p2", "p4", "p5", "p3"]);
  });

  test("empate de preço fica na ordem da loja", () => {
    const empatados = montarFiltroDaLoja([produto({ id: "a", nome: "TESTE B", preco: 1000 }), produto({ id: "b", nome: "TESTE A", preco: 2000, precoPromocional: 1000 })], CATEGORIAS).itens;
    assert.deepEqual(ids(ordenarItens(empatados, "menor-preco")), ["a", "b"]);
    assert.deepEqual(ids(ordenarItens(empatados, "maior-preco")), ["a", "b"]);
  });

  test("nome de A a Z, sem diferença de acento e com números em ordem natural", () => {
    const nomes = montarFiltroDaLoja(
      [produto({ id: "x", nome: "50 cartilhas" }), produto({ id: "y", nome: "Ábaco" }), produto({ id: "z", nome: "30 cartilhas" }), produto({ id: "w", nome: "abelha" })],
      CATEGORIAS,
    ).itens;
    assert.deepEqual(ids(ordenarItens(nomes, "nome")), ["z", "x", "y", "w"]);
  });

  test("não altera a lista recebida", () => {
    const copia = [...itens];
    ordenarItens(itens, "nome");
    assert.deepEqual(itens, copia);
  });
});

describe("Etiquetas dos filtros ativos", () => {
  test("uma por filtro, com o preço numa etiqueta só", () => {
    const f = filtros({ busca: "kit", categorias: ["teste-jogos"], tipos: ["digital"], disponibilidades: ["esgotado"], precoMinimo: 1000, precoMaximo: 3999, promocao: true, selos: ["monte-seu-kit"], ordem: "nome" });
    const ativos = filtrosAtivos(f, opcoes);
    assert.deepEqual(
      ativos.map((ativo) => ativo.rotulo),
      ["Busca: kit", "Categoria: TESTE Jogos", "Tipo: Digital", "Esgotado", "Preço: de R$ 10 a R$ 39,99", "Em promoção", "Monte seu kit"],
    );
    // Cada etiqueta tira só o próprio filtro.
    assert.deepEqual(ativos[1].semEste.categorias, []);
    assert.equal(ativos[1].semEste.busca, "kit");
    assert.equal(ativos[4].semEste.precoMinimo, null);
    assert.equal(ativos[4].semEste.precoMaximo, null);
    assert.equal(ativos[0].semEste.ordem, "nome");
  });

  test("preço só com mínimo ou só com máximo", () => {
    assert.equal(filtrosAtivos(filtros({ precoMinimo: 2000 }), opcoes)[0].rotulo, "Preço: a partir de R$ 20");
    assert.equal(filtrosAtivos(filtros({ precoMaximo: 2050 }), opcoes)[0].rotulo, "Preço: até R$ 20,50");
  });

  test("sem filtro, nenhuma etiqueta; limpar mantém a ordem", () => {
    assert.deepEqual(filtrosAtivos(filtros({ ordem: "maior-preco" }), opcoes), []);
    assert.deepEqual(semFiltros(filtros({ busca: "x", promocao: true, ordem: "maior-preco" })), filtros({ ordem: "maior-preco" }));
  });
});
