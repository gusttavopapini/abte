// Ordem dos profissionais no site e no painel (10/11/2026, proposta aceita
// pelo responsável). Puro e sem dependências de servidor: roda na página, no
// navegador (filtros) e nos testes.
//
// - "Todos" sem filtro: agrupados na ordem do menu (Fisioterapeutas, Médicos,
//   Ortesistas parceiros, Psicólogos parceiros, Outros) e, em cada grupo, em
//   ordem alfabética pelo nome sem tratamento e sem acento.
// - Com filtro de tipo ou de estado: só a ordem alfabética.
// O campo "ordem" continua gravado, mas não manda mais na lista pública.
import { TAGS_DE_PROFISSIONAIS, TAG_SEM_CLASSIFICACAO } from "../config/profissionais.ts";

type ParaOrdenar = { id: string; tipo: string; nome: string };

// Tratamentos que às vezes aparecem no começo do nome (o painel tem um campo
// próprio, mas registros antigos podem trazer junto). Sem acento e em minúsculas.
const TRATAMENTOS = /^(?:(?:prof(?:essor|essora)?|dra?|ft|lic(?:enciad[ao])?|sr|sra)\.?\s+)+/;

// Nome como vale para a ordem: sem acento, minúsculo, sem tratamento no início.
export function nomeParaOrdenar(nome: string): string {
  const simples = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return simples.replace(TRATAMENTOS, "");
}

const COLADOR = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

// Posição do tipo na ordem do menu; fora da lista, a de "Outros".
export function posicaoDoTipo(tipo: string): number {
  const posicao = (TAGS_DE_PROFISSIONAIS as readonly string[]).indexOf(tipo);
  return posicao >= 0 ? posicao : (TAGS_DE_PROFISSIONAIS as readonly string[]).indexOf(TAG_SEM_CLASSIFICACAO);
}

export function compararPeloNome(a: ParaOrdenar, b: ParaOrdenar): number {
  return COLADOR.compare(nomeParaOrdenar(a.nome), nomeParaOrdenar(b.nome)) || a.id.localeCompare(b.id);
}

// Só a ordem alfabética (lista filtrada).
export function ordenarPeloNome<T extends ParaOrdenar>(lista: readonly T[]): T[] {
  return [...lista].sort(compararPeloNome);
}

// Grupos na ordem do menu e, dentro de cada um, a ordem alfabética.
export function ordenarPorTipoENome<T extends ParaOrdenar>(lista: readonly T[]): T[] {
  return [...lista].sort((a, b) => posicaoDoTipo(a.tipo) - posicaoDoTipo(b.tipo) || compararPeloNome(a, b));
}

// Ordem de /profissionais conforme os filtros: agrupada só sem filtro.
export function ordenarParaOsFiltros<T extends ParaOrdenar>(lista: readonly T[], filtrado: boolean): T[] {
  return filtrado ? ordenarPeloNome(lista) : ordenarPorTipoENome(lista);
}
