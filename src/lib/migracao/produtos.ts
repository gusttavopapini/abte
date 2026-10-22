// Migração das categorias e dos produtos da loja do site antigo (etapa 6,
// degrau 3), pura nesta parte: leitura do mapa e dos dados coletados das
// páginas, conversão para o modelo atual e tabela de redirecionamentos.
// Decisões de 21/10/2026: categorias só "abte" e "produtos-parceiros" ("loja"
// é a listagem geral); produtos com publicado = false; preço riscado vira
// preco e o atual vira precoPromocional, todos marcados para revisão; slug sem
// acento pelo gerarSlug, com redirecionamento do antigo (nada ativado).
// Testado em testes/unidade/migracao-produtos.test.mts.
import { gerarSlug } from "../slug.ts";

export type ProdutoDoMapa = {
  slug: string;
  nome: string;
  descricao: string;
  // Em reais, como no mapa.
  preco: number;
  precoRiscado: string | null;
  estoque: string;
  digital: boolean;
  categorias: string[];
  temOpcoes: string[];
};

export type CategoriaDoMapa = { slug: string; nome: string };

// Categorias de produto que viram categoria no site novo (decisão 10, opção A).
export const CATEGORIAS_MIGRADAS = ["abte", "produtos-parceiros"] as const;

const texto = (valor: unknown) => (typeof valor === "string" ? valor.trim() : "");

// Produtos e categorias do mapa-site-antigo.jsonl. Erros citam só a linha.
export function lerProdutosDoMapa(conteudo: string): { ok: true; produtos: ProdutoDoMapa[]; categorias: CategoriaDoMapa[] } | { ok: false; erros: string[] } {
  const erros: string[] = [];
  const produtos: ProdutoDoMapa[] = [];
  const categorias: CategoriaDoMapa[] = [];
  conteudo.split("\n").forEach((linha, i) => {
    if (!linha.trim()) return;
    let r: Record<string, unknown>;
    try {
      r = JSON.parse(linha);
    } catch {
      erros.push(`Linha ${i + 1} do mapa não é JSON.`);
      return;
    }
    if (r.tipo === "categoria") {
      const url = texto(r.url);
      if (url.startsWith("/category/")) categorias.push({ slug: url.slice("/category/".length), nome: texto(r.titulo).split(" | ")[0].trim() });
      return;
    }
    if (r.tipo !== "produto") return;
    const onde = `Linha ${i + 1} (produto)`;
    if (!texto(r.slug) || !texto(r.nome)) erros.push(`${onde}: slug ou nome ausente.`);
    if (typeof r.preco !== "number" || !(r.preco > 0)) erros.push(`${onde}: preço ausente ou inválido.`);
    if (r.precoRiscado !== null && typeof r.precoRiscado !== "string") erros.push(`${onde}: precoRiscado precisa ser texto ou null.`);
    if (typeof r.digital !== "boolean") erros.push(`${onde}: digital precisa ser true ou false.`);
    if (!Array.isArray(r.categorias)) erros.push(`${onde}: categorias precisa ser uma lista.`);
    produtos.push({
      slug: texto(r.slug),
      nome: texto(r.nome),
      descricao: texto(r.descricao),
      preco: typeof r.preco === "number" ? r.preco : 0,
      precoRiscado: typeof r.precoRiscado === "string" ? r.precoRiscado : null,
      estoque: texto(r.estoque),
      digital: r.digital === true,
      categorias: Array.isArray(r.categorias) ? r.categorias.map(texto).filter(Boolean) : [],
      temOpcoes: Array.isArray(r.temOpcoes) ? r.temOpcoes.map(texto).filter(Boolean) : [],
    });
  });
  if (erros.length === 0 && produtos.length === 0) erros.push("O mapa não tem produtos.");
  const slugs = produtos.map((produto) => produto.slug);
  if (new Set(slugs).size !== slugs.length) erros.push("O mapa tem slugs de produto repetidos.");
  return erros.length > 0 ? { ok: false, erros } : { ok: true, produtos, categorias };
}

// Caminho da página antiga do produto (o slug com acento vai codificado).
export function caminhoDaPaginaAntiga(slug: string): string {
  return `/product-page/${encodeURIComponent(slug)}`;
}

// "R$ 1.250,90" para centavos; null se não for um preço em reais.
export function centavosDoTexto(valor: string): number | null {
  const limpo = valor.replace(/\s/g, "").replace(/^R\$/, "");
  if (!/^\d{1,3}(\.\d{3})*(,\d{2})?$|^\d+(,\d{2})?$/.test(limpo)) return null;
  const [inteiro, decimal = "00"] = limpo.replace(/\./g, "").split(",");
  return Number(inteiro) * 100 + Number(decimal);
}

export function centavosDeReais(valor: number): number {
  return Math.round(valor * 100);
}

export function slugNovo(slugAntigo: string): string {
  return gerarSlug(slugAntigo);
}

// ---------------------------------------------------------------------------
// Conversão e gravação (Firestore por parâmetro, sem "server-only").

export const COLECAO_CATEGORIAS_DE_PRODUTOS = "categoriasDeProdutos";

// Mesmos limites do formulário do painel (lib/produtos.ts).
const LIMITES = { nome: 120, descricao: 5000, precoMaximo: 10_000_000 } as const;

export const PROBLEMAS_DO_PRODUTO = [
  "nomeLongo",
  "descricaoDoMapa",
  "descricaoLonga",
  "precoInvalido",
  "precoRiscadoInvalido",
  "semCategoria",
  "duasCategorias",
  "imagemPendente",
  "imagensDemais",
  "estoqueDesconhecido",
] as const;
export type ProblemaDoProduto = (typeof PROBLEMAS_DO_PRODUTO)[number];

// Diferenças entre o mapa (que vale, decisão 11) e os dados atuais da página
// antiga. Só vão para o relatório, para a ABTE conferir.
export type DiferencaDaPagina = "precoDiferente" | "tipoDiferente" | "estoqueDiferente" | "temOpcoes" | "temCamposDeTexto" | "temSelo";

export type ProdutoColetado = {
  slug: string;
  descricao?: string | null;
  falha?: string;
  achados?: { descricaoNoElemento: boolean; ldJsonProduto: boolean; dadosDoWix: boolean };
  opcoes?: { titulo: string; valores: string[] }[] | null;
  camposDeTexto?: { titulo: string; obrigatorio: boolean }[] | null;
  precoNaPagina?: number | null;
  precoComDescontoNaPagina?: number | null;
  emEstoqueNaPagina?: boolean | null;
  tipoNaPagina?: string | null;
  seloNaPagina?: string | null;
};

export function lerProdutosColetados(dados: unknown): { ok: true; porSlug: Map<string, ProdutoColetado> } | { ok: false; erros: string[] } {
  if (typeof dados !== "object" || dados === null) return { ok: false, erros: ["O arquivo da coleta não é um objeto JSON."] };
  const raiz = dados as Record<string, unknown>;
  if (raiz.versao !== 1 || !Array.isArray(raiz.produtos)) return { ok: false, erros: ["O arquivo da coleta precisa ter versao 1 e a lista produtos."] };
  const porSlug = new Map<string, ProdutoColetado>();
  for (const item of raiz.produtos) if (item && typeof item === "object" && typeof (item as ProdutoColetado).slug === "string") porSlug.set((item as ProdutoColetado).slug, item as ProdutoColetado);
  return { ok: true, porSlug };
}

export type DadosDoProdutoMigrado = {
  nome: string;
  descricao: string;
  preco: number;
  precoPromocional: number | null;
  categoria: string;
  tipo: "fisico" | "digital";
  status: "disponivel" | "esgotado";
  selo: string;
  ordem: number;
  publicado: false;
  imagens: { midiaId: string; ordem: number }[];
};

// Converte um produto do mapa. categorias: slug antigo da categoria para o id
// no Firestore; imagens: midiaIdWix (na ordem da galeria) para o id em midias.
export function converterProduto(
  produto: ProdutoDoMapa,
  ordem: number,
  coletado: ProdutoColetado | undefined,
  idsDasCategorias: Map<string, string>,
  galeria: { midiaIdWix: string; midiaId: string | null }[],
): { dados: DadosDoProdutoMigrado; problemas: ProblemaDoProduto[]; diferencas: DiferencaDaPagina[]; temPrecoRiscado: boolean } {
  const problemas = new Set<ProblemaDoProduto>();
  const diferencas = new Set<DiferencaDaPagina>();

  let nome = produto.nome;
  if (nome.length > LIMITES.nome) {
    problemas.add("nomeLongo");
    nome = "";
  }

  // Descrição: a lida na página; sem ela, a do mapa (aproximada), marcada.
  let descricao = coletado?.descricao?.trim() || "";
  if (!descricao) {
    problemas.add("descricaoDoMapa");
    descricao = produto.descricao;
  }
  if (descricao.length > LIMITES.descricao) {
    problemas.add("descricaoLonga");
    descricao = "";
  }

  // Preço (decisão 11): o riscado vira preco e o atual vira precoPromocional.
  const atual = centavosDeReais(produto.preco);
  const riscado = produto.precoRiscado === null ? null : centavosDoTexto(produto.precoRiscado);
  let preco = atual;
  let precoPromocional: number | null = null;
  if (produto.precoRiscado !== null && riscado === null) problemas.add("precoRiscadoInvalido");
  if (riscado !== null) {
    if (riscado > atual) {
      preco = riscado;
      precoPromocional = atual;
    } else problemas.add("precoRiscadoInvalido");
  }
  if (!(preco > 0) || preco > LIMITES.precoMaximo) problemas.add("precoInvalido");

  // Categoria (decisão 10, opção A): só abte ou produtos-parceiros.
  const daMigracao = CATEGORIAS_MIGRADAS.filter((slug) => produto.categorias.includes(slug));
  if (daMigracao.length === 0) problemas.add("semCategoria");
  if (daMigracao.length > 1) problemas.add("duasCategorias");
  const categoria = daMigracao.length > 0 ? (idsDasCategorias.get(daMigracao[0]) ?? "") : "";

  let status: "disponivel" | "esgotado" = "disponivel";
  if (produto.estoque === "esgotado") status = "esgotado";
  else if (produto.estoque !== "disponivel") problemas.add("estoqueDesconhecido");

  const ligadas = galeria.filter((item) => item.midiaId !== null);
  if (ligadas.length < galeria.length) problemas.add("imagemPendente");
  if (ligadas.length > LIMITE_DE_IMAGENS) problemas.add("imagensDemais");
  const imagens = ligadas.slice(0, LIMITE_DE_IMAGENS).map((item, posicao) => ({ midiaId: item.midiaId as string, ordem: posicao }));

  const tipo = produto.digital ? "digital" : "fisico";
  if (coletado && !coletado.falha) {
    const comDesconto = coletado.precoComDescontoNaPagina ?? coletado.precoNaPagina;
    const cheioNaPagina = coletado.precoNaPagina;
    const precosDaPagina = [typeof cheioNaPagina === "number" ? centavosDeReais(cheioNaPagina) : null, typeof comDesconto === "number" ? centavosDeReais(comDesconto) : null];
    if (precosDaPagina[0] !== preco || precosDaPagina[1] !== (precoPromocional ?? preco)) diferencas.add("precoDiferente");
    const tipoDaPagina = coletado.tipoNaPagina === "digital" ? "digital" : coletado.tipoNaPagina === "physical" ? "fisico" : null;
    if (tipoDaPagina && tipoDaPagina !== tipo) diferencas.add("tipoDiferente");
    if (typeof coletado.emEstoqueNaPagina === "boolean" && coletado.emEstoqueNaPagina !== (status === "disponivel")) diferencas.add("estoqueDiferente");
    if ((coletado.opcoes?.length ?? 0) > 0) diferencas.add("temOpcoes");
    if ((coletado.camposDeTexto?.length ?? 0) > 0) diferencas.add("temCamposDeTexto");
    if (coletado.seloNaPagina) diferencas.add("temSelo");
  }

  return {
    dados: { nome, descricao, preco, precoPromocional, categoria, tipo, status, selo: "", ordem, publicado: false, imagens },
    problemas: PROBLEMAS_DO_PRODUTO.filter((problema) => problemas.has(problema)),
    diferencas: [...diferencas],
    temPrecoRiscado: riscado !== null && riscado > atual,
  };
}

const LIMITE_DE_IMAGENS = 8;

// Redirecionamentos do site antigo para o novo, para a etapa 9 (NADA é
// ativado aqui). O slug antigo com acento entra decodificado e codificado.
export type Redirecionamento = { de: string; para: string; tipo: string };

export function redirecionamentosDaLoja(produtos: { slugAntigo: string; slugNovo: string }[], categorias: { slugAntigo: string; slugNovo: string }[]): Redirecionamento[] {
  const lista: Redirecionamento[] = [];
  for (const { slugAntigo, slugNovo } of produtos) {
    const para = `/loja/produto/${slugNovo}`;
    lista.push({ de: `/product-page/${slugAntigo}`, para, tipo: "produto" });
    const codificado = caminhoDaPaginaAntiga(slugAntigo);
    if (codificado !== `/product-page/${slugAntigo}`) lista.push({ de: codificado, para, tipo: "produto" });
  }
  for (const { slugAntigo, slugNovo } of categorias) lista.push({ de: `/category/${slugAntigo}`, para: `/loja?categoria=${slugNovo}`, tipo: "categoria" });
  lista.push({ de: "/category/loja", para: "/loja", tipo: "categoria" });
  lista.push({ de: "/category/all-products", para: "/loja", tipo: "categoria" });
  return lista;
}

// Junta à tabela já existente (substitui as entradas com o mesmo "de").
export function juntarRedirecionamentos(existente: unknown, novos: Redirecionamento[], geradoEm: string) {
  const anteriores = existente && typeof existente === "object" && Array.isArray((existente as { entradas?: unknown }).entradas) ? ((existente as { entradas: Redirecionamento[] }).entradas) : [];
  const porOrigem = new Map(anteriores.map((item) => [item.de, item]));
  for (const item of novos) porOrigem.set(item.de, item);
  return {
    versao: 1,
    ativo: false,
    observacao: "Tabela PROPOSTA de redirecionamentos 301 do site antigo para o novo. NÃO está ligada ao site; ativar só com aprovação (etapa 9).",
    atualizadoEm: geradoEm,
    entradas: [...porOrigem.values()].sort((a, b) => a.de.localeCompare(b.de)),
  };
}
