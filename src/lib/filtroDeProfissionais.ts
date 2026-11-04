// Filtro de /profissionais por tipo e por estado (04/11/2026). Funções puras,
// usadas pela página no navegador e pelos testes de unidade. As opções de
// estado nascem dos dados: só aparecem estados (e países de fora do Brasil)
// que têm profissional. Nada é inventado: profissional do Brasil sem UF só
// aparece em "Todos os estados".
import { NOMES_DAS_UFS, PAISES, TAGS_DE_PROFISSIONAIS, UFS } from "../config/profissionais.ts";

export const TODOS_OS_TIPOS = "Todos";

// Região escolhida: todos, uma UF do Brasil ou um país de fora do Brasil.
export type RegiaoDoFiltro = { tipo: "todos" } | { tipo: "uf"; uf: string } | { tipo: "pais"; pais: string };

export type OpcaoDeRegiao = { valor: string; rotulo: string; regiao: RegiaoDoFiltro };

type ComRegiao = { pais: string; uf: string };
type ComTipo = { tipo: string };

const ehUf = (valor: string) => (UFS as readonly string[]).includes(valor);
const nomeDoPais = (codigo: string) => PAISES.find((pais) => pais.codigo === codigo)?.nome ?? null;

// Valor da opção no select (também o que vai ao endereço): "uf:SP", "pais:BO".
export function valorDaRegiao(regiao: RegiaoDoFiltro): string {
  return regiao.tipo === "uf" ? `uf:${regiao.uf}` : regiao.tipo === "pais" ? `pais:${regiao.pais}` : "";
}

// Opções do select: "Todos os estados"; depois os estados com profissional,
// em ordem alfabética pelo nome ("São Paulo (SP)"); depois os países de fora
// do Brasil com profissional, também pelo nome.
export function opcoesDeRegiao(profissionais: ComRegiao[]): OpcaoDeRegiao[] {
  const ufs = new Set<string>();
  const paises = new Set<string>();
  for (const { pais, uf } of profissionais) {
    if (pais === "BR" && ehUf(uf)) ufs.add(uf);
    else if (pais !== "BR" && nomeDoPais(pais)) paises.add(pais);
  }
  const porNome = (a: OpcaoDeRegiao, b: OpcaoDeRegiao) => a.rotulo.localeCompare(b.rotulo, "pt-BR");
  const estados = [...ufs]
    .map((uf): OpcaoDeRegiao => ({ valor: `uf:${uf}`, rotulo: `${NOMES_DAS_UFS[uf as keyof typeof NOMES_DAS_UFS]} (${uf})`, regiao: { tipo: "uf", uf } }))
    .sort(porNome);
  const deFora = [...paises].map((pais): OpcaoDeRegiao => ({ valor: `pais:${pais}`, rotulo: nomeDoPais(pais) as string, regiao: { tipo: "pais", pais } })).sort(porNome);
  return [{ valor: "", rotulo: "Todos os estados", regiao: { tipo: "todos" } }, ...estados, ...deFora];
}

// Região pelo endereço (?uf=SP ou ?pais=BO), só se estiver entre as opções;
// qualquer outro valor cai em "Todos os estados". Com os dois, vale a UF.
export function regiaoDoEndereco(parametros: { get(nome: string): string | null }, opcoes: OpcaoDeRegiao[]): RegiaoDoFiltro {
  const uf = (parametros.get("uf") ?? "").toUpperCase();
  const pais = (parametros.get("pais") ?? "").toUpperCase();
  const valores = new Set(opcoes.map((opcao) => opcao.valor));
  if (uf && valores.has(`uf:${uf}`)) return { tipo: "uf", uf };
  if (pais && pais !== "BR" && valores.has(`pais:${pais}`)) return { tipo: "pais", pais };
  return { tipo: "todos" };
}

// Tipo pelo endereço (?tag=...); fora da lista, "Todos".
export function tipoDoEndereco(parametros: { get(nome: string): string | null }): string {
  const tag = parametros.get("tag");
  return tag && (TAGS_DE_PROFISSIONAIS as readonly string[]).includes(tag) ? tag : TODOS_OS_TIPOS;
}

// Interseção do tipo com a região.
export function filtrarProfissionais<T extends ComRegiao & ComTipo>(profissionais: T[], tipo: string, regiao: RegiaoDoFiltro): T[] {
  return profissionais.filter((profissional) => {
    if (tipo !== TODOS_OS_TIPOS && profissional.tipo !== tipo) return false;
    if (regiao.tipo === "uf") return profissional.pais === "BR" && profissional.uf === regiao.uf;
    if (regiao.tipo === "pais") return profissional.pais === regiao.pais;
    return true;
  });
}

// "12 profissionais encontrados." / "1 profissional encontrado."
export function textoDaQuantidade(quantidade: number): string {
  if (quantidade === 0) return "Nenhum profissional encontrado com esses filtros.";
  return quantidade === 1 ? "1 profissional encontrado." : `${quantidade} profissionais encontrados.`;
}
