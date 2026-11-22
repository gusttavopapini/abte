"use server";

// Ações do painel para os cupons da loja (21/11/2026). Só o administrador
// (permissão loja.configurar, a mesma do frete); cada uma começa pela
// checagem de sessão e papel e grava com o registro de alterações.
import { revalidatePath } from "next/cache";
import { autorDaAlteracao, exigirPapelDoPainel } from "@/lib/auth/sessao";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { atualizarCupom, criarCupom, excluirCupom } from "@/lib/gravacao/cupons";
import { codigoValido, normalizarCodigo, validarCupom } from "@/lib/loja/cupons";

export type RespostaDoCupomNoPainel = { ok: boolean; mensagem: string; erros?: { codigo?: string; percentual?: string } } | null;

const FALHA = "Não foi possível salvar agora. Tente de novo em instantes.";

function atualizarTelas() {
  revalidatePath("/admin/cupons");
  revalidatePath("/loja", "layout");
}

export async function criarCupomNoPainel(_anterior: RespostaDoCupomNoPainel, dados: FormData): Promise<RespostaDoCupomNoPainel> {
  const usuario = await exigirPapelDoPainel("loja.configurar");
  const resultado = validarCupom(dados);
  if (!resultado.ok) return { ok: false, mensagem: "Confira os campos destacados.", erros: resultado.erros };
  try {
    const erro = await criarCupom(firestoreAdmin(), resultado, autorDaAlteracao(usuario));
    if (erro) return { ok: false, mensagem: erro, erros: { codigo: erro } };
  } catch (falha) {
    console.error("Cupom: falha ao criar.", falha instanceof Error ? falha.message : falha);
    return { ok: false, mensagem: FALHA };
  }
  atualizarTelas();
  return { ok: true, mensagem: `Cupom ${resultado.codigo} criado com ${resultado.percentual}% de desconto.` };
}

export async function salvarCupomNoPainel(_anterior: RespostaDoCupomNoPainel, dados: FormData): Promise<RespostaDoCupomNoPainel> {
  const usuario = await exigirPapelDoPainel("loja.configurar");
  const codigo = normalizarCodigo(dados.get("codigo"));
  if (!codigoValido(codigo)) return { ok: false, mensagem: "Cupom não encontrado." };
  const resultado = validarCupom(dados, false);
  if (!resultado.ok) return { ok: false, mensagem: "Confira os campos destacados.", erros: resultado.erros };
  try {
    const erro = await atualizarCupom(firestoreAdmin(), codigo, { percentual: resultado.percentual, ativo: resultado.ativo }, autorDaAlteracao(usuario));
    if (erro) return { ok: false, mensagem: erro };
  } catch (falha) {
    console.error(`Cupom ${codigo}: falha ao salvar.`, falha instanceof Error ? falha.message : falha);
    return { ok: false, mensagem: FALHA };
  }
  atualizarTelas();
  return { ok: true, mensagem: `Cupom ${codigo} salvo.` };
}

export async function excluirCupomNoPainel(codigoRecebido: string): Promise<{ ok: boolean; mensagem: string }> {
  const usuario = await exigirPapelDoPainel("loja.configurar");
  const codigo = normalizarCodigo(codigoRecebido);
  if (!codigoValido(codigo)) return { ok: false, mensagem: "Cupom não encontrado." };
  try {
    const erro = await excluirCupom(firestoreAdmin(), codigo, autorDaAlteracao(usuario));
    if (erro) return { ok: false, mensagem: erro };
  } catch (falha) {
    console.error(`Cupom ${codigo}: falha ao excluir.`, falha instanceof Error ? falha.message : falha);
    return { ok: false, mensagem: "Não foi possível excluir agora. Tente de novo em instantes." };
  }
  atualizarTelas();
  return { ok: true, mensagem: `Cupom ${codigo} excluído.` };
}
