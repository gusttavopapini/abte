// Coleções do Firestore com conversores tipados. SOMENTE no servidor.
import "server-only";

import type { DocumentData, FirestoreDataConverter, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import type { Artigo, Post, Profissional, TipoDeTopico, TopicoDeArtigo } from "./tipos";

// Qualquer valor que não seja texto vira texto vazio.
function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

// Lista de textos; qualquer item que não seja texto é descartado.
function listaDeTextos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === "string") : [];
}

// Número finito; qualquer outra coisa vira 0.
function numero(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

// Timestamp do Firestore vira Date; qualquer outra coisa vira null.
function data(valor: unknown): Date | null {
  if (typeof valor !== "object" || valor === null || !("toDate" in valor) || typeof valor.toDate !== "function") {
    return null;
  }
  const convertida: unknown = valor.toDate();
  return convertida instanceof Date ? convertida : null;
}

// Os conversores servem só para LER. As gravações das ações do painel usam a
// coleção sem conversor.
function conversorDeLeitura<Modelo>(ler: (id: string, campos: DocumentData) => Modelo): FirestoreDataConverter<Modelo> {
  return {
    toFirestore() {
      throw new Error("Conversor somente de leitura: grave pela coleção sem conversor.");
    },
    fromFirestore(documento: QueryDocumentSnapshot) {
      return ler(documento.id, documento.data());
    },
  };
}

const conversorPost = conversorDeLeitura<Post>((id, campos) => ({
  id,
  titulo: texto(campos.titulo),
  imagem: texto(campos.imagem),
  conteudo: texto(campos.conteudo),
  status: texto(campos.status),
  slug: texto(campos.slug),
  criadoEm: data(campos.criadoEm),
  atualizadoEm: data(campos.atualizadoEm),
}));

const conversorArtigo = conversorDeLeitura<Artigo>((id, campos) => ({
  id,
  titulo: texto(campos.titulo),
  categoria: texto(campos.categoria),
  tags: listaDeTextos(campos.tags),
  autores: texto(campos.autores),
  link: texto(campos.link),
  resumo: texto(campos.resumo),
  status: texto(campos.status),
  criadoEm: data(campos.criadoEm),
  atualizadoEm: data(campos.atualizadoEm),
}));

const conversorProfissional = conversorDeLeitura<Profissional>((id, campos) => ({
  id,
  nome: texto(campos.nome),
  especialidade: texto(campos.especialidade),
  tag: texto(campos.tag),
  linkedinUrl: texto(campos.linkedinUrl),
  imagemUrl: texto(campos.imagemUrl),
  status: texto(campos.status),
  criadoEm: data(campos.criadoEm),
  atualizadoEm: data(campos.atualizadoEm),
}));

const conversorTopico = conversorDeLeitura<TopicoDeArtigo>((id, campos) => ({
  id,
  nome: texto(campos.nome),
  slug: texto(campos.slug),
  ordem: numero(campos.ordem),
  criadoEm: data(campos.criadoEm),
  atualizadoEm: data(campos.atualizadoEm),
  excluidoEm: data(campos.excluidoEm),
}));

// Nome da coleção de cada tipo de tópico de artigo.
export const COLECAO_DE_TOPICOS: Record<TipoDeTopico, string> = {
  categoria: "categoriasDeArtigos",
  tag: "tagsDeArtigos",
};

export function lerPosts() {
  return firestoreAdmin().collection("posts").withConverter(conversorPost);
}

export function lerArtigos() {
  return firestoreAdmin().collection("artigos").withConverter(conversorArtigo);
}

export function lerProfissionais() {
  return firestoreAdmin().collection("profissionais").withConverter(conversorProfissional);
}

export function lerTopicosDeArtigos(tipo: TipoDeTopico) {
  return firestoreAdmin().collection(COLECAO_DE_TOPICOS[tipo]).withConverter(conversorTopico);
}

// Ordem das listas de tópicos: pela ordem definida no painel e, no empate, pelo nome.
export function ordenarTopicos(topicos: TopicoDeArtigo[]): TopicoDeArtigo[] {
  return [...topicos].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
}

// Tópicos fora da lixeira, já ordenados. Coleções pequenas: lidas inteiras e
// filtradas aqui, sem índice composto no Firestore.
export async function listarTopicosAtivos(tipo: TipoDeTopico): Promise<TopicoDeArtigo[]> {
  const snapshot = await lerTopicosDeArtigos(tipo).get();
  return ordenarTopicos(snapshot.docs.map((documento) => documento.data()).filter((topico) => !topico.excluidoEm));
}
