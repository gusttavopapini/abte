// Gravação dos posts do blog no Firestore. Sem sessão e sem "server-only",
// como gravacao/profissionais.ts: recebe o Firestore por parâmetro e é usada
// pelas ações de servidor (acoes-conteudo.ts, que conferem sessão e papel
// antes) e pelos testes no emulador. Desde 04/11/2026, com o autor, cada
// criação e edição grava no registro de alterações na mesma transação.
import type { Firestore } from "firebase-admin/firestore";
import { camposAlterados, registrarNaTransacao, type AutorDaAlteracao } from "../log/alteracoes.ts";
import { MENSAGENS_DA_LIXEIRA } from "../lixeira.ts";
import { escolhaDeMidiaValida, midiaPodeSerEscolhida } from "../midia/biblioteca.ts";
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
  // Só quando o formulário pede (imagem inserida no texto, 29/10/2026);
  // ausente, o formato gravado não muda.
  formatoConteudo?: "markdown";
};

// regerarSlug: só quando alguém pede explicitamente um endereço novo a partir
// do título (o endereço antigo deixa de funcionar).
// autor: grava a linha do registro de alterações (o painel sempre passa).
// extras: campos copiados na duplicação (resumo, idioma...), gravados junto.
export type OpcoesDoPost = { regerarSlug?: boolean; autor?: AutorDaAlteracao; extras?: Record<string, unknown>; resumoDoRegistro?: string };

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
  // Na lixeira, só se salva como rascunho: publicar exige restaurar antes
  // (decisão de 04/11/2026).
  if (atual?.get("excluidoEm") && dados.status === "publicado") return { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.naLixeira };

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
  return db.runTransaction(async (transacao) => {
    const gravado = atual ? await transacao.get(referencia) : null;
    // Outra pessoa pode excluir ou mandar para a lixeira durante as validações.
    if (atual && !gravado?.exists) return { ok: false as const, mensagem: "Post não encontrado." };
    if (gravado?.get("excluidoEm") && dados.status === "publicado") return { ok: false as const, mensagem: MENSAGENS_DA_LIXEIRA.naLixeira };
    const slugAtual = gravado?.get("slug");
    let escolhido = typeof slugAtual === "string" && slugAtual.trim() ? slugAtual : null;
    if (!escolhido || opcoes.regerarSlug) {
      const existentes = await transacao.get(colecao.select("slug"));
      const emUso = new Set(existentes.docs.filter((documento) => documento.id !== referencia.id).map((documento) => String(documento.get("slug") ?? "")));
      escolhido = escolherSlugUnico(gerarSlug(dados.titulo) || "post", emUso);
    }
    const extras = opcoes.extras ?? {};
    if (atual) transacao.update(referencia, { ...dados, ...extras, slug: escolhido, atualizadoEm: agora });
    else transacao.create(referencia, { ...dados, ...extras, slug: escolhido, criadoEm: agora, atualizadoEm: agora, excluidoEm: null });
    if (opcoes.autor) {
      registrarNaTransacao(db, transacao, opcoes.autor, {
        colecao: COLECAO_POSTS,
        documentoId: referencia.id,
        acao: atual ? "editar" : "criar",
        campos: atual ? camposAlterados(gravado?.data() ?? {}, { ...dados, ...extras, slug: escolhido }) : [...Object.keys(dados), ...Object.keys(extras), "slug"],
        resumo: opcoes.resumoDoRegistro ?? (atual ? "Post alterado." : "Post criado."),
      });
    }
    return { ok: true as const, id: referencia.id, slug: escolhido };
  });
}

// Campos copiados na duplicação além dos do formulário (os que o site mostra).
const CAMPOS_COPIADOS_DO_POST = ["resumo", "idioma", "tempoLeitura", "imagem"] as const;

// Título da cópia, dentro do limite do formulário.
export function tituloDaCopia(titulo: string, limite: number): string {
  return `Cópia de ${titulo}`.slice(0, limite).trim();
}

// Duplica um post (04/11/2026): cópia como rascunho, "Cópia de ...", slug
// novo, sem data de publicação nem dados da migração. A capa, a categoria e
// as tags só vão junto se ainda estiverem disponíveis. As imagens não são
// copiadas: a cópia aponta para as mesmas da biblioteca.
export async function duplicarPost(db: Firestore, id: string, autor: AutorDaAlteracao, limiteDoTitulo: number): Promise<{ ok: true; id: string; titulo: string } | Falha> {
  const original = await db.collection(COLECAO_POSTS).doc(id).get();
  if (!original.exists) return { ok: false, mensagem: "Post não encontrado." };
  const campos = original.data() ?? {};
  const categoria = typeof campos.categoria === "string" && campos.categoria ? campos.categoria : null;
  const tags: string[] = Array.isArray(campos.tags) ? campos.tags.filter((tag): tag is string => typeof tag === "string") : [];
  const referencias = [...(categoria ? [db.collection(COLECAO_CATEGORIAS).doc(categoria)] : []), ...tags.map((tag) => db.collection(COLECAO_TAGS).doc(tag))];
  const topicos = referencias.length > 0 ? await db.getAll(...referencias) : [];
  const disponiveis = new Set(topicos.filter((documento) => documento.exists && !documento.get("excluidoEm")).map((documento) => documento.ref.path));
  const capa = typeof campos.capaMidiaId === "string" && (await midiaPodeSerEscolhida(db, campos.capaMidiaId)) ? campos.capaMidiaId : null;
  const titulo = tituloDaCopia(String(campos.titulo ?? ""), limiteDoTitulo);
  const dados: DadosDoPost = {
    titulo,
    conteudo: String(campos.conteudo ?? ""),
    status: "rascunho",
    capaMidiaId: capa,
    categoria: categoria && disponiveis.has(`${COLECAO_CATEGORIAS}/${categoria}`) ? categoria : null,
    tags: tags.filter((tag) => disponiveis.has(`${COLECAO_TAGS}/${tag}`)),
    ...(campos.formatoConteudo === "markdown" ? { formatoConteudo: "markdown" as const } : {}),
  };
  const extras = Object.fromEntries(CAMPOS_COPIADOS_DO_POST.filter((campo) => campos[campo] !== undefined && campos[campo] !== null).map((campo) => [campo, campos[campo]]));
  const gravado = await gravarPost(db, null, dados, { autor, extras, resumoDoRegistro: "Post duplicado como rascunho." });
  return gravado.ok ? { ok: true, id: gravado.id, titulo } : gravado;
}
