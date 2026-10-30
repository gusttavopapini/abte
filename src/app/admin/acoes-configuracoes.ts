"use server";

// Ações de servidor das configurações do site (30/10/2026,
// /admin/configuracoes). Cada uma começa por
// exigirPapelDoPainel("configuracoes.editar") (só administrador, tabela em
// src/lib/auth/papeis.ts) e chama a gravação (src/lib/gravacao/site.ts), que
// registra em logAlteracoes. Ao salvar, a etiqueta do cache das
// configurações e todo o site público são revalidados (menu, rodapé e
// páginas), sem novo deploy.
import { revalidatePath, updateTag } from "next/cache";
import { autorDaAlteracao, exigirPapelDoPainel } from "@/lib/auth/sessao";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { salvarArtigosAtivo, salvarPix } from "@/lib/gravacao/site";
import { ETIQUETA_DO_SITE, lerArtigosAtivoDoFormulario, lerPixDoFormulario } from "@/lib/site/configuracoes";

export type RespostaDasConfiguracoes = { ok: boolean; mensagem: string; erros?: Record<string, string> } | null;

const ERRO_GENERICO = "Não foi possível salvar agora. Tente de novo em instantes.";

// updateTag: quem salva vê a mudança na hora (sem servir a versão antiga).
function atualizarSite() {
  updateTag(ETIQUETA_DO_SITE);
  revalidatePath("/", "layout");
}

export async function salvarExibicaoDosArtigos(_anterior: RespostaDasConfiguracoes, dados: FormData): Promise<RespostaDasConfiguracoes> {
  const usuario = await exigirPapelDoPainel("configuracoes.editar");
  const lido = lerArtigosAtivoDoFormulario(dados.get("artigosAtivo"));
  if (!lido.ok) return { ok: false, mensagem: lido.mensagem };
  try {
    await salvarArtigosAtivo(firestoreAdmin(), lido.artigosAtivo, autorDaAlteracao(usuario));
    atualizarSite();
    return { ok: true, mensagem: lido.artigosAtivo ? "Artigos exibidos no site. O menu e o rodapé já mostram o item." : "Artigos escondidos do site. O menu e o rodapé já estão sem o item." };
  } catch (erro) {
    console.error("Falha ao salvar a exibição dos Artigos:", erro);
    return { ok: false, mensagem: ERRO_GENERICO };
  }
}

export async function salvarDoacoesPorPix(_anterior: RespostaDasConfiguracoes, dados: FormData): Promise<RespostaDasConfiguracoes> {
  const usuario = await exigirPapelDoPainel("configuracoes.editar");
  const lido = lerPixDoFormulario({ tipo: dados.get("tipo"), chave: dados.get("chave"), favorecido: dados.get("favorecido"), orientacao: dados.get("orientacao") });
  if (!lido.ok) return { ok: false, mensagem: lido.mensagem, erros: lido.erros };
  try {
    await salvarPix(firestoreAdmin(), lido.pix, autorDaAlteracao(usuario));
    atualizarSite();
    return { ok: true, mensagem: lido.pix ? "Pix salvo. A página Doe para a ABTE já mostra a chave." : "Pix removido. A página Doe para a ABTE volta ao texto provisório." };
  } catch (erro) {
    console.error("Falha ao salvar o Pix:", erro);
    return { ok: false, mensagem: ERRO_GENERICO };
  }
}
