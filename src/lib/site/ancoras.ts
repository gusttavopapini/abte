// Âncoras das seções da home (30/10/2026): identificador estável e o nome
// legível (o H2 de cada seção). Num lugar só: a home põe o id em cada
// seção, o painel lista as opções do link do banner e o servidor só aceita
// "#âncora" desta lista. Puro (sem dependências).
export const ANCORAS_DA_HOME = [
  { id: "o-que-fazemos", nome: "Juntos transformamos a jornada da escoliose no Brasil" },
  { id: "mutiroes", nome: "Mutirões que Transformam Vidas" },
  { id: "produtos", nome: "Produtos em destaque" },
  { id: "quem-somos", nome: "Quem Somos" },
  { id: "faca-parte", nome: "Faça parte dessa rede" },
] as const;

export type AncoraDaHome = (typeof ANCORAS_DA_HOME)[number]["id"];

export function ehAncoraDaHome(valor: unknown): valor is AncoraDaHome {
  return ANCORAS_DA_HOME.some((ancora) => ancora.id === valor);
}

// "#faca-parte" (ou "/#faca-parte") para o id da âncora, ou null.
export function ancoraDoLink(href: string): AncoraDaHome | null {
  const id = href.startsWith("/#") ? href.slice(2) : href.startsWith("#") ? href.slice(1) : null;
  return ehAncoraDaHome(id) ? id : null;
}
