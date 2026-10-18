"use server";

// Ações de servidor da biblioteca de mídia. Cada uma só confere sessão e
// papel (exigirPapelDoPainel com a ação, tabela em src/lib/auth/papeis.ts) e
// chama o módulo da biblioteca (src/lib/midia/biblioteca.ts), que faz o resto.
// As respostas trazem a mensagem para a tela, em português.
import { revalidatePath } from "next/cache";
import { exigirPapelDoPainel, type UsuarioDoPainel } from "@/lib/auth/sessao";
import type { AutorDaAlteracao } from "@/lib/log/alteracoes";
import { contarUsos, editarAlt, enviarImagem, excluirDeVez, moverParaLixeiraOuRestaurar } from "@/lib/midia/biblioteca";
import { LIMITE_DO_ARQUIVO_EM_BYTES, MENSAGENS } from "@/lib/midia/regras";
import { servicosDeMidia } from "@/lib/midia/servicos";
import { ehIdDeDocumentoValido } from "@/lib/validacao";

type CampoDaMidia = "arquivo" | "alt" | "autorizacao";

export type RespostaDaMidia = {
  ok: boolean;
  mensagem: string;
  erros?: Partial<Record<CampoDaMidia, string>>;
  // Onde a imagem está em uso, quando a exclusão pede confirmação.
  usos?: { rotulo: string; quantidade: number }[];
};

const NAO_ENCONTRADA: RespostaDaMidia = { ok: false, mensagem: "Imagem não encontrada." };

function autorDe(usuario: UsuarioDoPainel): AutorDaAlteracao {
  return { uid: usuario.uid, nome: usuario.nome, papel: usuario.papel };
}

function falha(mensagem: string, campo?: CampoDaMidia): RespostaDaMidia {
  return campo ? { ok: false, mensagem, erros: { [campo]: mensagem } } : { ok: false, mensagem };
}

// Erros inesperados (rede, Firebase) ficam no log do servidor; a tela recebe
// só uma frase em português.
async function comErroAmigavel(executar: () => Promise<RespostaDaMidia>, mensagem: string): Promise<RespostaDaMidia> {
  try {
    return await executar();
  } catch (erro) {
    console.error("Falha na biblioteca de mídia:", erro);
    return { ok: false, mensagem };
  }
}

// Chamada direto pelo formulário de envio (não por useActionState), depois da
// redução da imagem no navegador.
export async function enviarMidia(dados: FormData): Promise<RespostaDaMidia> {
  const usuario = await exigirPapelDoPainel("midia.enviar");
  const arquivo = dados.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return falha(MENSAGENS.semArquivo, "arquivo");
  if (arquivo.size > LIMITE_DO_ARQUIVO_EM_BYTES) return falha(MENSAGENS.grande, "arquivo");

  return comErroAmigavel(async () => {
    const resultado = await enviarImagem(
      servicosDeMidia(),
      {
        bytes: new Uint8Array(await arquivo.arrayBuffer()),
        alt: dados.get("alt"),
        indicaMenor: dados.get("indicaMenor") === "sim",
        autorizacaoConfirmada: dados.get("autorizacao") === "sim",
      },
      autorDe(usuario),
    );
    if (!resultado.ok) return falha(resultado.mensagem, resultado.campo);
    revalidatePath("/admin/midia");
    return { ok: true, mensagem: "Imagem enviada para a biblioteca." };
  }, "Não foi possível enviar a imagem agora. Tente de novo em instantes.");
}

export async function editarAltDaMidia(_anterior: RespostaDaMidia | null, dados: FormData): Promise<RespostaDaMidia> {
  const usuario = await exigirPapelDoPainel("midia.editar");
  const id = dados.get("id");
  if (!ehIdDeDocumentoValido(id)) return NAO_ENCONTRADA;
  return comErroAmigavel(async () => {
    const resultado = await editarAlt(servicosDeMidia(), id, dados.get("alt"), autorDe(usuario));
    if (!resultado.ok) return falha(resultado.mensagem, resultado.campo);
    revalidatePath("/admin/midia");
    return { ok: true, mensagem: "Texto alternativo salvo." };
  }, "Não foi possível salvar agora. Tente de novo em instantes.");
}

// Imagem em uso: a primeira tentativa devolve onde ela aparece e só segue
// com a confirmação (campo confirmarUso).
export async function excluirMidia(_anterior: RespostaDaMidia | null, dados: FormData): Promise<RespostaDaMidia> {
  const usuario = await exigirPapelDoPainel("midia.excluir");
  const id = dados.get("id");
  if (!ehIdDeDocumentoValido(id)) return NAO_ENCONTRADA;
  return comErroAmigavel(async () => {
    const servicos = servicosDeMidia();
    const usos = await contarUsos(servicos.db, id);
    if (usos.length > 0 && dados.get("confirmarUso") !== "sim") {
      return { ok: false, mensagem: "Esta imagem está em uso. Se continuar, esses lugares passam a mostrar o espaço vazio de imagem.", usos };
    }
    const resultado = await moverParaLixeiraOuRestaurar(servicos, id, true, autorDe(usuario));
    if (!resultado.ok) return falha(resultado.mensagem);
    revalidatePath("/admin/midia");
    return { ok: true, mensagem: "Imagem movida para a lixeira. Ela saiu do site e pode ser restaurada." };
  }, "Não foi possível excluir agora. Tente de novo em instantes.");
}

export async function restaurarMidia(_anterior: RespostaDaMidia | null, dados: FormData): Promise<RespostaDaMidia> {
  const usuario = await exigirPapelDoPainel("midia.restaurar");
  const id = dados.get("id");
  if (!ehIdDeDocumentoValido(id)) return NAO_ENCONTRADA;
  return comErroAmigavel(async () => {
    const resultado = await moverParaLixeiraOuRestaurar(servicosDeMidia(), id, false, autorDe(usuario));
    if (!resultado.ok) return falha(resultado.mensagem);
    revalidatePath("/admin/midia");
    return { ok: true, mensagem: "Imagem restaurada." };
  }, "Não foi possível restaurar agora. Tente de novo em instantes.");
}

// Só administrador (tabela de permissões). Apaga os arquivos e o documento.
export async function excluirMidiaDeVez(_anterior: RespostaDaMidia | null, dados: FormData): Promise<RespostaDaMidia> {
  const usuario = await exigirPapelDoPainel("midia.excluirDeVez");
  const id = dados.get("id");
  if (!ehIdDeDocumentoValido(id)) return NAO_ENCONTRADA;
  return comErroAmigavel(async () => {
    const resultado = await excluirDeVez(servicosDeMidia(), id, autorDe(usuario));
    if (!resultado.ok) return falha(resultado.mensagem);
    revalidatePath("/admin/midia");
    return { ok: true, mensagem: "Imagem excluída de vez." };
  }, "Não foi possível excluir de vez agora. Tente de novo em instantes.");
}
