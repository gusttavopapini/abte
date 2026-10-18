"use server";

// Ações de servidor do diretório de profissionais.
// Toda ação começa por exigirPapelDoPainel(): sem papel, nada é lido nem gravado.
// A gravação (com o registro de alterações) fica em src/lib/gravacao/profissionais.ts.
// As respostas trazem a mensagem para a tela (e os erros de cada campo), em português.
import { revalidatePath } from "next/cache";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { autorDaAlteracao, exigirPapelDoPainel } from "@/lib/auth/sessao";
import { gravarProfissional, marcarExclusaoDoProfissional } from "@/lib/gravacao/profissionais";
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

// Cria (sem id) ou atualiza (com id) um profissional.
export async function salvarProfissional(_anterior: RespostaDoProfissional | null, dados: FormData): Promise<RespostaDoProfissional> {
  const usuario = await exigirPapelDoPainel();
  const id = dados.get("id");
  if (id !== null && id !== "" && !ehIdDeDocumentoValido(id)) return { ok: false, mensagem: "Profissional não encontrado." };

  const resultado = validarProfissional(dados);
  if (!resultado.ok) {
    return { ok: false, mensagem: "Confira os campos marcados.", erros: resultado.erros };
  }

  try {
    const gravado = await gravarProfissional(firestoreAdmin(), typeof id === "string" && id ? id : null, resultado.dados, autorDaAlteracao(usuario));
    if (!gravado.ok) {
      return gravado.campo
        ? { ok: false, mensagem: "Confira os campos marcados.", erros: { [gravado.campo]: gravado.mensagem } }
        : { ok: false, mensagem: gravado.mensagem };
    }
  } catch (erro) {
    console.error("Falha ao salvar profissional:", erro);
    return { ok: false, mensagem: ERRO_GENERICO };
  }

  atualizarPaginas();
  return { ok: true, mensagem: `"${resultado.dados.nome}" foi salvo.` };
}

async function marcarExclusao(dados: FormData, excluir: boolean): Promise<RespostaDoProfissional> {
  const usuario = await exigirPapelDoPainel();
  const id = dados.get("id");
  if (!ehIdDeDocumentoValido(id)) return { ok: false, mensagem: "Profissional não encontrado." };
  try {
    const resultado = await marcarExclusaoDoProfissional(firestoreAdmin(), id, excluir, autorDaAlteracao(usuario));
    if (!resultado.ok) return { ok: false, mensagem: resultado.mensagem };
    atualizarPaginas();
    return { ok: true, mensagem: excluir ? `"${resultado.nome}" foi para os excluídos e saiu do site.` : `"${resultado.nome}" foi restaurado.` };
  } catch (erro) {
    console.error("Falha ao excluir ou restaurar profissional:", erro);
    return { ok: false, mensagem: excluir ? "Não foi possível excluir agora. Tente de novo em instantes." : "Não foi possível restaurar agora. Tente de novo em instantes." };
  }
}

export async function excluirProfissional(_anterior: RespostaDoProfissional | null, dados: FormData): Promise<RespostaDoProfissional> {
  return marcarExclusao(dados, true);
}

export async function restaurarProfissional(_anterior: RespostaDoProfissional | null, dados: FormData): Promise<RespostaDoProfissional> {
  return marcarExclusao(dados, false);
}
