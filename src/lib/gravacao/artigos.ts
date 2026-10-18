// Gravação dos artigos no Firestore. Sem sessão e sem "server-only", como
// gravacao/posts.ts: recebe o Firestore por parâmetro e é usada pelas ações
// de servidor (acoes-conteudo.ts, que conferem sessão e papel antes) e pelos
// testes no emulador. Ainda sem registro de alterações (fica para a etapa 3).
import type { Firestore } from "firebase-admin/firestore";
import { escolhaDeMidiaValida } from "../midia/biblioteca.ts";

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
export async function gravarArtigo(db: Firestore, id: string | null, dados: DadosDoArtigo): Promise<{ ok: true; id: string } | Falha> {
  const colecao = db.collection(COLECAO_ARTIGOS);
  const referencia = id ? colecao.doc(id) : colecao.doc();
  const atual = id ? await referencia.get() : null;
  if (atual && !atual.exists) return { ok: false, mensagem: "Artigo não encontrado." };

  const topicos = await db.getAll(db.collection(COLECAO_CATEGORIAS).doc(dados.categoria), ...dados.tags.map((tag) => db.collection(COLECAO_TAGS).doc(tag)));
  if (topicos.some((documento) => !documento.exists || documento.get("excluidoEm"))) {
    return { ok: false, mensagem: MENSAGEM_TOPICO_INDISPONIVEL, campo: "categoria" };
  }

  if (!(await escolhaDeMidiaValida(db, dados.imagemMidiaId, atual?.get("imagemMidiaId") ?? null))) {
    return { ok: false, mensagem: MENSAGEM_IMAGEM_INDISPONIVEL, campo: "imagemMidiaId" };
  }

  const agora = new Date();
  if (atual) await referencia.update({ ...dados, atualizadoEm: agora });
  else await referencia.create({ ...dados, criadoEm: agora, atualizadoEm: agora });
  return { ok: true, id: referencia.id };
}
