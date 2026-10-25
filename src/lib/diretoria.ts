// Regras puras da página pública /diretoria (24/10/2026): quem aparece e em
// que ordem. Aparece só o membro com ativo = true e fora da lixeira; os
// membros ficam agrupados pelo período (o mais recente primeiro) e, dentro de
// cada período, pela ordem do cadastro e, no empate, pelo nome. Cargo, nome e
// período aparecem como estão no Firestore. Testado em
// testes/unidade/diretoria.test.mts.
import type { MembroDaDiretoria } from "./dados/tipos.ts";

export function membroVisivelNoSite(membro: Pick<MembroDaDiretoria, "ativo" | "excluidoEm">): boolean {
  return membro.ativo && !membro.excluidoEm;
}

export type GrupoDaDiretoria<T> = { periodo: string; membros: T[] };

// Membro sem período vai para um grupo próprio, depois dos outros.
export function diretoriaPorPeriodo<T extends Pick<MembroDaDiretoria, "ativo" | "excluidoEm" | "periodo" | "ordem" | "nome">>(membros: T[]): GrupoDaDiretoria<T>[] {
  const grupos = new Map<string, T[]>();
  for (const membro of membros.filter(membroVisivelNoSite)) {
    const periodo = membro.periodo.trim();
    grupos.set(periodo, [...(grupos.get(periodo) ?? []), membro]);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : b.localeCompare(a, "pt-BR")))
    .map(([periodo, doGrupo]) => ({ periodo, membros: [...doGrupo].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR")) }));
}

// Título de cada grupo (H2 da página).
export function tituloDoPeriodo(periodo: string): string {
  return periodo ? `Período ${periodo}` : "Período não informado";
}
