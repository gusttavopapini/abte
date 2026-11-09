// Resumo de valores da caixa de compra da página do produto (08/11/2026).
// Função pura, usada no navegador só para EXIBIR: preço unitário e frete
// chegam do servidor; aqui só multiplica e soma, em centavos. O Checkout
// recalcula tudo no servidor (calcularPedido).
export const TEXTO_FRETE_A_COMBINAR = "Frete combinado após a compra";
export const TEXTO_SEM_FRETE_DIGITAL = "Sem frete (produto digital)";

export type ResumoDaCompra = {
  quantidade: number;
  subtotal: number;
  // Frete em centavos; null quando não há valor (combinado ou digital).
  frete: number | null;
  textoDoFrete: string | null;
  total: number;
};

// freteFixo: o valor de configuracoes/loja (centavos) ou null sem valor
// cadastrado. Frete só para produto físico, uma vez por pedido.
export function resumirCompra(precoUnitario: number, quantidade: number, tipo: "fisico" | "digital", freteFixo: number | null): ResumoDaCompra {
  const unidades = Number.isInteger(quantidade) && quantidade > 0 ? quantidade : 1;
  const subtotal = precoUnitario * unidades;
  if (tipo === "digital") return { quantidade: unidades, subtotal, frete: null, textoDoFrete: TEXTO_SEM_FRETE_DIGITAL, total: subtotal };
  if (freteFixo === null) return { quantidade: unidades, subtotal, frete: null, textoDoFrete: TEXTO_FRETE_A_COMBINAR, total: subtotal };
  return { quantidade: unidades, subtotal, frete: freteFixo, textoDoFrete: null, total: subtotal + freteFixo };
}

export function rotuloDoSubtotal(quantidade: number): string {
  return `Subtotal (${quantidade} ${quantidade === 1 ? "item" : "itens"})`;
}
