// Coleções do Firestore com conversores tipados. SOMENTE no servidor.
import "server-only";

import type { DocumentData, FirestoreDataConverter, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import type { Artigo, Midia, Post, Produto, Profissional, TipoDeTopico, Topico, VarianteDeMidia } from "./tipos";

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
  capaMidiaId: texto(campos.capaMidiaId) || null,
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
  imagemMidiaId: texto(campos.imagemMidiaId) || null,
  status: texto(campos.status),
  criadoEm: data(campos.criadoEm),
  atualizadoEm: data(campos.atualizadoEm),
}));

const conversorProfissional = conversorDeLeitura<Profissional>((id, campos) => ({
  id,
  tipo: texto(campos.tipo),
  tratamento: texto(campos.tratamento),
  nome: texto(campos.nome),
  registro: texto(campos.registro),
  metodos: listaDeTextos(campos.metodos),
  pais: texto(campos.pais),
  uf: texto(campos.uf),
  cidades: listaDeTextos(campos.cidades),
  telerreabilitacao: campos.telerreabilitacao === true,
  whatsapp: texto(campos.whatsapp),
  instagram: texto(campos.instagram),
  facebook: texto(campos.facebook),
  email: texto(campos.email),
  bio: texto(campos.bio),
  ativo: campos.ativo === true,
  ordem: numero(campos.ordem),
  fotoMidiaId: texto(campos.fotoMidiaId) || null,
  criadoEm: data(campos.criadoEm),
  atualizadoEm: data(campos.atualizadoEm),
  excluidoEm: data(campos.excluidoEm),
}));

const conversorTopico = conversorDeLeitura<Topico>((id, campos) => ({
  id,
  nome: texto(campos.nome),
  slug: texto(campos.slug),
  ordem: numero(campos.ordem),
  imagemMidiaId: texto(campos.imagemMidiaId) || null,
  criadoEm: data(campos.criadoEm),
  atualizadoEm: data(campos.atualizadoEm),
  excluidoEm: data(campos.excluidoEm),
}));

// Nome da coleção de cada tipo de tópico (artigos e loja).
export const COLECAO_DE_TOPICOS: Record<TipoDeTopico, string> = {
  categoria: "categoriasDeArtigos",
  tag: "tagsDeArtigos",
  categoriaDeProduto: "categoriasDeProdutos",
};

// Inteiro maior ou igual a zero (preço em centavos); qualquer outra coisa vira null.
function centavos(valor: unknown): number | null {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0 ? valor : null;
}

const conversorProduto = conversorDeLeitura<Produto>((id, campos) => ({
  id,
  nome: texto(campos.nome),
  slug: texto(campos.slug),
  descricao: texto(campos.descricao),
  preco: centavos(campos.preco) ?? 0,
  precoPromocional: centavos(campos.precoPromocional),
  categoria: texto(campos.categoria),
  tipo: campos.tipo === "digital" ? "digital" : "fisico",
  status: campos.status === "esgotado" ? "esgotado" : "disponivel",
  selo: texto(campos.selo),
  ordem: numero(campos.ordem),
  publicado: campos.publicado === true,
  criadoEm: data(campos.criadoEm),
  atualizadoEm: data(campos.atualizadoEm),
  excluidoEm: data(campos.excluidoEm),
}));

// Variantes válidas de uma mídia; qualquer item malformado é descartado.
function variantes(valor: unknown): VarianteDeMidia[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({ largura: numero(item.largura), caminho: texto(item.caminho), tamanho: numero(item.tamanho) }))
    .filter((item) => item.largura > 0 && item.caminho !== "");
}

const conversorMidia = conversorDeLeitura<Midia>((id, campos) => ({
  id,
  caminhoStorage: texto(campos.caminhoStorage),
  tipo: "imagem",
  alt: texto(campos.alt),
  largura: numero(campos.largura),
  altura: numero(campos.altura),
  tamanho: numero(campos.tamanho),
  variantes: variantes(campos.variantes),
  enviadoPor: texto(campos.enviadoPor),
  indicaMenor: campos.indicaMenor === true,
  autorizacaoConfirmadaPor: typeof campos.autorizacaoConfirmadaPor === "string" ? campos.autorizacaoConfirmadaPor : null,
  autorizacaoConfirmadaEm: data(campos.autorizacaoConfirmadaEm),
  criadoEm: data(campos.criadoEm),
  excluidoEm: data(campos.excluidoEm),
}));

export function lerMidias() {
  return firestoreAdmin().collection("midias").withConverter(conversorMidia);
}

export function lerPosts() {
  return firestoreAdmin().collection("posts").withConverter(conversorPost);
}

export function lerArtigos() {
  return firestoreAdmin().collection("artigos").withConverter(conversorArtigo);
}

export function lerProfissionais() {
  return firestoreAdmin().collection("profissionais").withConverter(conversorProfissional);
}

export function lerTopicos(tipo: TipoDeTopico) {
  return firestoreAdmin().collection(COLECAO_DE_TOPICOS[tipo]).withConverter(conversorTopico);
}

// Ordem das listas de tópicos: pela ordem definida no painel e, no empate, pelo nome.
export function ordenarTopicos(topicos: Topico[]): Topico[] {
  return [...topicos].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
}

// Tópicos fora da lixeira, já ordenados. Coleções pequenas: lidas inteiras e
// filtradas aqui, sem índice composto no Firestore.
export async function listarTopicosAtivos(tipo: TipoDeTopico): Promise<Topico[]> {
  const snapshot = await lerTopicos(tipo).get();
  return ordenarTopicos(snapshot.docs.map((documento) => documento.data()).filter((topico) => !topico.excluidoEm));
}

// Ordem do diretório: pela ordem definida no painel e, no empate, pelo nome.
export function ordenarProfissionais(profissionais: Profissional[]): Profissional[] {
  return [...profissionais].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
}

export function lerProdutos() {
  return firestoreAdmin().collection("produtos").withConverter(conversorProduto);
}

// Ordem da loja: pela ordem definida no painel e, no empate, pelo nome.
export function ordenarProdutos(produtos: Produto[]): Produto[] {
  return [...produtos].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
}

// Produtos que aparecem no site: publicados e fora da lixeira, já ordenados.
export async function listarProdutosVisiveis(): Promise<Produto[]> {
  const snapshot = await lerProdutos().where("publicado", "==", true).get();
  return ordenarProdutos(snapshot.docs.map((documento) => documento.data()).filter((produto) => !produto.excluidoEm));
}
