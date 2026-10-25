// Regras da classificação inicial dos posts importados (25/10/2026), puras e
// verificáveis: 7 categorias neutras e editoriais (aprovadas pelo
// responsável), sem categoria clínica inventada. Cada post vai para a
// PRIMEIRA categoria, na ordem de precedência abaixo, cujo termo aparece no
// título; sem termo no título, para a categoria com mais termos no texto (pelo
// menos MINIMO_NO_TEXTO ocorrências); sem nada, para "Geral". Termos em
// português e espanhol, comparados sem acento e sem maiúsculas, como palavra
// inteira ou início de palavra (o "*" no fim marca o início de palavra).
// Testado em testes/unidade/migracao-classificacao.test.mts.

export type CategoriaDosPosts = { slug: string; nome: string; ordem: number; termos: string[] };

export const CATEGORIA_GERAL = { slug: "geral", nome: "Geral", ordem: 7 } as const;

// Ordem de precedência no título (a ordem de exibição é o campo ordem).
export const CATEGORIAS_DOS_POSTS: readonly CategoriaDosPosts[] = [
  { slug: "colete-e-ortese", nome: "Colete e órtese", ordem: 3, termos: ["colete*", "ortese*", "orteses", "corse*", "cheneau", "desmame"] },
  { slug: "escoliose-em-adultos", nome: "Escoliose em adultos", ordem: 5, termos: ["adulto*", "idoso*", "adulta*"] },
  {
    slug: "exercicios-e-fisioterapia",
    nome: "Exercícios e fisioterapia",
    ordem: 4,
    termos: ["exercicio*", "ejercicio*", "fisioterap*", "schroth", "pse", "psse", "psee", "controle motor", "aprendizado motor", "esporte*", "deporte*", "atividade fisica", "reabilitacao", "rehabilitacion", "core", "plataforma vibratoria", "fadiga muscular", "desequilibrio muscular", "tratamento postural", "reaprendizado postural"],
  },
  {
    slug: "entendendo-a-escoliose",
    nome: "Entendendo a escoliose",
    ordem: 1,
    termos: ["o que e escoliose", "que es la escoliosis", "tipos de escoliose", "diagnostico*", "triagem", "triage", "tamizaje", "crescimento", "crecimiento", "como saber", "variacoes posturais", "hipercifose", "cifose", "sanders", "progressao", "tem cura", "passa de", "3d", "braist*", "dor nas costas", "dor x"],
  },
  { slug: "adolescentes-e-familia", nome: "Adolescentes e família", ordem: 6, termos: ["pais", "padres", "filho*", "hijo*", "autoestima", "adolescencia", "qualidade de vida", "carta"] },
  { slug: "tratamentos-e-decisoes", nome: "Tratamentos e decisões", ordem: 2, termos: ["cirurgi*", "artrodese", "tethering", "vbt", "tratamento*", "tratamiento*", "trat*", "conservador*", "sosort", "antes x depois", "metodos"] },
];

export const MINIMO_NO_TEXTO = 3;

export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Expressão de um termo: palavra inteira ou, com "*", início de palavra.
function expressao(termo: string): RegExp {
  const inicio = termo.endsWith("*");
  const base = normalizar(inicio ? termo.slice(0, -1) : termo).replace(/ /g, " ");
  return new RegExp(`(?:^| )${base}${inicio ? "" : "(?= |$)"}`, "g");
}

const EXPRESSOES = new Map(CATEGORIAS_DOS_POSTS.flatMap((categoria) => categoria.termos.map((termo) => [termo, expressao(termo)] as const)));

function ocorrencias(textoNormalizado: string, termo: string): number {
  return textoNormalizado.match(EXPRESSOES.get(termo) as RegExp)?.length ?? 0;
}

export type Classificacao = { slug: string; motivo: string };

// Classifica um post pelo título e, sem acerto no título, pelo texto.
export function classificarPost(titulo: string, texto: string): Classificacao {
  const tituloNormalizado = normalizar(titulo);
  for (const categoria of CATEGORIAS_DOS_POSTS) {
    const termo = categoria.termos.find((item) => ocorrencias(tituloNormalizado, item) > 0);
    if (termo) return { slug: categoria.slug, motivo: `título com "${termo.replace("*", "")}"` };
  }
  const textoNormalizado = normalizar(texto);
  const contagens = CATEGORIAS_DOS_POSTS.map((categoria) => ({ categoria, total: categoria.termos.reduce((soma, termo) => soma + ocorrencias(textoNormalizado, termo), 0) }));
  // Empate: vale a ordem de precedência (a primeira da lista).
  const melhor = contagens.reduce((atual, item) => (item.total > atual.total ? item : atual), contagens[0]);
  if (melhor.total >= MINIMO_NO_TEXTO) return { slug: melhor.categoria.slug, motivo: `texto com ${melhor.total} termos da categoria` };
  return { slug: CATEGORIA_GERAL.slug, motivo: "nenhuma regra (título sem termo; texto com menos de 3 termos de uma categoria)" };
}
