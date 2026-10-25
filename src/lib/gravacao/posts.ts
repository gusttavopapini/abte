// Gravação dos posts do blog no Firestore. Sem sessão e sem "server-only",
// como gravacao/profissionais.ts: recebe o Firestore por parâmetro e é usada
// pelas ações de servidor (acoes-conteudo.ts, que conferem sessão e papel
// antes) e pelos testes no emulador. Ainda sem registro de alterações (fica
// para a etapa 3).
import type { Firestore } from "firebase-admin/firestore";
import { escolhaDeMidiaValida } from "../midia/biblioteca.ts";
import { escolherSlugUnico, gerarSlug } from "../slug.ts";

export const COLECAO_POSTS = "posts";
// Mesmos nomes de COLECAO_DE_TOPICOS em lib/dados/colecoes.ts (server-only).
const COLECAO_CATEGORIAS = "categoriasDePosts";
const COLECAO_TAGS = "tagsDePosts";

export const MENSAGEM_TOPICO_DO_POST_INDISPONIVEL = "A categoria ou uma das tags não existe mais. Recarregue a página e escolha de novo.";

export const MENSAGEM_CAPA_INDISPONIVEL = "A capa escolhida não está mais na biblioteca (foi para a lixeira ou excluída). Escolha outra ou remova a capa.";

// O slug não vem do formulário: é gerado aqui, na criação (P16).
export type DadosDoPost = {
  titulo: string;
  conteudo: string;
  status: "publicado" | "rascunho";
  capaMidiaId: string | null;
  // Classificação (25/10/2026): id em categoriasDePosts (null: sem
  // categoria) e ids em tagsDePosts.
  categoria: string | null;
  tags: string[];
};

// regerarSlug: só quando alguém pede explicitamente um endereço novo a partir
// do título (o endereço antigo deixa de funcionar).
export type OpcoesDoPost = { regerarSlug?: boolean };

type Falha = { ok: false; mensagem: string; campo?: "capaMidiaId" | "categoria" };

// Cria (id null) ou atualiza um post. O campo antigo "imagem" (endereço de
// capa digitado) nunca é gravado nem apagado aqui: o valor que já existe fica
// como está e só aparece no site enquanto o post não tiver capaMidiaId.
// Slug (P16, corrigida em 22/10/2026): gerado a partir do título só na
// criação, único entre os posts (lidos na mesma transação); editar o título
// não muda o endereço. Post antigo sem slug ganha um na primeira gravação.
export async function gravarPost(db: Firestore, id: string | null, dados: DadosDoPost, opcoes: OpcoesDoPost = {}): Promise<{ ok: true; id: string; slug: string } | Falha> {
  const colecao = db.collection(COLECAO_POSTS);
  const referencia = id ? colecao.doc(id) : colecao.doc();
  const atual = id ? await referencia.get() : null;
  if (atual && !atual.exists) return { ok: false, mensagem: "Post não encontrado." };

  // Categoria e tags precisam existir e estar fora da lixeira (inativa vale,
  // como nos artigos).
  const topicos = await Promise.all([
    ...(dados.categoria ? [db.collection(COLECAO_CATEGORIAS).doc(dados.categoria).get()] : []),
    ...dados.tags.map((tag) => db.collection(COLECAO_TAGS).doc(tag).get()),
  ]);
  if (topicos.some((documento) => !documento.exists || documento.get("excluidoEm"))) {
    return { ok: false, mensagem: MENSAGEM_TOPICO_DO_POST_INDISPONIVEL, campo: "categoria" };
  }

  if (!(await escolhaDeMidiaValida(db, dados.capaMidiaId, atual?.get("capaMidiaId") ?? null))) {
    return { ok: false, mensagem: MENSAGEM_CAPA_INDISPONIVEL, campo: "capaMidiaId" };
  }

  const agora = new Date();
  // Coleção pequena: lida inteira na transação só quando precisa de slug novo.
  const slug = await db.runTransaction(async (transacao) => {
    const gravado = atual ? await transacao.get(referencia) : null;
    const slugAtual = gravado?.get("slug");
    let escolhido = typeof slugAtual === "string" && slugAtual.trim() ? slugAtual : null;
    if (!escolhido || opcoes.regerarSlug) {
      const existentes = await transacao.get(colecao.select("slug"));
      const emUso = new Set(existentes.docs.filter((documento) => documento.id !== referencia.id).map((documento) => String(documento.get("slug") ?? "")));
      escolhido = escolherSlugUnico(gerarSlug(dados.titulo) || "post", emUso);
    }
    if (atual) transacao.update(referencia, { ...dados, slug: escolhido, atualizadoEm: agora });
    else transacao.create(referencia, { ...dados, slug: escolhido, criadoEm: agora, atualizadoEm: agora });
    return escolhido;
  });
  return { ok: true, id: referencia.id, slug };
}
