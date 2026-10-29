// Filtro da loja (29/10/2026): leitura e escrita dos filtros na URL,
// filtragem, contagens facetadas e ordenação. Funções puras, sem
// dependências do Firebase: o servidor (página /loja) usa para montar a lista
// e o navegador usa para atualizar as contagens enquanto a pessoa mexe no
// painel. Só campos públicos, os mesmos que o card do produto já mostra.
import { gerarSlug } from "./slug.ts";
import { lerPrecoEmCentavos, precoAtual } from "./produtos.ts";

export type TipoDoProduto = "fisico" | "digital";
export type Disponibilidade = "disponivel" | "esgotado";
export type OrdemDaLoja = "relevancia" | "menor-preco" | "maior-preco" | "nome";

export const TIPOS: { valor: TipoDoProduto; rotulo: string }[] = [
  { valor: "fisico", rotulo: "Físico" },
  { valor: "digital", rotulo: "Digital" },
];

export const DISPONIBILIDADES: { valor: Disponibilidade; rotulo: string }[] = [
  { valor: "disponivel", rotulo: "Disponível" },
  { valor: "esgotado", rotulo: "Esgotado" },
];

// Relevância é a ordem da loja (ordem do painel e, no empate, o nome).
export const ORDENS: { valor: OrdemDaLoja; rotulo: string }[] = [
  { valor: "relevancia", rotulo: "Relevância" },
  { valor: "menor-preco", rotulo: "Menor preço" },
  { valor: "maior-preco", rotulo: "Maior preço" },
  { valor: "nome", rotulo: "Nome (A a Z)" },
];

// Nomes dos parâmetros da URL (categoria, tipo, disponibilidade e selo podem
// se repetir). "categoria" é o mesmo de antes do filtro novo.
export const PARAMETROS = {
  busca: "busca",
  categoria: "categoria",
  tipo: "tipo",
  disponibilidade: "disponibilidade",
  precoMinimo: "preco_min",
  precoMaximo: "preco_max",
  promocao: "promocao",
  selo: "selo",
  ordem: "ordem",
} as const;

export const LIMITE_DA_BUSCA = 100;
export const MENSAGEM_DE_PRECO = "O preço mínimo precisa ser menor ou igual ao preço máximo.";

// Produto como o filtro precisa, já na ordem da loja. categoria e selo são
// slugs (null sem categoria; "" sem selo).
export type ItemDoFiltro = {
  id: string;
  nome: string;
  categoria: string | null;
  tipo: TipoDoProduto;
  status: Disponibilidade;
  preco: number;
  precoPromocional: number | null;
  selo: string;
};

export type OpcaoDoFiltro = { valor: string; rotulo: string };

export type OpcoesDaLoja = {
  categorias: OpcaoDoFiltro[];
  selos: OpcaoDoFiltro[];
  // Menor e maior preço efetivo da loja, em centavos, arredondados para reais
  // inteiros (para os campos e a faixa de preço); null com a loja vazia.
  faixaDePreco: { minimo: number; maximo: number } | null;
};

export type FiltrosDaLoja = {
  busca: string;
  categorias: string[];
  tipos: TipoDoProduto[];
  disponibilidades: Disponibilidade[];
  // Em centavos; null sem limite.
  precoMinimo: number | null;
  precoMaximo: number | null;
  promocao: boolean;
  selos: string[];
  ordem: OrdemDaLoja;
};

export const FILTROS_VAZIOS: FiltrosDaLoja = {
  busca: "",
  categorias: [],
  tipos: [],
  disponibilidades: [],
  precoMinimo: null,
  precoMaximo: null,
  promocao: false,
  selos: [],
  ordem: "relevancia",
};

// Grupos do filtro; numa contagem facetada, o grupo da própria opção é ignorado.
export type GrupoDoFiltro = "busca" | "categoria" | "tipo" | "disponibilidade" | "preco" | "ofertas";

// ---------- Montagem dos dados ----------

// Texto do selo para o filtro: o selo gravado em maiúsculas ("MONTE SEU KIT")
// vira "Monte seu kit"; outro texto fica como está.
export function rotuloDoSelo(selo: string): string {
  const texto = selo.replace(/\s+/g, " ").trim();
  if (!/\p{L}/u.test(texto) || texto !== texto.toLocaleUpperCase("pt-BR")) return texto;
  const minusculo = texto.toLocaleLowerCase("pt-BR");
  return minusculo.charAt(0).toLocaleUpperCase("pt-BR") + minusculo.slice(1);
}

type ProdutoDaLoja = {
  id: string;
  nome: string;
  categoria: string;
  tipo: TipoDoProduto;
  status: Disponibilidade;
  preco: number;
  precoPromocional: number | null;
  selo: string;
};

// Converte os produtos visíveis (já na ordem da loja) para o filtro e monta as
// opções: só categorias com produto, na ordem recebida; um selo por texto.
export function montarFiltroDaLoja(produtos: ProdutoDaLoja[], categorias: { id: string; slug: string; nome: string }[]): { itens: ItemDoFiltro[]; opcoes: OpcoesDaLoja } {
  const slugDaCategoria = new Map(categorias.map((categoria) => [categoria.id, categoria.slug]));
  const selos = new Map<string, string>();
  const itens = produtos.map((produto) => {
    const selo = gerarSlug(produto.selo ?? "");
    if (selo && !selos.has(selo)) selos.set(selo, rotuloDoSelo(produto.selo));
    return {
      id: produto.id,
      nome: produto.nome,
      categoria: slugDaCategoria.get(produto.categoria) ?? null,
      tipo: produto.tipo,
      status: produto.status,
      preco: produto.preco,
      precoPromocional: produto.precoPromocional,
      selo,
    };
  });
  const usadas = new Set(itens.map((item) => item.categoria));
  const precos = itens.map(precoAtual);
  return {
    itens,
    opcoes: {
      categorias: categorias.filter((categoria) => usadas.has(categoria.slug)).map((categoria) => ({ valor: categoria.slug, rotulo: categoria.nome })),
      selos: [...selos].map(([valor, rotulo]) => ({ valor, rotulo })),
      faixaDePreco: precos.length ? { minimo: Math.floor(Math.min(...precos) / 100) * 100, maximo: Math.ceil(Math.max(...precos) / 100) * 100 } : null,
    },
  };
}

// ---------- URL ----------

export type ParametrosDaUrl = URLSearchParams | Record<string, string | string[] | undefined>;

function valoresDe(parametros: ParametrosDaUrl, nome: string): string[] {
  if (parametros instanceof URLSearchParams) return parametros.getAll(nome);
  const valor = parametros[nome];
  if (valor === undefined) return [];
  return Array.isArray(valor) ? valor : [valor];
}

// Só os valores conhecidos, sem repetição, na ordem em que vieram.
function conhecidos<T extends string>(valores: string[], aceitos: readonly T[]): T[] {
  return [...new Set(valores.map((valor) => valor.trim()))].filter((valor): valor is T => (aceitos as readonly string[]).includes(valor));
}

// Preço do filtro em centavos: vazio, formato estranho ou negativo viram null.
export function lerPrecoDoFiltro(entrada: string | undefined): number | null {
  const centavos = lerPrecoEmCentavos(entrada ?? "");
  return typeof centavos === "number" && Number.isFinite(centavos) && centavos >= 0 ? centavos : null;
}

export function normalizarBusca(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
}

// Lê os filtros da URL. Valores desconhecidos ou inválidos são ignorados
// (categoria e selo só valem se existirem nas opções da loja).
export function lerFiltrosDaUrl(parametros: ParametrosDaUrl, opcoes: Pick<OpcoesDaLoja, "categorias" | "selos">): FiltrosDaLoja {
  const primeiro = (nome: string) => valoresDe(parametros, nome)[0];
  const ordem = conhecidos([primeiro(PARAMETROS.ordem) ?? ""], ORDENS.map((item) => item.valor))[0];
  return {
    busca: (primeiro(PARAMETROS.busca) ?? "").replace(/\s+/g, " ").trim().slice(0, LIMITE_DA_BUSCA),
    categorias: conhecidos(valoresDe(parametros, PARAMETROS.categoria), opcoes.categorias.map((item) => item.valor)),
    tipos: conhecidos(valoresDe(parametros, PARAMETROS.tipo), TIPOS.map((item) => item.valor)),
    disponibilidades: conhecidos(valoresDe(parametros, PARAMETROS.disponibilidade), DISPONIBILIDADES.map((item) => item.valor)),
    precoMinimo: lerPrecoDoFiltro(primeiro(PARAMETROS.precoMinimo)),
    precoMaximo: lerPrecoDoFiltro(primeiro(PARAMETROS.precoMaximo)),
    promocao: primeiro(PARAMETROS.promocao) === "1",
    selos: conhecidos(valoresDe(parametros, PARAMETROS.selo), opcoes.selos.map((item) => item.valor)),
    ordem: ordem ?? "relevancia",
  };
}

// Preço em reais para a URL: 3000 vira "30" e 3999 vira "39.99".
export function precoParaUrl(centavos: number): string {
  return centavos % 100 === 0 ? String(centavos / 100) : (centavos / 100).toFixed(2);
}

// Preço em reais para o campo: 3000 vira "30" e 3999 vira "39,99".
export function precoParaCampoDoFiltro(centavos: number | null): string {
  return centavos === null ? "" : precoParaUrl(centavos).replace(".", ",");
}

// Parâmetros na ordem fixa, sem os vazios nem a ordem padrão.
export function parametrosDosFiltros(filtros: FiltrosDaLoja): URLSearchParams {
  const parametros = new URLSearchParams();
  if (filtros.busca) parametros.append(PARAMETROS.busca, filtros.busca);
  for (const categoria of filtros.categorias) parametros.append(PARAMETROS.categoria, categoria);
  for (const tipo of filtros.tipos) parametros.append(PARAMETROS.tipo, tipo);
  for (const disponibilidade of filtros.disponibilidades) parametros.append(PARAMETROS.disponibilidade, disponibilidade);
  if (filtros.precoMinimo !== null) parametros.append(PARAMETROS.precoMinimo, precoParaUrl(filtros.precoMinimo));
  if (filtros.precoMaximo !== null) parametros.append(PARAMETROS.precoMaximo, precoParaUrl(filtros.precoMaximo));
  if (filtros.promocao) parametros.append(PARAMETROS.promocao, "1");
  for (const selo of filtros.selos) parametros.append(PARAMETROS.selo, selo);
  if (filtros.ordem !== "relevancia") parametros.append(PARAMETROS.ordem, filtros.ordem);
  return parametros;
}

export function enderecoDaLoja(filtros: FiltrosDaLoja): string {
  const consulta = parametrosDosFiltros(filtros).toString();
  return consulta ? `/loja?${consulta}` : "/loja";
}

// ---------- Filtragem, contagens e ordem ----------

// Mínimo maior que o máximo: a faixa de preço não é aplicada e a página
// mostra a mensagem.
export function erroDaFaixaDePreco(filtros: Pick<FiltrosDaLoja, "precoMinimo" | "precoMaximo">): string | null {
  return filtros.precoMinimo !== null && filtros.precoMaximo !== null && filtros.precoMinimo > filtros.precoMaximo ? MENSAGEM_DE_PRECO : null;
}

// Dentro de um grupo, as opções marcadas somam (basta uma); entre grupos,
// todas precisam valer. "Em promoção" e os selos formam o grupo Ofertas.
export function passaNosFiltros(item: ItemDoFiltro, filtros: FiltrosDaLoja, ignorar?: GrupoDoFiltro): boolean {
  if (ignorar !== "busca" && filtros.busca) {
    const nome = normalizarBusca(item.nome);
    if (!normalizarBusca(filtros.busca).split(" ").every((termo) => nome.includes(termo))) return false;
  }
  if (ignorar !== "categoria" && filtros.categorias.length && !(item.categoria !== null && filtros.categorias.includes(item.categoria))) return false;
  if (ignorar !== "tipo" && filtros.tipos.length && !filtros.tipos.includes(item.tipo)) return false;
  if (ignorar !== "disponibilidade" && filtros.disponibilidades.length && !filtros.disponibilidades.includes(item.status)) return false;
  if (ignorar !== "preco" && !erroDaFaixaDePreco(filtros)) {
    const preco = precoAtual(item);
    if (filtros.precoMinimo !== null && preco < filtros.precoMinimo) return false;
    if (filtros.precoMaximo !== null && preco > filtros.precoMaximo) return false;
  }
  if (ignorar !== "ofertas" && (filtros.promocao || filtros.selos.length)) {
    const naPromocao = filtros.promocao && item.precoPromocional !== null;
    const comSelo = item.selo !== "" && filtros.selos.includes(item.selo);
    if (!naPromocao && !comSelo) return false;
  }
  return true;
}

export function filtrarItens<T extends ItemDoFiltro>(itens: T[], filtros: FiltrosDaLoja, ignorar?: GrupoDoFiltro): T[] {
  return itens.filter((item) => passaNosFiltros(item, filtros, ignorar));
}

export type ContagensDaLoja = {
  categorias: Record<string, number>;
  tipos: Record<TipoDoProduto, number>;
  disponibilidades: Record<Disponibilidade, number>;
  promocao: number;
  selos: Record<string, number>;
};

// Contagem de cada opção com os OUTROS filtros ativos: o grupo da própria
// opção não conta, para mostrar quantos produtos ela traria.
export function contarOpcoes(itens: ItemDoFiltro[], filtros: FiltrosDaLoja, opcoes: Pick<OpcoesDaLoja, "categorias" | "selos">): ContagensDaLoja {
  const contar = (grupo: GrupoDoFiltro, teste: (item: ItemDoFiltro) => boolean) => filtrarItens(itens, filtros, grupo).filter(teste).length;
  return {
    categorias: Object.fromEntries(opcoes.categorias.map(({ valor }) => [valor, contar("categoria", (item) => item.categoria === valor)])),
    tipos: { fisico: contar("tipo", (item) => item.tipo === "fisico"), digital: contar("tipo", (item) => item.tipo === "digital") },
    disponibilidades: {
      disponivel: contar("disponibilidade", (item) => item.status === "disponivel"),
      esgotado: contar("disponibilidade", (item) => item.status === "esgotado"),
    },
    promocao: contar("ofertas", (item) => item.precoPromocional !== null),
    selos: Object.fromEntries(opcoes.selos.map(({ valor }) => [valor, contar("ofertas", (item) => item.selo === valor)])),
  };
}

// Relevância mantém a ordem recebida (a da loja); nos outros casos, o empate
// também fica na ordem da loja. O preço é o efetivo (promocional, se houver).
export function ordenarItens<T extends ItemDoFiltro>(itens: T[], ordem: OrdemDaLoja): T[] {
  const comparar: Record<OrdemDaLoja, (a: T, b: T) => number> = {
    relevancia: () => 0,
    "menor-preco": (a, b) => precoAtual(a) - precoAtual(b),
    "maior-preco": (a, b) => precoAtual(b) - precoAtual(a),
    nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base", numeric: true }),
  };
  return itens.map((item, posicao) => ({ item, posicao })).sort((a, b) => comparar[ordem](a.item, b.item) || a.posicao - b.posicao).map(({ item }) => item);
}

// ---------- Filtros ativos (etiquetas) ----------

export type FiltroAtivo = { chave: string; rotulo: string; semEste: FiltrosDaLoja };

const rotuloDe = (lista: OpcaoDoFiltro[] | { valor: string; rotulo: string }[], valor: string) => lista.find((item) => item.valor === valor)?.rotulo ?? valor;

function textoDoPreco(centavos: number): string {
  return `R$ ${precoParaCampoDoFiltro(centavos)}`;
}

// Uma etiqueta por filtro ligado, com os filtros que ficam sem ele. A faixa de
// preço é uma etiqueta só. A ordem não é filtro.
export function filtrosAtivos(filtros: FiltrosDaLoja, opcoes: Pick<OpcoesDaLoja, "categorias" | "selos">): FiltroAtivo[] {
  const ativos: FiltroAtivo[] = [];
  if (filtros.busca) ativos.push({ chave: "busca", rotulo: `Busca: ${filtros.busca}`, semEste: { ...filtros, busca: "" } });
  for (const valor of filtros.categorias) {
    ativos.push({ chave: `categoria-${valor}`, rotulo: `Categoria: ${rotuloDe(opcoes.categorias, valor)}`, semEste: { ...filtros, categorias: filtros.categorias.filter((item) => item !== valor) } });
  }
  for (const valor of filtros.tipos) {
    ativos.push({ chave: `tipo-${valor}`, rotulo: `Tipo: ${rotuloDe(TIPOS, valor)}`, semEste: { ...filtros, tipos: filtros.tipos.filter((item) => item !== valor) } });
  }
  for (const valor of filtros.disponibilidades) {
    ativos.push({ chave: `disponibilidade-${valor}`, rotulo: rotuloDe(DISPONIBILIDADES, valor), semEste: { ...filtros, disponibilidades: filtros.disponibilidades.filter((item) => item !== valor) } });
  }
  const { precoMinimo: minimo, precoMaximo: maximo } = filtros;
  if (minimo !== null || maximo !== null) {
    const rotulo = minimo !== null && maximo !== null ? `Preço: de ${textoDoPreco(minimo)} a ${textoDoPreco(maximo)}` : minimo !== null ? `Preço: a partir de ${textoDoPreco(minimo)}` : `Preço: até ${textoDoPreco(maximo as number)}`;
    ativos.push({ chave: "preco", rotulo, semEste: { ...filtros, precoMinimo: null, precoMaximo: null } });
  }
  if (filtros.promocao) ativos.push({ chave: "promocao", rotulo: "Em promoção", semEste: { ...filtros, promocao: false } });
  for (const valor of filtros.selos) {
    ativos.push({ chave: `selo-${valor}`, rotulo: rotuloDe(opcoes.selos, valor), semEste: { ...filtros, selos: filtros.selos.filter((item) => item !== valor) } });
  }
  return ativos;
}

// "Limpar filtros" tira todos os filtros e mantém a ordem escolhida.
export function semFiltros(filtros: FiltrosDaLoja): FiltrosDaLoja {
  return { ...FILTROS_VAZIOS, ordem: filtros.ordem };
}
