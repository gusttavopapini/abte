"use server";

// Ações de servidor do conteúdo do painel (posts e artigos). Profissionais:
// acoes-profissionais.ts; tópicos dos artigos: acoes-topicos.ts.
// Toda ação começa por exigirPapelDoPainel(): sem papel, nada é lido nem gravado.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { gerarSlug } from "@/lib/slug";
import { COLECAO_DE_TOPICOS } from "@/lib/dados/colecoes";
import { ehIdDeDocumentoValido, lerListaDoFormulario, lerTextoDoFormulario } from "@/lib/validacao";

// Limites de tamanho dos campos curtos. Textos longos (conteúdo e resumo) não
// têm limite aqui.
const LIMITE_TITULO = 200;
const LIMITE_URL = 2048;
const LIMITE_TAGS_POR_ARTIGO = 20;
const LIMITE_AUTORES = 300;
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

// Confere no servidor que a categoria e as tags existem e não estão na lixeira.
async function lerTopicosDoArtigo(dados: FormData) {
  const categoria = dados.get("categoria");
  if (!ehIdDeDocumentoValido(categoria)) throw new Error("Escolha uma categoria.");
  const tags = lerListaDoFormulario(dados, "tags", { rotulo: "Tags", limite: LIMITE_TAGS_POR_ARTIGO });
  if (!tags.every(ehIdDeDocumentoValido)) throw new Error("Tag não encontrada.");

  const db = firestoreAdmin();
  const referencias = [
    db.collection(COLECAO_DE_TOPICOS.categoria).doc(categoria),
    ...tags.map((tag) => db.collection(COLECAO_DE_TOPICOS.tag).doc(tag)),
  ];
  const documentos = await db.getAll(...referencias);
  if (documentos.some((documento) => !documento.exists || documento.get("excluidoEm"))) {
    throw new Error("A categoria ou uma das tags não existe mais. Recarregue a página e escolha de novo.");
  }
  return { categoria, tags };
}

async function lerDadosDoArtigo(dados: FormData) {
  return {
    titulo: lerTextoDoFormulario(dados, "titulo", { rotulo: "Título", limite: LIMITE_TITULO }),
    ...(await lerTopicosDoArtigo(dados)),
    autores: lerTextoDoFormulario(dados, "autores", { rotulo: "Autores", limite: LIMITE_AUTORES }),
    link: lerTextoDoFormulario(dados, "link", { rotulo: "Link", limite: LIMITE_URL }),
    resumo: lerTextoDoFormulario(dados, "resumo", { rotulo: "Resumo" }),
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
  await firestoreAdmin().collection("artigos").add({ ...(await lerDadosDoArtigo(formData)), criadoEm: agora, atualizadoEm: agora });

  revalidatePath("/admin/artigos");
  revalidatePath("/artigos");
  redirect("/admin/artigos");
}

export async function atualizarArtigo(formData: FormData) {
  await exigirPapelDoPainel();
  const id = validarId(formData.get("id"));
  await firestoreAdmin().collection("artigos").doc(id).update({ ...(await lerDadosDoArtigo(formData)), atualizadoEm: new Date() });

  revalidatePath("/admin/artigos");
  revalidatePath("/artigos");
  redirect("/admin/artigos");
}
