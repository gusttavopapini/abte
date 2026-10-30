"use server";

// Ações de servidor das páginas institucionais (30/10/2026, /admin/paginas).
// Cada uma começa por exigirPapelDoPainel("paginas.editar") (só
// administrador) e chama a gravação (src/lib/gravacao/paginas.ts), que
// registra em logAlteracoes. Ao salvar, o cache das páginas e o site público
// são revalidados (página e rodapé), sem novo deploy.
import { revalidatePath, revalidateTag } from "next/cache";
import { autorDaAlteracao, exigirPapelDoPainel } from "@/lib/auth/sessao";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { salvarPaginaInstitucional } from "@/lib/gravacao/paginas";
import { ETIQUETA_DAS_PAGINAS, lerPaginaDoFormulario } from "@/lib/site/paginas";

export type RespostaDaPagina = { ok: boolean; mensagem: string; erros?: Partial<Record<"titulo" | "corpo" | "publicada", string>> } | null;

export async function salvarPagina(_anterior: RespostaDaPagina, dados: FormData): Promise<RespostaDaPagina> {
  const usuario = await exigirPapelDoPainel("paginas.editar");
  const lido = lerPaginaDoFormulario({ slug: dados.get("slug"), titulo: dados.get("titulo"), corpo: dados.get("corpo"), publicada: dados.get("publicada") });
  if (!lido.ok) return { ok: false, mensagem: lido.mensagem, erros: lido.erros };
  try {
    const gravada = await salvarPaginaInstitucional(firestoreAdmin(), lido.slug, lido.dados, autorDaAlteracao(usuario));
    revalidateTag(ETIQUETA_DAS_PAGINAS, { expire: 0 });
    revalidatePath("/", "layout");
    return { ok: true, mensagem: lido.dados.publicada ? `${gravada.nome} salva e publicada. O site e o rodapé já mostram a página.` : `${gravada.nome} salva como rascunho. A página não aparece no site.` };
  } catch (erro) {
    console.error("Falha ao salvar a página institucional:", erro);
    return { ok: false, mensagem: "Não foi possível salvar agora. Tente de novo em instantes." };
  }
}
