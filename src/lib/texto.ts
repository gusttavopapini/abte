// Funções puras de texto para as telas (sem dependências; usadas também pelos
// testes de unidade).

const RETICENCIAS = "…";
// Pontuação que não deve ficar colada às reticências no fim do resumo.
const PONTUACAO_FINAL = /[\s,;:.!?(/\-\u2013\u2014]+$/u;

// Espaços, tabulações e quebras de linha viram um espaço só, sem sobras nas pontas.
export function normalizarEspacos(texto: string): string {
  return (texto ?? "").replace(/\s+/gu, " ").trim();
}

// Separa o texto em grafemas (o que a pessoa vê como um caractere): emoji com
// modificadores ou pares substitutos nunca são cortados ao meio.
function grafemas(texto: string): string[] {
  const segmentador = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });
  return Array.from(segmentador.segment(texto), (parte) => parte.segment);
}

// Versão curta de um texto: até `limite` caracteres visíveis, contando as
// reticências. Texto que cabe volta só com os espaços normalizados. Texto
// maior é cortado no fim da última palavra inteira que cabe, sem pontuação
// solta, e ganha "…". Uma palavra única maior que o limite é cortada nele.
export function resumirTexto(texto: string, limite: number): string {
  const limpo = normalizarEspacos(texto);
  const partes = grafemas(limpo);
  if (partes.length <= limite) return limpo;
  if (limite <= 1) return RETICENCIAS;

  // Cabe o texto mais as reticências.
  const cabem = partes.slice(0, limite - 1);
  // Se o próximo caractere é espaço, o corte já cai no fim de uma palavra.
  let corte = partes[limite - 1] === " " ? cabem.length : cabem.lastIndexOf(" ");
  if (corte <= 0) corte = cabem.length;

  const trecho = cabem.slice(0, corte).join("").replace(PONTUACAO_FINAL, "");
  return `${trecho || cabem.join("")}${RETICENCIAS}`;
}

// Parágrafos de um texto simples: cada linha com conteúdo vira um parágrafo,
// com os espaços normalizados. Nada é interpretado como HTML.
export function paragrafosDoTexto(texto: string): string[] {
  return (texto ?? "").split(/\r?\n/u).map(normalizarEspacos).filter(Boolean);
}
