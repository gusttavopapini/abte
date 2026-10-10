"use server";

// Ações de servidor do diretório de profissionais.
// Toda ação começa por exigirPapelDoPainel(): sem papel, nada é lido nem gravado.
// As respostas trazem a mensagem para a tela (e os erros de cada campo), em português.
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { validarProfissional, type CampoDoProfissional } from "@/lib/profissionais";
import { ehIdDeDocumentoValido } from "@/lib/validacao";

export type RespostaDoProfissional = {
  ok: boolean;
  mensagem: string;
  erros?: Partial<Record<CampoDoProfissional, string>>;
};

const ERRO_GENERICO = "Não foi possível salvar agora. Tente de novo em instantes.";

function atualizarPaginas() {
  revalidatePath("/admin/profissionais");
  revalidatePath("/profissionais");
}

function colecao() {
  return firestoreAdmin().collection("profissionais");
}

// Cria (sem id) ou atualiza (com id) um profissional.
export async function salvarProfissional(_anterior: RespostaDoProfissional | null, dados: FormData): Promise<RespostaDoProfissional> {
  await exigirPapelDoPainel();
  const id = dados.get("id");
  if (id !== null && id !== "" && !ehIdDeDocumentoValido(id)) return { ok: false, mensagem: "Profissional não encontrado." };

  const resultado = validarProfissional(dados);
  if (!resultado.ok) {
    return { ok: false, mensagem: "Confira os campos marcados.", erros: resultado.erros };
  }

  try {
    const agora = new Date();
    if (typeof id === "string" && id) {
      const referencia = colecao().doc(id);
      const atual = await referencia.get();
      if (!atual.exists) return { ok: false, mensagem: "Profissional não encontrado." };
      await referencia.update({ ...resultado.dados, atualizadoEm: agora });
    } else {
      await colecao().add({ ...resultado.dados, criadoEm: agora, atualizadoEm: agora, excluidoEm: null });
    }
  } catch (erro) {
    console.error("Falha ao salvar profissional:", erro);
    return { ok: false, mensagem: ERRO_GENERICO };
  }

  atualizarPaginas();
  return { ok: true, mensagem: `"${resultado.dados.nome}" foi salvo.` };
}

// Muda o campo excluidoEm: preenchido manda para os excluídos (some do site),
// vazio restaura. Nada é apagado de vez pelo painel.
async function marcarExclusao(dados: FormData, excluir: boolean): Promise<RespostaDoProfissional> {
  const id = dados.get("id");
  if (!ehIdDeDocumentoValido(id)) return { ok: false, mensagem: "Profissional não encontrado." };
  try {
    const referencia = colecao().doc(id);
    const atual = await referencia.get();
    if (!atual.exists) return { ok: false, mensagem: "Profissional não encontrado." };
    await referencia.update({ excluidoEm: excluir ? FieldValue.serverTimestamp() : null, atualizadoEm: new Date() });
    atualizarPaginas();
    const nome = String(atual.get("nome") ?? "");
    return { ok: true, mensagem: excluir ? `"${nome}" foi para os excluídos e saiu do site.` : `"${nome}" foi restaurado.` };
  } catch (erro) {
    console.error("Falha ao excluir ou restaurar profissional:", erro);
    return { ok: false, mensagem: excluir ? "Não foi possível excluir agora. Tente de novo em instantes." : "Não foi possível restaurar agora. Tente de novo em instantes." };
  }
}

export async function excluirProfissional(_anterior: RespostaDoProfissional | null, dados: FormData): Promise<RespostaDoProfissional> {
  await exigirPapelDoPainel();
  return marcarExclusao(dados, true);
}

export async function restaurarProfissional(_anterior: RespostaDoProfissional | null, dados: FormData): Promise<RespostaDoProfissional> {
  await exigirPapelDoPainel();
  return marcarExclusao(dados, false);
}
