// Testes das regras dos produtos da loja (npm run test:unidade).
// Preços e nomes abaixo são de exemplo, marcados como TESTE.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { LIMITE_DE_IMAGENS_DO_PRODUTO, LIMITE_DE_PRODUTOS_EM_DESTAQUE, escolherProdutosEmDestaque, escolherRelacionados, formatarPreco, idsEmOrdem, imagemPrincipal, lerImagensDoProduto, lerPrecoEmCentavos, precoAtual, precoParaCampo, validarProduto } from "../../src/lib/produtos.ts";

describe("Preço digitado", () => {
  test("formatos brasileiros viram centavos", () => {
    const casos: [string, number][] = [["25", 2500], ["25,9", 2590], ["25,90", 2590], ["1.250,00", 125000], ["R$ 1.250,5", 125050], ["25.90", 2590], ["1.25", 125], ["0,01", 1]];
    for (const [entrada, esperado] of casos) assert.equal(lerPrecoEmCentavos(entrada), esperado, entrada);
  });

  test("vazio é undefined e formato estranho é null", () => {
    assert.equal(lerPrecoEmCentavos("  "), undefined);
    for (const entrada of ["25,999", "1,250.00", "abc", "-5", "12,3,4", "1.2345"]) assert.equal(lerPrecoEmCentavos(entrada), null, entrada);
  });

  test("formatação para a tela e para o campo", () => {
    assert.equal(formatarPreco(125050).replace(/\s/g, " "), "R$ 1.250,50");
    assert.equal(precoParaCampo(2590), "25,90");
    assert.equal(precoParaCampo(null), "");
    assert.equal(precoAtual({ preco: 3000, precoPromocional: 2500 }), 2500);
    assert.equal(precoAtual({ preco: 3000, precoPromocional: null }), 3000);
  });
});

function formulario(campos: Record<string, string>) {
  const dados = new FormData();
  for (const [campo, valor] of Object.entries(campos)) dados.set(campo, valor);
  return dados;
}
const BASE = { nome: "TESTE Produto", preco: "30,00", categoria: "cat1", tipo: "fisico", status: "disponivel", publicado: "sim" };

describe("Cadastro de produto", () => {
  test("dados válidos", () => {
    const resultado = validarProduto(formulario({ ...BASE, precoPromocional: "25", selo: "TESTE selo", ordem: "2" }));
    assert.equal(resultado.ok, true);
    if (!resultado.ok) return;
    assert.equal(resultado.dados.preco, 3000);
    assert.equal(resultado.dados.precoPromocional, 2500);
    assert.equal(resultado.dados.publicado, true);
    assert.equal(resultado.dados.ordem, 2);
  });

  test("promocional precisa ser menor que o preço normal", () => {
    for (const promocional of ["30,00", "35", "0"]) {
      const resultado = validarProduto(formulario({ ...BASE, precoPromocional: promocional }));
      assert.equal(resultado.ok, false, promocional);
      if (!resultado.ok) assert.match(resultado.erros.precoPromocional ?? "", /menor que o preço normal/);
    }
  });

  test("exige nome, preço, categoria, tipo e status válidos", () => {
    const resultado = validarProduto(formulario({ nome: "", preco: "", categoria: "a/b", tipo: "x", status: "y" }));
    assert.equal(resultado.ok, false);
    if (resultado.ok) return;
    assert.ok(resultado.erros.nome && resultado.erros.preco && resultado.erros.categoria && resultado.erros.tipo && resultado.erros.status);
  });

  test("preço zero ou acima do máximo é recusado", () => {
    for (const preco of ["0", "100.000,01"]) assert.equal(validarProduto(formulario({ ...BASE, preco })).ok, false, preco);
    assert.equal(validarProduto(formulario({ ...BASE, preco: "100.000,00" })).ok, true);
  });

  test("sem a caixa marcada, não é publicado", () => {
    const resultado = validarProduto(formulario({ ...BASE, publicado: "" }));
    assert.ok(resultado.ok && resultado.dados.publicado === false);
  });
});

describe("Produtos relacionados", () => {
  const lista = [
    { id: "a", categoria: "1" }, { id: "b", categoria: "2" }, { id: "c", categoria: "1" },
    { id: "d", categoria: "1" }, { id: "e", categoria: "1" },
  ];
  test("mesma categoria, sem o próprio, na ordem da lista, até 3", () => {
    assert.deepEqual(escolherRelacionados(lista[0], lista).map((p) => p.id), ["c", "d", "e"]);
    assert.deepEqual(escolherRelacionados(lista[1], lista), []);
    assert.deepEqual(escolherRelacionados(lista[2], lista, 2).map((p) => p.id), ["a", "d"]);
  });
});

describe("Galeria do produto", () => {
  test("ids na ordem da tela viram imagens com ordem; vazio é galeria vazia", () => {
    assert.deepEqual(lerImagensDoProduto(["b", "a", "c"]), { ok: true, imagens: [{ midiaId: "b", ordem: 0 }, { midiaId: "a", ordem: 1 }, { midiaId: "c", ordem: 2 }] });
    assert.deepEqual(lerImagensDoProduto([]), { ok: true, imagens: [] });
    assert.deepEqual(lerImagensDoProduto(["", " "]), { ok: true, imagens: [] });
  });

  test("recusa repetida, inválida e acima do limite de 8", () => {
    assert.equal(LIMITE_DE_IMAGENS_DO_PRODUTO, 8);
    assert.match((lerImagensDoProduto(["a", "b", "a"]) as { erro: string }).erro, /duas vezes/);
    assert.match((lerImagensDoProduto(["a", "publico/midias/x"]) as { erro: string }).erro, /inválida/);
    const nove = Array.from({ length: 9 }, (_, i) => `img${i}`);
    assert.match((lerImagensDoProduto(nove) as { erro: string }).erro, /no máximo 8/);
    assert.equal(lerImagensDoProduto(nove.slice(0, 8)).ok, true);
  });

  test("o formulário do produto leva a galeria e mostra o erro no campo", () => {
    const dados = formulario({ ...BASE });
    dados.append("imagens", "x1");
    dados.append("imagens", "x2");
    const resultado = validarProduto(dados);
    assert.equal(resultado.ok, true);
    if (resultado.ok) assert.deepEqual(resultado.dados.imagens, [{ midiaId: "x1", ordem: 0 }, { midiaId: "x2", ordem: 1 }]);
    dados.append("imagens", "x1");
    const repetida = validarProduto(dados);
    assert.equal(repetida.ok, false);
    if (!repetida.ok) assert.match(repetida.erros.imagens ?? "", /duas vezes/);
  });

  test("a principal é a primeira disponível pela ordem", () => {
    const imagens = [{ midiaId: "c", ordem: 2 }, { midiaId: "a", ordem: 0 }, { midiaId: "b", ordem: 1 }];
    assert.deepEqual(idsEmOrdem(imagens), ["a", "b", "c"]);
    assert.equal(imagemPrincipal(imagens, new Map([["a", "A"], ["b", "B"]])), "A");
    assert.equal(imagemPrincipal(imagens, new Map([["b", "B"], ["c", "C"]])), "B", "a primeira foi para a lixeira");
    assert.equal(imagemPrincipal(imagens, new Map()), null);
  });
});

describe("Produtos em destaque na home", () => {
  type Base = { selo: string; status: "disponivel" | "esgotado"; publicado: boolean; excluidoEm: Date | null; imagens: { midiaId: string; ordem: number }[] };
  const base: Base = { selo: "", status: "disponivel", publicado: true, excluidoEm: null, imagens: [{ midiaId: "m", ordem: 0 }] };
  const comImagem = (imagens: { midiaId: string }[]) => imagens.some((imagem) => imagem.midiaId !== "sem");
  const p = (id: string, ordem: number, extra: Partial<Base> = {}) => ({ ...base, id, nome: `Produto ${id}`, ordem, ...extra });

  test("com selo primeiro, depois a ordem da loja, até 4", () => {
    const lista = [p("a", 1), p("b", 2), p("c", 3, { selo: "MONTE SEU KIT" }), p("d", 4), p("e", 5), p("f", 6, { selo: "NOVO" })];
    assert.deepEqual(escolherProdutosEmDestaque(lista, comImagem).map((x) => x.id), ["c", "f", "a", "b"]);
  });

  test("a ordem da entrada não muda o resultado; empate na ordem vai pelo nome", () => {
    const lista = [p("b", 1), p("a", 1), p("c", 0)];
    assert.deepEqual(escolherProdutosEmDestaque([...lista].reverse(), comImagem).map((x) => x.id), ["c", "a", "b"]);
    assert.deepEqual(escolherProdutosEmDestaque(lista, comImagem).map((x) => x.id), ["c", "a", "b"]);
  });

  test("só disponíveis e publicados; exclui lixeira e produto sem imagem ativa", () => {
    const lista = [
      p("esgotado", 1, { selo: "SELO", status: "esgotado" }),
      p("rascunho", 2, { publicado: false }),
      p("lixeira", 3, { excluidoEm: new Date(0) }),
      p("semImagem", 4, { imagens: [] }),
      p("imagemNaLixeira", 5, { imagens: [{ midiaId: "sem", ordem: 0 }] }),
      p("ok", 6),
      p("seloEmBranco", 7, { selo: "   " }),
    ];
    assert.deepEqual(escolherProdutosEmDestaque(lista, comImagem).map((x) => x.id), ["ok", "seloEmBranco"]);
  });

  test("menos de 4 mostra os que houver; zero produtos dá lista vazia", () => {
    assert.deepEqual(escolherProdutosEmDestaque([p("a", 1)], comImagem).map((x) => x.id), ["a"]);
    assert.deepEqual(escolherProdutosEmDestaque([], comImagem), []);
    assert.deepEqual(escolherProdutosEmDestaque([p("a", 1, { status: "esgotado" })], comImagem), []);
    assert.equal(LIMITE_DE_PRODUTOS_EM_DESTAQUE, 4);
  });
});
