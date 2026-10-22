// Testes da leitura das páginas de produto e da conversão da loja do site
// antigo (npm run test:unidade). Páginas e produtos fictícios, sem rede.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  caminhoDaPaginaAntiga,
  centavosDoTexto,
  converterProduto,
  juntarRedirecionamentos,
  lerProdutosColetados,
  lerProdutosDoMapa,
  redirecionamentosDaLoja,
  slugNovo,
  type ProdutoDoMapa,
} from "../../src/lib/migracao/produtos.ts";
import { lerPaginaDeProduto } from "../../src/lib/migracao/produtosColeta.ts";

function pagina(partes: { descricao?: string; ld?: unknown; wix?: unknown }) {
  return `<!doctype html><html><head>
    ${partes.ld ? `<script type="application/ld+json">${JSON.stringify(partes.ld)}</script>` : ""}
    ${partes.wix ? `<script type="application/json" id="dados">${JSON.stringify(partes.wix)}</script>` : ""}
    <script>window.naoDeveSerLido = 1</script>
  </head><body><div data-hook="product-page">${partes.descricao ?? ""}</div></body></html>`;
}

const PRODUTO_WIX = {
  urlPart: "kit-de-teste",
  options: [{ title: "Tamanho", selections: [{ description: "P" }, { value: "M" }] }],
  customTextFields: [{ title: "Nome para gravar", isMandatory: true }],
  price: 120,
  discountedPrice: 99.9,
  comparePrice: 0,
  isInStock: false,
  inventory: { status: "out_of_stock" },
  ribbon: "Novo",
  productType: "physical",
};

describe("Leitura da página de produto", () => {
  test("descrição do elemento data-hook, com parágrafos e quebras", () => {
    const html = pagina({
      descricao: `<pre data-hook="description"><p>Primeiro   parágrafo.</p><p>Segunda linha<br>continua <strong>aqui</strong>.</p><script>x()</script></pre>`,
      ld: { "@type": "Product", description: "Do ld+json" },
    });
    const lido = lerPaginaDeProduto(html, "kit-de-teste");
    assert.equal(lido.descricao, "Primeiro parágrafo.\n\nSegunda linha\ncontinua aqui.");
    assert.equal(lido.fonteDaDescricao, "elemento");
    assert.deepEqual(lido.achados, { descricaoNoElemento: true, ldJsonProduto: true, dadosDoWix: false });
  });

  test("sem o elemento, usa a descrição do ld+json; sem nada, null", () => {
    assert.equal(lerPaginaDeProduto(pagina({ ld: [{ "@type": "Organization" }, { "@type": "Product", description: " Texto do ld " }] }), "x").descricao, "Texto do ld");
    const vazio = lerPaginaDeProduto(pagina({}), "x");
    assert.equal(vazio.descricao, null);
    assert.equal(vazio.fonteDaDescricao, null);
  });

  test("opções, campos de texto, preços, estoque e selo do objeto do produto (pelo slug)", () => {
    const outro = { ...PRODUTO_WIX, urlPart: "outro-produto", price: 1 };
    const lido = lerPaginaDeProduto(pagina({ wix: { pagina: { relacionados: [outro], atual: { produto: PRODUTO_WIX } } } }), "kit-de-teste");
    assert.deepEqual(lido.opcoes, [{ titulo: "Tamanho", valores: ["P", "M"] }]);
    assert.deepEqual(lido.camposDeTexto, [{ titulo: "Nome para gravar", obrigatorio: true }]);
    assert.deepEqual([lido.precoNaPagina, lido.precoComDescontoNaPagina, lido.emEstoqueNaPagina, lido.estoqueNaPagina, lido.seloNaPagina, lido.tipoNaPagina], [120, 99.9, false, "out_of_stock", "Novo", "physical"]);
  });

  test("slug com acento casa com o urlPart codificado", () => {
    const lido = lerPaginaDeProduto(pagina({ wix: { produto: { ...PRODUTO_WIX, urlPart: encodeURIComponent("pré-ao-pós") } } }), "pré-ao-pós");
    assert.equal(lido.achados.dadosDoWix, true);
  });

  test("JSON quebrado na página não derruba a leitura", () => {
    const html = `<html><body><script type="application/json">{quebrado</script><div data-hook="description">Ok</div></body></html>`;
    assert.equal(lerPaginaDeProduto(html, "x").descricao, "Ok");
  });
});

const produto = (extra: Partial<ProdutoDoMapa> = {}): ProdutoDoMapa => ({
  slug: "kit-pré-teste",
  nome: "Kit de Teste",
  descricao: "Descrição aproximada do mapa.",
  preco: 200,
  precoRiscado: "R$ 300,00",
  estoque: "disponivel",
  digital: false,
  categorias: ["loja", "abte"],
  temOpcoes: [],
  ...extra,
});
const CATEGORIAS = new Map([
  ["abte", "idAbte"],
  ["produtos-parceiros", "idParceiros"],
]);

describe("Mapa, preços e conversão", () => {
  test("lê produtos e categorias do mapa; recusa preço inválido e slug repetido", () => {
    const linhas = [
      JSON.stringify({ tipo: "produto", slug: "a", nome: "A", descricao: "", preco: 9.9, precoRiscado: null, estoque: "disponivel", digital: true, categorias: ["loja"], temOpcoes: [] }),
      JSON.stringify({ tipo: "categoria", url: "/category/abte", titulo: "Produtos ABTE | ABTE" }),
      JSON.stringify({ tipo: "categoria", url: "/blogtratandoescoliose", titulo: "Blog" }),
    ];
    const lido = lerProdutosDoMapa(linhas.join("\n"));
    assert.ok(lido.ok);
    assert.equal(lido.produtos[0].preco, 9.9);
    assert.deepEqual(lido.categorias, [{ slug: "abte", nome: "Produtos ABTE" }]);
    assert.equal(lerProdutosDoMapa(linhas[0].replace('"preco":9.9', '"preco":0')).ok, false);
    assert.equal(lerProdutosDoMapa(`${linhas[0]}\n${linhas[0]}`).ok, false);
  });

  test("preço em texto para centavos", () => {
    assert.deepEqual([centavosDoTexto("R$ 600,00"), centavosDoTexto("R$ 1.250,90"), centavosDoTexto("R$ 49,99"), centavosDoTexto("seiscentos")], [60000, 125090, 4999, null]);
  });

  test("preço riscado vira preco e o atual vira precoPromocional; sem riscado, só preco", () => {
    const comRiscado = converterProduto(produto(), 1, undefined, CATEGORIAS, []);
    assert.deepEqual([comRiscado.dados.preco, comRiscado.dados.precoPromocional, comRiscado.temPrecoRiscado], [30000, 20000, true]);
    const semRiscado = converterProduto(produto({ precoRiscado: null, preco: 9.9 }), 1, undefined, CATEGORIAS, []);
    assert.deepEqual([semRiscado.dados.preco, semRiscado.dados.precoPromocional, semRiscado.temPrecoRiscado], [990, null, false]);
    const riscadoMenor = converterProduto(produto({ precoRiscado: "R$ 100,00" }), 1, undefined, CATEGORIAS, []);
    assert.deepEqual([riscadoMenor.dados.preco, riscadoMenor.dados.precoPromocional], [20000, null]);
    assert.ok(riscadoMenor.problemas.includes("precoRiscadoInvalido"));
  });

  test("categoria só abte ou produtos-parceiros; só loja fica sem categoria", () => {
    assert.equal(converterProduto(produto(), 1, undefined, CATEGORIAS, []).dados.categoria, "idAbte");
    assert.equal(converterProduto(produto({ categorias: ["loja", "produtos-parceiros"] }), 1, undefined, CATEGORIAS, []).dados.categoria, "idParceiros");
    const soLoja = converterProduto(produto({ categorias: ["loja"] }), 1, undefined, CATEGORIAS, []);
    assert.equal(soLoja.dados.categoria, "");
    assert.ok(soLoja.problemas.includes("semCategoria"));
  });

  test("publicado false, tipo, situação, ordem e galeria na ordem (pendentes saem e marcam)", () => {
    const { dados, problemas } = converterProduto(produto({ digital: true, estoque: "esgotado" }), 4, undefined, CATEGORIAS, [
      { midiaIdWix: "a", midiaId: "m1" },
      { midiaIdWix: "b", midiaId: null },
      { midiaIdWix: "c", midiaId: "m3" },
    ]);
    assert.deepEqual([dados.publicado, dados.tipo, dados.status, dados.ordem, dados.selo], [false, "digital", "esgotado", 4, ""]);
    assert.deepEqual(dados.imagens, [
      { midiaId: "m1", ordem: 0 },
      { midiaId: "m3", ordem: 1 },
    ]);
    assert.ok(problemas.includes("imagemPendente"));
  });

  test("descrição: a lida na página; sem ela, a do mapa, marcada", () => {
    assert.equal(converterProduto(produto(), 1, { slug: "kit-pré-teste", descricao: "Lida na página." }, CATEGORIAS, []).dados.descricao, "Lida na página.");
    const doMapa = converterProduto(produto(), 1, undefined, CATEGORIAS, []);
    assert.equal(doMapa.dados.descricao, "Descrição aproximada do mapa.");
    assert.ok(doMapa.problemas.includes("descricaoDoMapa"));
  });

  test("diferenças com a página só no relatório: preço, tipo, estoque, opções e selo", () => {
    const { diferencas, dados } = converterProduto(produto(), 1, {
      slug: "kit-pré-teste",
      descricao: "x",
      precoNaPagina: 350,
      precoComDescontoNaPagina: 350,
      emEstoqueNaPagina: false,
      tipoNaPagina: "digital",
      opcoes: [{ titulo: "Cor", valores: ["Azul"] }],
      camposDeTexto: [],
      seloNaPagina: "Novo",
    }, CATEGORIAS, []);
    assert.deepEqual(diferencas.sort(), ["estoqueDiferente", "precoDiferente", "temOpcoes", "temSelo", "tipoDiferente"]);
    assert.equal(dados.preco, 30000, "o mapa vale");
    const igual = converterProduto(produto(), 1, { slug: "kit-pré-teste", descricao: "x", precoNaPagina: 300, precoComDescontoNaPagina: 200, emEstoqueNaPagina: true, tipoNaPagina: "physical", opcoes: [], camposDeTexto: [], seloNaPagina: null }, CATEGORIAS, []);
    assert.deepEqual(igual.diferencas, []);
  });

  test("arquivo da coleta: versão e lista", () => {
    assert.equal(lerProdutosColetados({ versao: 2, produtos: [] }).ok, false);
    const lido = lerProdutosColetados({ versao: 1, produtos: [{ slug: "a", descricao: "x" }] });
    assert.ok(lido.ok);
    assert.equal(lido.porSlug.get("a")?.descricao, "x");
  });
});

describe("Slugs e redirecionamentos", () => {
  test("slug novo sem acento; caminho antigo codificado", () => {
    assert.equal(slugNovo("kit-30-cartilhas-do-pré-ao-pós-cirúrgico"), "kit-30-cartilhas-do-pre-ao-pos-cirurgico");
    assert.equal(caminhoDaPaginaAntiga("pré"), "/product-page/pr%C3%A9");
  });

  test("redirecionamentos: produto com acento nas duas formas, categorias e listagens", () => {
    const lista = redirecionamentosDaLoja([{ slugAntigo: "kit-pré", slugNovo: "kit-pre" }, { slugAntigo: "kit-abte", slugNovo: "kit-abte" }], [{ slugAntigo: "abte", slugNovo: "produtos-abte" }]);
    assert.deepEqual(
      lista.map((item) => `${item.de} -> ${item.para}`),
      [
        "/product-page/kit-pré -> /loja/produto/kit-pre",
        "/product-page/kit-pr%C3%A9 -> /loja/produto/kit-pre",
        "/product-page/kit-abte -> /loja/produto/kit-abte",
        "/category/abte -> /loja?categoria=produtos-abte",
        "/category/loja -> /loja",
        "/category/all-products -> /loja",
      ],
    );
  });

  test("a tabela junta com a existente, nunca ativada", () => {
    const antes = { entradas: [{ de: "/post/a", para: "/blog/a", tipo: "post" }, { de: "/category/loja", para: "/velho", tipo: "categoria" }] };
    const tabela = juntarRedirecionamentos(antes, [{ de: "/category/loja", para: "/loja", tipo: "categoria" }], "2026-10-22T00:00:00Z");
    assert.equal(tabela.ativo, false);
    assert.deepEqual(tabela.entradas.map((item) => `${item.de} -> ${item.para}`), ["/category/loja -> /loja", "/post/a -> /blog/a"]);
  });
});
