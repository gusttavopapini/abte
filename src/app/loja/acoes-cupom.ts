"use server";

// Cupom no carrinho (21/11/2026): aplicar confere o código no Firestore e
// guarda só o código num cookie da loja; o desconto é recalculado no
// servidor no carrinho e ao finalizar a compra.
import { revalidatePath } from "next/cache";
import { gravarCodigoDoCupom, lerCupomAtivo } from "@/lib/dados/cupons";
import { MENSAGEM_CUPOM_INVALIDO, normalizarCodigo } from "@/lib/loja/cupons";

export type RespostaDoCupom = { ok: boolean; mensagem: string } | null;

export async function aplicarCupom(_anterior: RespostaDoCupom, dados: FormData): Promise<RespostaDoCupom> {
  const codigo = normalizarCodigo(dados.get("codigo"));
  if (!codigo) return { ok: false, mensagem: "Digite o código do cupom." };
  try {
    const cupom = await lerCupomAtivo(codigo);
    if (!cupom) return { ok: false, mensagem: MENSAGEM_CUPOM_INVALIDO };
    await gravarCodigoDoCupom(cupom.codigo);
    revalidatePath("/loja/carrinho");
    return { ok: true, mensagem: `Cupom ${cupom.codigo} aplicado: ${cupom.percentual}% de desconto nos produtos.` };
  } catch (falha) {
    console.error("Cupom: falha ao conferir.", falha instanceof Error ? falha.message : falha);
    return { ok: false, mensagem: "Não foi possível conferir o cupom agora. Tente de novo em instantes." };
  }
}

export async function removerCupom(): Promise<RespostaDoCupom> {
  await gravarCodigoDoCupom(null);
  revalidatePath("/loja/carrinho");
  return { ok: true, mensagem: "Cupom removido." };
}
