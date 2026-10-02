// Coleções do Firestore com conversores tipados. SOMENTE no servidor.
import "server-only";

import type { DocumentData, FirestoreDataConverter, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import type { Artigo, Post, Profissional } from "./tipos";

// Qualquer valor que não seja texto vira texto vazio.
function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
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

export function lerPosts() {
  return firestoreAdmin().collection("posts").withConverter(conversorPost);
}

export function lerArtigos() {
  return firestoreAdmin().collection("artigos").withConverter(conversorArtigo);
}

export function lerProfissionais() {
  return firestoreAdmin().collection("profissionais").withConverter(conversorProfissional);
}
