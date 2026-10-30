"use server";

// Ações de servidor das imagens da home (29/10/2026, /admin/home). Cada uma
// começa por exigirPapelDoPainel("home.editar") (tabela em
// src/lib/auth/papeis.ts) e chama a gravação (src/lib/gravacao/home.ts), que
// registra em logAlteracoes. Ao salvar, a home é revalidada e a mudança
// aparece sem novo deploy.
import { revalidatePath } from "next/cache";
import { autorDaAlteracao, exigirPapelDoPainel } from "@/lib/auth/sessao";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { excluirBanner, salvarBanner, salvarImagemDoEspaco } from "@/lib/gravacao/home";
import { ehChaveDeBanner, lerBannerDoFormulario, lerImagemDoEspacoDoFormulario } from "@/lib/site/home";

export type RespostaDaHome = { ok: boolean; mensagem: string; erros?: Partial<Record<"midiaId" | "alt" | "href" | "posicao" | "ativo", string>> } | null;

const ERRO_GENERICO = "Não foi possível salvar agora. Tente de novo em instantes.";

function atualizarPaginas() {
  revalidatePath("/");
  revalidatePath("/admin/home");
  revalidatePath("/admin/midia");
}

export async function salvarBannerDaHome(_anterior: RespostaDaHome, dados: FormData): Promise<RespostaDaHome> {
  const usuario = await exigirPapelDoPainel("home.editar");
  const lido = lerBannerDoFormulario({
    chave: dados.get("chave"),
    midiaId: dados.get("midiaId"),
    alt: dados.get("alt"),
    href: dados.get("href"),
    ativo: dados.get("ativo"),
    posicao: dados.get("posicao"),
  });
  if (!lido.ok) return { ok: false, mensagem: lido.mensagem, erros: lido.erros };
  try {
    const gravado = await salvarBanner(firestoreAdmin(), lido.dados, autorDaAlteracao(usuario));
    if (!gravado.ok) return gravado.campo ? { ok: false, mensagem: "Confira os campos marcados.", erros: { [gravado.campo]: gravado.mensagem } } : { ok: false, mensagem: gravado.mensagem };
    atualizarPaginas();
    return { ok: true, mensagem: `${gravado.nome} salvo. A home já mostra a mudança.` };
  } catch (erro) {
    console.error("Falha ao salvar o banner da home:", erro);
    return { ok: false, mensagem: ERRO_GENERICO };
  }
}

export async function excluirBannerDaHome(_anterior: RespostaDaHome, dados: FormData): Promise<RespostaDaHome> {
  const usuario = await exigirPapelDoPainel("home.editar");
  const chave = dados.get("chave");
  if (!ehChaveDeBanner(chave)) return { ok: false, mensagem: "Banner não encontrado. Recarregue a página." };
  try {
    const excluido = await excluirBanner(firestoreAdmin(), chave, autorDaAlteracao(usuario));
    if (!excluido.ok) return { ok: false, mensagem: excluido.mensagem };
    atualizarPaginas();
    return { ok: true, mensagem: `${excluido.nome} excluído. A imagem continua na biblioteca.` };
  } catch (erro) {
    console.error("Falha ao excluir o banner da home:", erro);
    return { ok: false, mensagem: "Não foi possível excluir agora. Tente de novo em instantes." };
  }
}

export async function salvarImagemDaSecao(_anterior: RespostaDaHome, dados: FormData): Promise<RespostaDaHome> {
  const usuario = await exigirPapelDoPainel("home.editar");
  const lido = lerImagemDoEspacoDoFormulario({ identificador: dados.get("identificador"), midiaId: dados.get("midiaId"), alt: dados.get("alt") });
  if (!lido.ok) return { ok: false, mensagem: lido.mensagem, erros: lido.erros };
  try {
    const gravado = await salvarImagemDoEspaco(firestoreAdmin(), lido.identificador, lido.imagem, autorDaAlteracao(usuario));
    if (!gravado.ok) return gravado.campo ? { ok: false, mensagem: "Confira os campos marcados.", erros: { [gravado.campo]: gravado.mensagem } } : { ok: false, mensagem: gravado.mensagem };
    atualizarPaginas();
    return { ok: true, mensagem: lido.imagem.midiaId ? `Imagem de "${gravado.nome}" salva. A home já mostra a mudança.` : `Imagem de "${gravado.nome}" removida. A home volta a mostrar o espaço padrão.` };
  } catch (erro) {
    console.error("Falha ao salvar a imagem da seção da home:", erro);
    return { ok: false, mensagem: ERRO_GENERICO };
  }
}
