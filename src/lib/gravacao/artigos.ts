// Gravação dos artigos no Firestore. Sem sessão e sem "server-only", como
// gravacao/posts.ts: recebe o Firestore por parâmetro e é usada pelas ações
// de servidor (acoes-conteudo.ts, que conferem sessão e papel antes) e pelos
// testes no emulador. Desde 04/11/2026, com o autor, cada criação e edição
// grava no registro de alterações no mesmo lote.
import type { Firestore } from "firebase-admin/firestore";
import { camposAlterados, registrarNoLote, type AutorDaAlteracao } from "../log/alteracoes.ts";
import { MENSAGENS_DA_LIXEIRA } from "../lixeira.ts";
import { escolhaDeMidiaValida, midiaPodeSerEscolhida } from "../midia/biblioteca.ts";

export const COLECAO_ARTIGOS = "artigos";
// Mesmos nomes de COLECAO_DE_TOPICOS em lib/dados/colecoes.ts (server-only).
const COLECAO_CATEGORIAS = "categoriasDeArtigos";
const COLECAO_TAGS = "tagsDeArtigos";

export const MENSAGEM_IMAGEM_INDISPONIVEL = "A imagem escolhida não está mais na biblioteca (foi para a lixeira ou excluída). Escolha outra ou remova a imagem.";
export const MENSAGEM_TOPICO_INDISPONIVEL = "A categoria ou uma das tags não existe mais. Recarregue a página e escolha de novo.";

export type DadosDoArtigo = {
  titulo: string;
  // Id do documento em categoriasDeArtigos; tags: ids em tagsDeArtigos.
  categoria: string;
  tags: string[];
  autores: string;
  link: string;
  resumo: string;
  status: "publicado" | "rascunho";
  imagemMidiaId: string | null;
};

type Falha = { ok: false; mensagem: string; campo?: "imagemMidiaId" | "categoria" };

// Cria (id null) ou atualiza um artigo. Confere que a categoria e as tags
// existem e estão fora da lixeira, e que a imagem escolhida pode ser usada
// (a mesma que já estava gravada passa, mesmo na lixeira da biblioteca).
// autor: grava a linha do registro de alterações (o painel sempre passa).
export type OpcoesDoArtigo = { autor?: AutorDaAlteracao; resumoDoRegistro?: string };

export async function gravarArtigo(db: Firestore, id: string | null, dados: DadosDoArtigo, opcoes: OpcoesDoArtigo = {}): Promise<{ ok: true; id: string } | Falha> {
  const colecao = db.collection(COLECAO_ARTIGOS);
  const referencia = id ? colecao.doc(id) : colecao.doc();
  const atual = id ? await referencia.get() : null;
  if (atual && !atual.exists) return { ok: false, mensagem: "Artigo não encontrado." };
  // Na lixeira, só se salva como rascunho: publicar exige restaurar antes.
  if (atual?.get("excluidoEm") && dados.status === "publicado") return { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.naLixeira };

  const topicos = await db.getAll(db.collection(COLECAO_CATEGORIAS).doc(dados.categoria), ...dados.tags.map((tag) => db.collection(COLECAO_TAGS).doc(tag)));
  if (topicos.some((documento) => !documento.exists || documento.get("excluidoEm"))) {
    return { ok: false, mensagem: MENSAGEM_TOPICO_INDISPONIVEL, campo: "categoria" };
  }

  if (!(await escolhaDeMidiaValida(db, dados.imagemMidiaId, atual?.get("imagemMidiaId") ?? null))) {
    return { ok: false, mensagem: MENSAGEM_IMAGEM_INDISPONIVEL, campo: "imagemMidiaId" };
  }

  const agora = new Date();
  const lote = db.batch();
  if (atual) lote.update(referencia, { ...dados, atualizadoEm: agora });
  else lote.create(referencia, { ...dados, criadoEm: agora, atualizadoEm: agora, excluidoEm: null });
  if (opcoes.autor) {
    registrarNoLote(db, lote, opcoes.autor, {
      colecao: COLECAO_ARTIGOS,
      documentoId: referencia.id,
      acao: atual ? "editar" : "criar",
      campos: atual ? camposAlterados(atual.data() ?? {}, dados) : Object.keys(dados),
      resumo: opcoes.resumoDoRegistro ?? (atual ? "Artigo alterado." : "Artigo criado."),
    });
  }
  await lote.commit();
  return { ok: true, id: referencia.id };
}

// Duplica um artigo (04/11/2026): cópia como rascunho, "Cópia de ...", sem
// slug nem data de publicação. A categoria é obrigatória: se a do original
// não está mais disponível, a cópia é recusada com a mensagem de sempre. As
// tags e a imagem só vão junto se ainda estiverem disponíveis.
export async function duplicarArtigo(db: Firestore, id: string, autor: AutorDaAlteracao, limiteDoTitulo: number): Promise<{ ok: true; id: string; titulo: string } | Falha> {
  const original = await db.collection(COLECAO_ARTIGOS).doc(id).get();
  if (!original.exists) return { ok: false, mensagem: "Artigo não encontrado." };
  const campos = original.data() ?? {};
  const tags: string[] = Array.isArray(campos.tags) ? campos.tags.filter((tag): tag is string => typeof tag === "string") : [];
  const documentosDasTags = tags.length > 0 ? await db.getAll(...tags.map((tag) => db.collection(COLECAO_TAGS).doc(tag))) : [];
  const tagsDisponiveis = documentosDasTags.filter((documento) => documento.exists && !documento.get("excluidoEm")).map((documento) => documento.id);
  const imagem = typeof campos.imagemMidiaId === "string" && (await midiaPodeSerEscolhida(db, campos.imagemMidiaId)) ? campos.imagemMidiaId : null;
  const titulo = `Cópia de ${String(campos.titulo ?? "")}`.slice(0, limiteDoTitulo).trim();
  const dados: DadosDoArtigo = {
    titulo,
    categoria: String(campos.categoria ?? ""),
    tags: tagsDisponiveis,
    autores: String(campos.autores ?? ""),
    link: String(campos.link ?? ""),
    resumo: String(campos.resumo ?? ""),
    status: "rascunho",
    imagemMidiaId: imagem,
  };
  if (!dados.categoria) return { ok: false, mensagem: MENSAGEM_TOPICO_INDISPONIVEL, campo: "categoria" };
  const gravado = await gravarArtigo(db, null, dados, { autor, resumoDoRegistro: "Artigo duplicado como rascunho." });
  return gravado.ok ? { ok: true, id: gravado.id, titulo } : gravado;
}
