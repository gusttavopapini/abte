"use server";

// Ações de servidor do conteúdo do painel (posts, artigos e profissionais).
// Toda ação começa por exigirPapelDoPainel(): sem papel, nada é lido nem gravado.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { gerarSlug } from "@/lib/slug";
import { ehIdDeDocumentoValido, lerTextoDoFormulario } from "@/lib/validacao";

// Limites de tamanho dos campos curtos. Textos longos (conteúdo e resumo) não
// têm limite aqui.
const LIMITE_TITULO = 200;
const LIMITE_URL = 2048;
const LIMITE_CATEGORIA = 60;
const LIMITE_AUTORES = 300;
const LIMITE_NOME = 120;
const LIMITE_ESPECIALIDADE = 120;
const LIMITE_TAG = 40;
const LIMITE_ACAO = 20;

// Lê o id do documento e recusa qualquer valor que não seja um id válido do Firestore.
function validarId(id: unknown): string {
  if (!ehIdDeDocumentoValido(id)) throw new Error("Registro não encontrado.");
  return id;
}

// O botão clicado decide o status: "publicar" publica; qualquer outro valor
// salva como rascunho.
function lerStatus(dados: FormData): "publicado" | "rascunho" {
  const acao = lerTextoDoFormulario(dados, "acao", { rotulo: "Ação", limite: LIMITE_ACAO });
  return acao === "publicar" ? "publicado" : "rascunho";
}

function lerDadosDoPost(dados: FormData) {
  const titulo = lerTextoDoFormulario(dados, "titulo", { rotulo: "Título", limite: LIMITE_TITULO });
  return {
    titulo,
    imagem: lerTextoDoFormulario(dados, "imagem", { rotulo: "Imagem de capa", limite: LIMITE_URL }),
    conteudo: lerTextoDoFormulario(dados, "conteudo", { rotulo: "Conteúdo" }),
    status: lerStatus(dados),
    // O slug é refeito a partir do título também ao editar (comportamento atual).
    slug: gerarSlug(titulo),
  };
}

function lerDadosDoArtigo(dados: FormData) {
  return {
    titulo: lerTextoDoFormulario(dados, "titulo", { rotulo: "Título", limite: LIMITE_TITULO }),
    categoria: lerTextoDoFormulario(dados, "categoria", { rotulo: "Categoria", limite: LIMITE_CATEGORIA }),
    autores: lerTextoDoFormulario(dados, "autores", { rotulo: "Autores", limite: LIMITE_AUTORES }),
    link: lerTextoDoFormulario(dados, "link", { rotulo: "Link", limite: LIMITE_URL }),
    resumo: lerTextoDoFormulario(dados, "resumo", { rotulo: "Resumo" }),
    status: lerStatus(dados),
  };
}

function lerDadosDoProfissional(dados: FormData) {
  return {
    nome: lerTextoDoFormulario(dados, "nome", { rotulo: "Nome", limite: LIMITE_NOME }),
    especialidade: lerTextoDoFormulario(dados, "especialidade", { rotulo: "Especialidade", limite: LIMITE_ESPECIALIDADE }),
    tag: lerTextoDoFormulario(dados, "tag", { rotulo: "Tag", limite: LIMITE_TAG }),
    linkedinUrl: lerTextoDoFormulario(dados, "linkedinUrl", { rotulo: "URL do LinkedIn", limite: LIMITE_URL }),
    imagemUrl: lerTextoDoFormulario(dados, "imagemUrl", { rotulo: "URL da foto", limite: LIMITE_URL }),
    status: lerStatus(dados),
  };
}

export async function salvarPost(formData: FormData) {
  await exigirPapelDoPainel();
  const agora = new Date();
  await firestoreAdmin().collection("posts").add({ ...lerDadosDoPost(formData), criadoEm: agora, atualizadoEm: agora });

  revalidatePath("/admin/blog");
  redirect("/admin/blog");
}

export async function atualizarPost(formData: FormData) {
  await exigirPapelDoPainel();
  const id = validarId(formData.get("id"));
  await firestoreAdmin().collection("posts").doc(id).update({ ...lerDadosDoPost(formData), atualizadoEm: new Date() });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  redirect("/admin/blog");
}

export async function salvarArtigo(formData: FormData) {
  await exigirPapelDoPainel();
  const agora = new Date();
  await firestoreAdmin().collection("artigos").add({ ...lerDadosDoArtigo(formData), criadoEm: agora, atualizadoEm: agora });

  revalidatePath("/admin/artigos");
  redirect("/admin/artigos");
}

export async function atualizarArtigo(formData: FormData) {
  await exigirPapelDoPainel();
  const id = validarId(formData.get("id"));
  await firestoreAdmin().collection("artigos").doc(id).update({ ...lerDadosDoArtigo(formData), atualizadoEm: new Date() });

  revalidatePath("/admin/artigos");
  revalidatePath("/artigos");
  redirect("/admin/artigos");
}

export async function salvarProfissional(formData: FormData) {
  await exigirPapelDoPainel();
  const agora = new Date();
  await firestoreAdmin()
    .collection("profissionais")
    .add({ ...lerDadosDoProfissional(formData), criadoEm: agora, atualizadoEm: agora });

  revalidatePath("/admin/profissionais");
  revalidatePath("/profissionais");
  return { sucesso: true };
}

export async function atualizarProfissional(formData: FormData) {
  await exigirPapelDoPainel();
  const id = validarId(formData.get("id"));
  await firestoreAdmin()
    .collection("profissionais")
    .doc(id)
    .update({ ...lerDadosDoProfissional(formData), atualizadoEm: new Date() });

  revalidatePath("/admin/profissionais");
  revalidatePath("/profissionais");
  return { sucesso: true };
}

export async function excluirProfissional(id: unknown) {
  await exigirPapelDoPainel();
  await firestoreAdmin().collection("profissionais").doc(validarId(id)).delete();

  revalidatePath("/admin/profissionais");
  revalidatePath("/profissionais");
  return { sucesso: true };
}
