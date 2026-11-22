// Cupons de desconto da loja (21/11/2026, pedido do responsável). Regras
// puras, sem dependências: usadas pelo painel, pela loja, pelo cálculo do
// pedido e pelos testes. O cupom é um percentual sobre o subtotal dos
// produtos (o frete não entra). O documento cupons/{CODIGO} usa o próprio
// código, em maiúsculas, como id.

export const COLECAO_CUPONS = "cupons";

// Cookie com o código aplicado no carrinho (só o código; o servidor confere
// no Firestore a cada vez). Caminho /loja, como o carrinho de visitante.
export const NOME_COOKIE_CUPOM = "cupom_loja";
export const CAMINHO_COOKIE_CUPOM = "/loja";
export const VALIDADE_COOKIE_CUPOM_S = 60 * 60 * 24;

export const LIMITES_DO_CUPOM = { codigoMinimo: 3, codigoMaximo: 20, percentualMinimo: 1, percentualMaximo: 99 } as const;

export type Cupom = { codigo: string; percentual: number; ativo: boolean; usos: number };

// Código em maiúsculas, sem espaços nas pontas.
export function normalizarCodigo(valor: unknown): string {
  return typeof valor === "string" ? valor.trim().toUpperCase() : "";
}

// Letras sem acento, números, hífen e sublinhado (também serve de id).
export function codigoValido(codigo: string): boolean {
  const { codigoMinimo, codigoMaximo } = LIMITES_DO_CUPOM;
  return codigo.length >= codigoMinimo && codigo.length <= codigoMaximo && /^[A-Z0-9_-]+$/.test(codigo);
}

// Percentual inteiro de 1 a 99 (aceita "10", "10%" e " 10 ").
export function lerPercentual(valor: unknown): number | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.replace("%", "").trim();
  if (!/^\d{1,3}$/.test(limpo)) return null;
  const numero = Number(limpo);
  return numero >= LIMITES_DO_CUPOM.percentualMinimo && numero <= LIMITES_DO_CUPOM.percentualMaximo ? numero : null;
}

export type ResultadoDoCupom = { ok: true; codigo: string; percentual: number; ativo: boolean } | { ok: false; erros: { codigo?: string; percentual?: string } };

// Formulário do painel (cadastro e edição).
export function validarCupom(dados: FormData, exigirCodigo = true): ResultadoDoCupom {
  const erros: { codigo?: string; percentual?: string } = {};
  const codigo = normalizarCodigo(dados.get("codigo"));
  if (exigirCodigo && !codigoValido(codigo)) {
    erros.codigo = `Use de ${LIMITES_DO_CUPOM.codigoMinimo} a ${LIMITES_DO_CUPOM.codigoMaximo} caracteres: letras sem acento, números, hífen ou sublinhado.`;
  }
  const percentual = lerPercentual(dados.get("percentual"));
  if (percentual === null) erros.percentual = `Digite um número inteiro de ${LIMITES_DO_CUPOM.percentualMinimo} a ${LIMITES_DO_CUPOM.percentualMaximo}.`;
  if (Object.keys(erros).length > 0) return { ok: false, erros };
  return { ok: true, codigo, percentual: percentual as number, ativo: dados.get("ativo") === "sim" };
}

// Leitura tolerante do documento; null se o percentual for inválido.
export function lerCupom(codigo: string, dados: Record<string, unknown> | undefined): Cupom | null {
  if (!dados) return null;
  const percentual = typeof dados.percentual === "number" && Number.isInteger(dados.percentual) ? dados.percentual : NaN;
  if (!(percentual >= LIMITES_DO_CUPOM.percentualMinimo && percentual <= LIMITES_DO_CUPOM.percentualMaximo)) return null;
  const usos = typeof dados.usos === "number" && Number.isInteger(dados.usos) && dados.usos >= 0 ? dados.usos : 0;
  return { codigo, percentual, ativo: dados.ativo === true, usos };
}

// Desconto em centavos sobre o subtotal, arredondado para baixo (o total
// dos produtos nunca chega a zero, porque o percentual vai até 99).
export function calcularDesconto(subtotal: number, percentual: number): number {
  if (!Number.isInteger(subtotal) || subtotal <= 0) return 0;
  if (!Number.isInteger(percentual) || percentual < 1 || percentual > 99) return 0;
  return Math.floor((subtotal * percentual) / 100);
}

export const MENSAGEM_CUPOM_INVALIDO = "Cupom inválido ou inativo. Confira o código.";
