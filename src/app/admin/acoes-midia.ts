"use server";

// Ações de servidor da biblioteca de mídia. Cada uma só confere sessão e
// papel (exigirPapelDoPainel com a ação, tabela em src/lib/auth/papeis.ts) e
// chama o módulo da biblioteca (src/lib/midia/biblioteca.ts), que faz o resto.
// As respostas trazem a mensagem para a tela, em português.
import { revalidatePath } from "next/cache";
import { autorDaAlteracao as autorDe, exigirPapelDoPainel } from "@/lib/auth/sessao";
import { editarAlt, enviarImagem, excluirDeVez, listarUsos, moverParaLixeiraOuRestaurar, type UsoDaMidia } from "@/lib/midia/biblioteca";
import { listarMidiasAtivas } from "@/lib/midia/exibicao";
import { LIMITE_DO_ARQUIVO_EM_BYTES, MENSAGENS } from "@/lib/midia/regras";
import { servicosDeMidia } from "@/lib/midia/servicos";
import type { MidiaNaTela } from "@/lib/midia/tela";
import { ehIdDeDocumentoValido } from "@/lib/validacao";

type CampoDaMidia = "arquivo" | "alt" | "autorizacao";

export type RespostaDaMidia = {
  ok: boolean;
  mensagem: string;
  erros?: Partial<Record<CampoDaMidia, string>>;
  // Imagem criada pelo envio (o seletor de mídia já a deixa escolhida).
  id?: string;
  // Onde a imagem está em uso, quando a exclusão pede confirmação.
  usos?: UsoDaMidia[];
};

// Telas que mostram imagens da biblioteca (além da própria /admin/midia).
function atualizarPaginas() {
  revalidatePath("/admin/midia");
  revalidatePath("/admin/profissionais");
  revalidatePath("/profissionais");
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
}

const NAO_ENCONTRADA: RespostaDaMidia = { ok: false, mensagem: "Imagem não encontrada." };

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
    return { ok: true, mensagem: "Imagem enviada para a biblioteca.", id: resultado.id };
  }, "Não foi possível enviar a imagem agora. Tente de novo em instantes.");
}

// Imagens fora da lixeira para o seletor de mídia dos formulários do painel.
export async function listarMidiasDoSeletor(): Promise<{ ok: boolean; mensagem: string; midias: MidiaNaTela[] }> {
  await exigirPapelDoPainel();
  try {
    return { ok: true, mensagem: "", midias: await listarMidiasAtivas() };
  } catch (erro) {
    console.error("Falha ao listar a biblioteca de mídia:", erro);
    return { ok: false, mensagem: "Não foi possível abrir a biblioteca agora. Tente de novo em instantes.", midias: [] };
  }
}

export async function editarAltDaMidia(_anterior: RespostaDaMidia | null, dados: FormData): Promise<RespostaDaMidia> {
  const usuario = await exigirPapelDoPainel("midia.editar");
  const id = dados.get("id");
  if (!ehIdDeDocumentoValido(id)) return NAO_ENCONTRADA;
  return comErroAmigavel(async () => {
    const resultado = await editarAlt(servicosDeMidia(), id, dados.get("alt"), autorDe(usuario));
    if (!resultado.ok) return falha(resultado.mensagem, resultado.campo);
    atualizarPaginas();
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
    const usos = await listarUsos(servicos.db, id);
    if (usos.length > 0 && dados.get("confirmarUso") !== "sim") {
      return { ok: false, mensagem: "Esta imagem está em uso nos registros abaixo. Se continuar, eles ficam sem a imagem no site até ela ser restaurada.", usos };
    }
    const resultado = await moverParaLixeiraOuRestaurar(servicos, id, true, autorDe(usuario));
    if (!resultado.ok) return falha(resultado.mensagem);
    atualizarPaginas();
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
    atualizarPaginas();
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
    atualizarPaginas();
    return { ok: true, mensagem: "Imagem excluída de vez." };
  }, "Não foi possível excluir de vez agora. Tente de novo em instantes.");
}
