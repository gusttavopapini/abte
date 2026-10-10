// Listas do cadastro de profissionais: uma só fonte para o submenu do header,
// o filtro da página /profissionais, o formulário do painel e a validação.
// Sem imports: usado também pelos testes de unidade.

// Tipo do profissional. Também é o filtro do site (?tag=...).
export const TAGS_DE_PROFISSIONAIS = ["Fisioterapeutas", "Médicos", "Ortesistas", "Psicólogos", "Outros"] as const;

export type TipoDeProfissional = (typeof TAGS_DE_PROFISSIONAIS)[number];

// Profissional sem tipo válido aparece em "Outros" no site.
export const TAG_SEM_CLASSIFICACAO = "Outros";

// Métodos de tratamento (ABTE_contexto_projeto.md, seção 1), sem nível.
export const METODOS = ["Schroth ISST", "BSPTS Conceito Rigo", "SEAS", "SSOL", "Lyon"] as const;

// Países de atuação da ABTE, com o código de discagem usado no WhatsApp.
export const PAISES = [
  { codigo: "BR", nome: "Brasil", ddi: "55" },
  { codigo: "PY", nome: "Paraguai", ddi: "595" },
  { codigo: "BO", nome: "Bolívia", ddi: "591" },
] as const;

export type CodigoDePais = (typeof PAISES)[number]["codigo"];

// Unidades da federação do Brasil (a UF só vale para profissionais no Brasil).
export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;
