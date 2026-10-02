"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
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

// Lê o id do documento enviado pelo formulário e recusa qualquer valor que não
// seja um id válido do Firestore.
function lerIdDoFormulario(dados: FormData): string {
  const id = dados.get("id");
  if (!ehIdDeDocumentoValido(id)) throw new Error("Registro não encontrado.");
  return id;
}

export async function salvarPost(formData: FormData) {
  await exigirPapelDoPainel();

  const titulo = lerTextoDoFormulario(formData, "titulo", { rotulo: "Título", limite: LIMITE_TITULO });
  const imagem = lerTextoDoFormulario(formData, "imagem", { rotulo: "Imagem de capa", limite: LIMITE_URL });
  const conteudo = lerTextoDoFormulario(formData, "conteudo", { rotulo: "Conteúdo" });
  const acao = lerTextoDoFormulario(formData, "acao", { rotulo: "Ação", limite: LIMITE_ACAO });
  
  const status = acao === "publicar" ? "publicado" : "rascunho";
  
  // Cria um slug a partir do título (ex: "Meu Post Legal" -> "meu-post-legal")
  const slug = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  const db = firestoreAdmin();
  await db.collection("posts").add({
    titulo,
    imagem,
    conteudo,
    status,
    slug,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  });

  revalidatePath("/admin/blog");
  redirect("/admin/blog");
}

export async function salvarArtigo(formData: FormData) {
  await exigirPapelDoPainel();

  const titulo = lerTextoDoFormulario(formData, "titulo", { rotulo: "Título", limite: LIMITE_TITULO });
  const categoria = lerTextoDoFormulario(formData, "categoria", { rotulo: "Categoria", limite: LIMITE_CATEGORIA });
  const autores = lerTextoDoFormulario(formData, "autores", { rotulo: "Autores", limite: LIMITE_AUTORES });
  const link = lerTextoDoFormulario(formData, "link", { rotulo: "Link", limite: LIMITE_URL });
  const resumo = lerTextoDoFormulario(formData, "resumo", { rotulo: "Resumo" });
  const acao = lerTextoDoFormulario(formData, "acao", { rotulo: "Ação", limite: LIMITE_ACAO });
  
  const status = acao === "publicar" ? "publicado" : "rascunho";

  const db = firestoreAdmin();
  await db.collection("artigos").add({
    titulo,
    categoria,
    autores,
    link,
    resumo,
    status,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  });

  revalidatePath("/admin/artigos");
  redirect("/admin/artigos");
}

export async function atualizarPost(formData: FormData) {
  await exigirPapelDoPainel();

  const id = lerIdDoFormulario(formData);

  const titulo = lerTextoDoFormulario(formData, "titulo", { rotulo: "Título", limite: LIMITE_TITULO });
  const imagem = lerTextoDoFormulario(formData, "imagem", { rotulo: "Imagem de capa", limite: LIMITE_URL });
  const conteudo = lerTextoDoFormulario(formData, "conteudo", { rotulo: "Conteúdo" });
  const acao = lerTextoDoFormulario(formData, "acao", { rotulo: "Ação", limite: LIMITE_ACAO });
  
  const status = acao === "publicar" ? "publicado" : "rascunho";
  
  const slug = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  const db = firestoreAdmin();
  await db.collection("posts").doc(id).update({
    titulo,
    imagem,
    conteudo,
    status,
    slug,
    atualizadoEm: new Date(),
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  redirect("/admin/blog");
}

export async function atualizarArtigo(formData: FormData) {
  await exigirPapelDoPainel();

  const id = lerIdDoFormulario(formData);

  const titulo = lerTextoDoFormulario(formData, "titulo", { rotulo: "Título", limite: LIMITE_TITULO });
  const categoria = lerTextoDoFormulario(formData, "categoria", { rotulo: "Categoria", limite: LIMITE_CATEGORIA });
  const autores = lerTextoDoFormulario(formData, "autores", { rotulo: "Autores", limite: LIMITE_AUTORES });
  const link = lerTextoDoFormulario(formData, "link", { rotulo: "Link", limite: LIMITE_URL });
  const resumo = lerTextoDoFormulario(formData, "resumo", { rotulo: "Resumo" });
  const acao = lerTextoDoFormulario(formData, "acao", { rotulo: "Ação", limite: LIMITE_ACAO });
  
  const status = acao === "publicar" ? "publicado" : "rascunho";

  const db = firestoreAdmin();
  await db.collection("artigos").doc(id).update({
    titulo,
    categoria,
    autores,
    link,
    resumo,
    status,
    atualizadoEm: new Date(),
  });

  revalidatePath("/admin/artigos");
  revalidatePath("/artigos");
  redirect("/admin/artigos");
}

export async function salvarProfissional(formData: FormData) {
  await exigirPapelDoPainel();

  const nome = lerTextoDoFormulario(formData, "nome", { rotulo: "Nome", limite: LIMITE_NOME });
  const especialidade = lerTextoDoFormulario(formData, "especialidade", { rotulo: "Especialidade", limite: LIMITE_ESPECIALIDADE });
  const tag = lerTextoDoFormulario(formData, "tag", { rotulo: "Tag", limite: LIMITE_TAG });
  const linkedinUrl = lerTextoDoFormulario(formData, "linkedinUrl", { rotulo: "URL do LinkedIn", limite: LIMITE_URL });
  const imagemUrl = lerTextoDoFormulario(formData, "imagemUrl", { rotulo: "URL da foto", limite: LIMITE_URL });
  const acao = lerTextoDoFormulario(formData, "acao", { rotulo: "Ação", limite: LIMITE_ACAO });
  
  const status = acao === "publicar" ? "publicado" : "rascunho";

  const db = firestoreAdmin();
  await db.collection("profissionais").add({
    nome,
    especialidade,
    tag,
    linkedinUrl,
    imagemUrl,
    status,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  });

  revalidatePath("/admin/profissionais");
  revalidatePath("/profissionais");
  return { sucesso: true };
}

export async function atualizarProfissional(formData: FormData) {
  await exigirPapelDoPainel();

  const id = lerIdDoFormulario(formData);

  const nome = lerTextoDoFormulario(formData, "nome", { rotulo: "Nome", limite: LIMITE_NOME });
  const especialidade = lerTextoDoFormulario(formData, "especialidade", { rotulo: "Especialidade", limite: LIMITE_ESPECIALIDADE });
  const tag = lerTextoDoFormulario(formData, "tag", { rotulo: "Tag", limite: LIMITE_TAG });
  const linkedinUrl = lerTextoDoFormulario(formData, "linkedinUrl", { rotulo: "URL do LinkedIn", limite: LIMITE_URL });
  const imagemUrl = lerTextoDoFormulario(formData, "imagemUrl", { rotulo: "URL da foto", limite: LIMITE_URL });
  const acao = lerTextoDoFormulario(formData, "acao", { rotulo: "Ação", limite: LIMITE_ACAO });
  
  const status = acao === "publicar" ? "publicado" : "rascunho";

  const db = firestoreAdmin();
  await db.collection("profissionais").doc(id).update({
    nome,
    especialidade,
    tag,
    linkedinUrl,
    imagemUrl,
    status,
    atualizadoEm: new Date(),
  });

  revalidatePath("/admin/profissionais");
  revalidatePath("/profissionais");
  return { sucesso: true };
}

export async function excluirProfissional(id: unknown) {
  await exigirPapelDoPainel();
  if (!ehIdDeDocumentoValido(id)) throw new Error("Registro não encontrado.");

  const db = firestoreAdmin();
  await db.collection("profissionais").doc(id).delete();

  revalidatePath("/admin/profissionais");
  revalidatePath("/profissionais");
  return { sucesso: true };
}
