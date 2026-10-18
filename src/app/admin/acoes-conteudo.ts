"use server";

// Ações de servidor do conteúdo do painel (posts e artigos). Profissionais:
// acoes-profissionais.ts; tópicos dos artigos: acoes-topicos.ts.
// Toda ação começa por exigirPapelDoPainel(): sem papel, nada é lido nem gravado.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { gerarSlug } from "@/lib/slug";
import { gravarArtigo, type DadosDoArtigo } from "@/lib/gravacao/artigos";
import { gravarPost, type DadosDoPost } from "@/lib/gravacao/posts";
import { lerIdDaMidiaEscolhida } from "@/lib/midia/regras";
import { ehIdDeDocumentoValido, lerListaDoFormulario, lerTextoDoFormulario } from "@/lib/validacao";

// Limites de tamanho dos campos curtos. Textos longos (conteúdo e resumo) não
// têm limite aqui.
const LIMITE_TITULO = 200;
const LIMITE_URL = 2048;
const LIMITE_TAGS_POR_ARTIGO = 20;
const LIMITE_AUTORES = 300;
const LIMITE_ACAO = 20;

// O botão clicado decide o status: "publicar" publica; qualquer outro valor
// salva como rascunho.
function lerStatus(dados: FormData): "publicado" | "rascunho" {
  const acao = lerTextoDoFormulario(dados, "acao", { rotulo: "Ação", limite: LIMITE_ACAO });
  return acao === "publicar" ? "publicado" : "rascunho";
}

// Sem o campo antigo "imagem" (endereço da capa): ele saiu do formulário e o
// valor já gravado não é alterado (ver lib/gravacao/posts.ts).
function lerDadosDoPost(dados: FormData, capaMidiaId: string | null): DadosDoPost {
  const titulo = lerTextoDoFormulario(dados, "titulo", { rotulo: "Título", limite: LIMITE_TITULO });
  return {
    titulo,
    conteudo: lerTextoDoFormulario(dados, "conteudo", { rotulo: "Conteúdo" }),
    status: lerStatus(dados),
    // O slug é refeito a partir do título também ao editar (comportamento atual).
    slug: gerarSlug(titulo),
    capaMidiaId,
  };
}

// Campos do artigo vindos do formulário. A existência da categoria, das tags
// e da imagem é conferida na gravação (lib/gravacao/artigos.ts).
function lerDadosDoArtigo(dados: FormData, imagemMidiaId: string | null): DadosDoArtigo {
  const categoria = dados.get("categoria");
  if (!ehIdDeDocumentoValido(categoria)) throw new Error("Escolha uma categoria.");
  const tags = lerListaDoFormulario(dados, "tags", { rotulo: "Tags", limite: LIMITE_TAGS_POR_ARTIGO });
  if (!tags.every(ehIdDeDocumentoValido)) throw new Error("Tag não encontrada.");
  return {
    titulo: lerTextoDoFormulario(dados, "titulo", { rotulo: "Título", limite: LIMITE_TITULO }),
    categoria,
    tags,
    autores: lerTextoDoFormulario(dados, "autores", { rotulo: "Autores", limite: LIMITE_AUTORES }),
    link: lerTextoDoFormulario(dados, "link", { rotulo: "Link", limite: LIMITE_URL }),
    resumo: lerTextoDoFormulario(dados, "resumo", { rotulo: "Resumo" }),
    status: lerStatus(dados),
    imagemMidiaId,
  };
}

// Resposta do formulário de post (useActionState): só existe quando algo dá
// errado; com sucesso, a ação leva de volta para a lista.
export type RespostaDoPost = { ok: false; mensagem: string; erros?: { capaMidiaId?: string } } | null;

// Cria (sem id) ou atualiza (com id) um post. Erros voltam para a tela em
// português, sem perder o que foi digitado.
async function gravarPostDoFormulario(id: string | null, formData: FormData): Promise<RespostaDoPost> {
  const capa = lerIdDaMidiaEscolhida(formData.get("capaMidiaId"));
  if (!capa.ok) return { ok: false, mensagem: "Confira os campos marcados.", erros: { capaMidiaId: "Capa inválida. Escolha a capa de novo." } };

  let dados: DadosDoPost;
  try {
    dados = lerDadosDoPost(formData, capa.id);
  } catch (erro) {
    // Só as mensagens da validação (em português) chegam aqui.
    return { ok: false, mensagem: erro instanceof Error ? erro.message : "Confira os campos." };
  }

  try {
    const gravado = await gravarPost(firestoreAdmin(), id, dados);
    if (!gravado.ok) {
      return gravado.campo ? { ok: false, mensagem: "Confira os campos marcados.", erros: { [gravado.campo]: gravado.mensagem } } : { ok: false, mensagem: gravado.mensagem };
    }
  } catch (erro) {
    console.error("Falha ao salvar post:", erro);
    return { ok: false, mensagem: "Não foi possível salvar agora. Tente de novo em instantes." };
  }

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  redirect("/admin/blog");
}

export async function salvarPost(_anterior: RespostaDoPost, formData: FormData): Promise<RespostaDoPost> {
  await exigirPapelDoPainel();
  return gravarPostDoFormulario(null, formData);
}

export async function atualizarPost(_anterior: RespostaDoPost, formData: FormData): Promise<RespostaDoPost> {
  await exigirPapelDoPainel();
  const id = formData.get("id");
  if (!ehIdDeDocumentoValido(id)) return { ok: false, mensagem: "Post não encontrado." };
  return gravarPostDoFormulario(id, formData);
}

// Resposta do formulário de artigo (useActionState): só existe quando algo dá
// errado; com sucesso, a ação leva de volta para a lista.
export type RespostaDoArtigo = { ok: false; mensagem: string; erros?: { imagemMidiaId?: string; categoria?: string } } | null;

// Cria (sem id) ou atualiza (com id) um artigo. Erros voltam para a tela em
// português, sem perder o que foi digitado.
async function gravarArtigoDoFormulario(id: string | null, formData: FormData): Promise<RespostaDoArtigo> {
  const imagem = lerIdDaMidiaEscolhida(formData.get("imagemMidiaId"));
  if (!imagem.ok) return { ok: false, mensagem: "Confira os campos marcados.", erros: { imagemMidiaId: "Imagem inválida. Escolha a imagem de novo." } };

  let dados: DadosDoArtigo;
  try {
    dados = lerDadosDoArtigo(formData, imagem.id);
  } catch (erro) {
    // Só as mensagens da validação (em português) chegam aqui.
    return { ok: false, mensagem: erro instanceof Error ? erro.message : "Confira os campos." };
  }

  try {
    const gravado = await gravarArtigo(firestoreAdmin(), id, dados);
    if (!gravado.ok) {
      return gravado.campo ? { ok: false, mensagem: "Confira os campos marcados.", erros: { [gravado.campo]: gravado.mensagem } } : { ok: false, mensagem: gravado.mensagem };
    }
  } catch (erro) {
    console.error("Falha ao salvar artigo:", erro);
    return { ok: false, mensagem: "Não foi possível salvar agora. Tente de novo em instantes." };
  }

  revalidatePath("/admin/artigos");
  revalidatePath("/artigos");
  revalidatePath("/artigos/[slug]", "page");
  revalidatePath("/artigos/categoria/[slug]", "page");
  redirect("/admin/artigos");
}

export async function salvarArtigo(_anterior: RespostaDoArtigo, formData: FormData): Promise<RespostaDoArtigo> {
  await exigirPapelDoPainel();
  return gravarArtigoDoFormulario(null, formData);
}

export async function atualizarArtigo(_anterior: RespostaDoArtigo, formData: FormData): Promise<RespostaDoArtigo> {
  await exigirPapelDoPainel();
  const id = formData.get("id");
  if (!ehIdDeDocumentoValido(id)) return { ok: false, mensagem: "Artigo não encontrado." };
  return gravarArtigoDoFormulario(id, formData);
}
