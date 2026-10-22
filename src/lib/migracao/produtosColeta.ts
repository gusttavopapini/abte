// Leitura da página de produto do site antigo (etapa 6, degrau 3), pura: recebe
// o HTML já baixado e devolve só o que interessa à migração. Usa o parse5
// (devDependency, só nos scripts de coleta) para não depender de expressões
// regulares sobre HTML. Nada aqui baixa, segue links nem executa conteúdo da
// página. Testado em testes/unidade/migracao-produtos.test.mts.
//
// Fontes, conferidas na página de um produto em 22/10/2026:
// - descrição: o elemento data-hook="description" (texto, com parágrafos);
//   se faltar, a descrição do ld+json do tipo Product;
// - opções (variações), campos de texto do cliente, preço e estoque: o objeto
//   do produto nos dados JSON que o Wix põe na página (só como referência).
import { parse } from "parse5";

type No = { nodeName: string; tagName?: string; attrs?: { name: string; value: string }[]; childNodes?: No[]; value?: string; content?: No };

// Elementos que separam blocos de texto (viram quebra de parágrafo).
const BLOCOS = new Set(["p", "div", "li", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "blockquote", "section", "article", "tr"]);

function atributo(no: No, nome: string): string | null {
  return no.attrs?.find((item) => item.name === nome)?.value ?? null;
}

function* percorrer(no: No): Generator<No> {
  yield no;
  for (const filho of no.childNodes ?? []) yield* percorrer(filho);
  if (no.content) yield* percorrer(no.content);
}

function textoCru(no: No): string {
  if (no.nodeName === "#text") return no.value ?? "";
  return (no.childNodes ?? []).map(textoCru).join("");
}

// Texto simples com parágrafos: blocos e <br> viram quebras; espaços repetidos
// somem; parágrafos separados por uma linha em branco. Scripts e estilos saem.
export function textoComParagrafos(no: No): string {
  const partes: string[] = [];
  const visitar = (atual: No) => {
    if (atual.nodeName === "#text") {
      partes.push((atual.value ?? "").replace(/\s+/g, " "));
      return;
    }
    const tag = atual.tagName ?? "";
    if (tag === "script" || tag === "style" || tag === "template") return;
    if (tag === "br") {
      partes.push("\n");
      return;
    }
    if (BLOCOS.has(tag)) partes.push("\n\n");
    for (const filho of atual.childNodes ?? []) visitar(filho);
    if (BLOCOS.has(tag)) partes.push("\n\n");
  };
  visitar(no);
  return partes
    .join("")
    .split("\n")
    .map((linha) => linha.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type OpcaoDoProduto = { titulo: string; valores: string[] };

export type ProdutoLido = {
  achados: { descricaoNoElemento: boolean; ldJsonProduto: boolean; dadosDoWix: boolean };
  descricao: string | null;
  fonteDaDescricao: "elemento" | "ldJson" | null;
  // Do objeto do produto nos dados do Wix (referência; null se não achado).
  opcoes: OpcaoDoProduto[] | null;
  camposDeTexto: { titulo: string; obrigatorio: boolean }[] | null;
  // Preço cheio, preço com desconto (o cobrado) e "em estoque", como o Wix
  // mostra na página; selo (ribbon) do produto, se houver.
  precoNaPagina: number | null;
  precoComDescontoNaPagina: number | null;
  precoComparativoNaPagina: number | null;
  emEstoqueNaPagina: boolean | null;
  estoqueNaPagina: string | null;
  seloNaPagina: string | null;
  tipoNaPagina: string | null;
};

// Procura nos dados JSON da página o objeto do produto (o que tem urlPart
// igual ao slug e a lista de opções).
function acharObjetoDoProduto(valor: unknown, slug: string, profundidade = 0): Record<string, unknown> | null {
  if (profundidade > 40 || typeof valor !== "object" || valor === null) return null;
  if (Array.isArray(valor)) {
    for (const item of valor) {
      const achado = acharObjetoDoProduto(item, slug, profundidade + 1);
      if (achado) return achado;
    }
    return null;
  }
  const objeto = valor as Record<string, unknown>;
  if (typeof objeto.urlPart === "string" && Array.isArray(objeto.options) && decodeURIComponent(objeto.urlPart) === slug) return objeto;
  for (const filho of Object.values(objeto)) {
    const achado = acharObjetoDoProduto(filho, slug, profundidade + 1);
    if (achado) return achado;
  }
  return null;
}

const texto = (valor: unknown) => (typeof valor === "string" ? valor.trim() : "");
const numero = (valor: unknown) => (typeof valor === "number" && Number.isFinite(valor) ? valor : typeof valor === "string" && valor.trim() !== "" && Number.isFinite(Number(valor)) ? Number(valor) : null);

export function lerPaginaDeProduto(html: string, slug: string): ProdutoLido {
  const documento = parse(html) as unknown as No;
  let elemento: No | null = null;
  let descricaoLd: string | null = null;
  let produtoWix: Record<string, unknown> | null = null;
  for (const no of percorrer(documento)) {
    if (!elemento && atributo(no, "data-hook") === "description") elemento = no;
    if (no.tagName !== "script") continue;
    const tipo = atributo(no, "type") ?? "";
    if (!tipo.includes("json")) continue;
    let dados: unknown;
    try {
      dados = JSON.parse(textoCru(no));
    } catch {
      continue;
    }
    if (tipo.includes("ld+json")) {
      for (const item of Array.isArray(dados) ? dados : [dados]) {
        if (item && typeof item === "object" && (item as Record<string, unknown>)["@type"] === "Product") descricaoLd = texto((item as Record<string, unknown>).description) || null;
      }
    } else if (!produtoWix) produtoWix = acharObjetoDoProduto(dados, slug);
  }

  const doElemento = elemento ? textoComParagrafos(elemento) : "";
  const descricao = doElemento || descricaoLd || null;
  const opcoes = produtoWix
    ? (produtoWix.options as unknown[]).map((opcao) => {
        const o = (opcao ?? {}) as Record<string, unknown>;
        const selecoes = Array.isArray(o.selections) ? o.selections : [];
        return { titulo: texto(o.title), valores: selecoes.map((s) => texto((s as Record<string, unknown>)?.description) || texto((s as Record<string, unknown>)?.value)).filter(Boolean) };
      })
    : null;
  const camposDeTexto =
    produtoWix && Array.isArray(produtoWix.customTextFields)
      ? (produtoWix.customTextFields as unknown[]).map((campo) => {
          const c = (campo ?? {}) as Record<string, unknown>;
          return { titulo: texto(c.title), obrigatorio: c.isMandatory === true };
        })
      : null;
  const inventario = (produtoWix?.inventory ?? null) as Record<string, unknown> | null;
  return {
    achados: { descricaoNoElemento: Boolean(doElemento), ldJsonProduto: descricaoLd !== null, dadosDoWix: produtoWix !== null },
    descricao,
    fonteDaDescricao: doElemento ? "elemento" : descricaoLd ? "ldJson" : null,
    opcoes,
    camposDeTexto,
    precoNaPagina: produtoWix ? numero(produtoWix.price) : null,
    precoComDescontoNaPagina: produtoWix ? numero(produtoWix.discountedPrice) : null,
    precoComparativoNaPagina: produtoWix ? numero(produtoWix.comparePrice) : null,
    emEstoqueNaPagina: produtoWix && typeof produtoWix.isInStock === "boolean" ? produtoWix.isInStock : null,
    estoqueNaPagina: inventario ? texto(inventario.status) || null : null,
    seloNaPagina: produtoWix ? texto(produtoWix.ribbon) || null : null,
    tipoNaPagina: produtoWix ? texto(produtoWix.productType) || null : null,
  };
}
