"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { exigirSessaoDoPainel } from "@/lib/auth/sessao";

export async function salvarPost(formData: FormData) {
  await exigirSessaoDoPainel();

  const titulo = formData.get("titulo")?.toString() || "";
  const imagem = formData.get("imagem")?.toString() || "";
  const conteudo = formData.get("conteudo")?.toString() || "";
  const acao = formData.get("acao")?.toString();
  
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
  await exigirSessaoDoPainel();

  const titulo = formData.get("titulo")?.toString() || "";
  const categoria = formData.get("categoria")?.toString() || "";
  const autores = formData.get("autores")?.toString() || "";
  const link = formData.get("link")?.toString() || "";
  const resumo = formData.get("resumo")?.toString() || "";
  const acao = formData.get("acao")?.toString();
  
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
