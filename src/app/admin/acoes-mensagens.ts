"use server";

// Ações de servidor das mensagens do formulário de contato (08/11/2026,
// /admin/mensagens). Cada uma começa por exigirPapelDoPainel("mensagens.ler")
// (só administrador, tabela em src/lib/auth/papeis.ts) e chama a gravação
// (src/lib/gravacao/contato.ts), que registra em logAlteracoes.
import { revalidatePath } from "next/cache";
import { autorDaAlteracao, exigirPapelDoPainel } from "@/lib/auth/sessao";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { marcarMensagemComoLida } from "@/lib/gravacao/contato";

export type RespostaDaMensagem = { ok: boolean; mensagem: string } | null;

export async function marcarComoLida(_anterior: RespostaDaMensagem, dados: FormData): Promise<RespostaDaMensagem> {
  const usuario = await exigirPapelDoPainel("mensagens.ler");
  const id = String(dados.get("id") ?? "");
  try {
    const resultado = await marcarMensagemComoLida(firestoreAdmin(), id, autorDaAlteracao(usuario));
    if (!resultado.ok) return { ok: false, mensagem: resultado.mensagem };
    revalidatePath("/admin/mensagens");
    revalidatePath(`/admin/mensagens/${id}`);
    return { ok: true, mensagem: resultado.mudou ? "Mensagem marcada como lida." : "Esta mensagem já estava marcada como lida." };
  } catch (erro) {
    console.error(`Mensagem ${id}: falha ao marcar como lida.`, erro);
    return { ok: false, mensagem: "Não foi possível marcar como lida agora. Tente de novo em instantes." };
  }
}
