"use server";

// Ações de servidor comuns ao conteúdo do painel (04/11/2026): publicar e
// despublicar sem abrir o formulário, mover para a lixeira, restaurar,
// excluir de vez e duplicar. Toda ação começa por exigirPapelDoPainel() e
// confere a permissão do papel (tabela PERMISSOES) antes de ler ou gravar; a
// recusa volta como mensagem em português. A gravação, com o registro de
// alterações, fica em src/lib/gravacao/lixeira.ts.
import { revalidatePath } from "next/cache";
import { papelPodeExecutar, type AcaoDoPainel } from "@/lib/auth/papeis";
import { autorDaAlteracao, exigirPapelDoPainel, type UsuarioDoPainel } from "@/lib/auth/sessao";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { excluirDeVez, moverParaLixeira, mudarSituacao, restaurarDaLixeira, type ResultadoDaAcao } from "@/lib/gravacao/lixeira";
import { duplicarArtigo } from "@/lib/gravacao/artigos";
import { duplicarPost } from "@/lib/gravacao/posts";
import { LIMITE_TITULO_DO_ARTIGO, LIMITE_TITULO_DO_POST } from "@/lib/limitesDoConteudo";
import { COLECOES_DO_PAINEL, ehColecaoDoPainel, MENSAGENS_DA_LIXEIRA, type ColecaoDoPainel } from "@/lib/lixeira";
import { ehIdDeDocumentoValido } from "@/lib/validacao";

export type RespostaDaAcaoDoItem = { ok: boolean; mensagem: string; avisos?: string[]; novoId?: string };

const ERRO_GENERICO = "Não foi possível concluir agora. Tente de novo em instantes.";

const RECUSAS: Partial<Record<AcaoDoPainel, string>> = {
  "conteudo.excluirDeVez": "Só o administrador pode excluir de vez.",
};

// Páginas que mudam com cada coleção (painel e site).
const PAGINAS: Record<ColecaoDoPainel, [string, "page"?][]> = {
  posts: [["/admin/blog"], ["/blog"], ["/blog/[slug]", "page"]],
  artigos: [["/admin/artigos"], ["/artigos"], ["/artigos/[slug]", "page"], ["/artigos/categoria/[slug]", "page"]],
  profissionais: [["/admin/profissionais"], ["/profissionais"]],
  produtos: [["/admin/loja"], ["/loja"], ["/loja/produto/[slug]", "page"], ["/"]],
  categoriasDePosts: [["/admin/blog/topicos"], ["/blog"], ["/blog/[slug]", "page"]],
  tagsDePosts: [["/admin/blog/topicos"], ["/blog/[slug]", "page"]],
  categoriasDeArtigos: [["/admin/artigos/topicos"], ["/artigos"], ["/artigos/categoria/[slug]", "page"]],
  tagsDeArtigos: [["/admin/artigos/topicos"], ["/artigos/[slug]", "page"]],
  categoriasDeProdutos: [["/admin/loja/categorias"], ["/loja"]],
};

// Particípio no gênero do item ("restaurado", "restaurada").
function concordar(colecao: ColecaoDoPainel, palavra: string): string {
  return COLECOES_DO_PAINEL[colecao].artigo === "a" ? palavra.replace(/o$/, "a") : palavra;
}

function atualizarPaginas(colecao: ColecaoDoPainel) {
  for (const [caminho, tipo] of PAGINAS[colecao]) revalidatePath(caminho, tipo);
  revalidatePath("/admin");
}

type Preparo = { ok: true; usuario: UsuarioDoPainel; colecao: ColecaoDoPainel; id: string } | { ok: false; resposta: RespostaDaAcaoDoItem };

// Sessão, papel e permissão primeiro (sem papel, exigirPapelDoPainel
// interrompe); depois a coleção e o id, nada vem do navegador sem conferência.
async function preparar(acao: AcaoDoPainel, colecao: unknown, id: unknown): Promise<Preparo> {
  const usuario = await exigirPapelDoPainel();
  if (!papelPodeExecutar(usuario.papel, acao)) return { ok: false, resposta: { ok: false, mensagem: RECUSAS[acao] ?? "Seu papel não permite esta ação." } };
  if (!ehColecaoDoPainel(colecao) || !ehIdDeDocumentoValido(id)) return { ok: false, resposta: { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.naoEncontrado } };
  return { ok: true, usuario, colecao, id };
}

async function executar(preparo: Preparo, gravar: (preparado: Extract<Preparo, { ok: true }>) => Promise<ResultadoDaAcao>, mensagem: (nome: string, colecao: ColecaoDoPainel) => string): Promise<RespostaDaAcaoDoItem> {
  if (!preparo.ok) return preparo.resposta;
  try {
    const resultado = await gravar(preparo);
    if (!resultado.ok) return { ok: false, mensagem: resultado.mensagem };
    if (resultado.mudou) atualizarPaginas(preparo.colecao);
    return { ok: true, mensagem: mensagem(resultado.nome, preparo.colecao), avisos: resultado.avisos };
  } catch (erro) {
    console.error("Falha numa ação de conteúdo do painel:", erro);
    return { ok: false, mensagem: ERRO_GENERICO };
  }
}

export async function publicarOuDespublicar(colecao: unknown, id: unknown, publicar: boolean): Promise<RespostaDaAcaoDoItem> {
  const preparo = await preparar("conteudo.publicar", colecao, id);
  return executar(
    preparo,
    ({ usuario, colecao: c, id: i }) => mudarSituacao(firestoreAdmin(), c, i, publicar === true, autorDaAlteracao(usuario)),
    (nome, c) => {
      const regra = COLECOES_DO_PAINEL[c].situacao;
      if (publicar) return `"${nome}" foi ${regra?.ligado}.`;
      return `"${nome}" foi ${regra?.desligado}. ${COLECOES_DO_PAINEL[c].artigo === "a" ? "Ela" : "Ele"} não aparece mais no site.`;
    },
  );
}

export async function moverItemParaALixeira(colecao: unknown, id: unknown): Promise<RespostaDaAcaoDoItem> {
  const preparo = await preparar("conteudo.excluir", colecao, id);
  return executar(
    preparo,
    ({ usuario, colecao: c, id: i }) => moverParaLixeira(firestoreAdmin(), c, i, autorDaAlteracao(usuario)),
    (nome, c) => `"${nome}" foi para a lixeira e saiu do site.${COLECOES_DO_PAINEL[c].rascunhoNaLixeira ? ` Se for ${concordar(c, "restaurado")}, volta como rascunho.` : ""}`,
  );
}

export async function restaurarItemDaLixeira(colecao: unknown, id: unknown): Promise<RespostaDaAcaoDoItem> {
  const preparo = await preparar("conteudo.restaurar", colecao, id);
  return executar(
    preparo,
    ({ usuario, colecao: c, id: i }) => restaurarDaLixeira(firestoreAdmin(), c, i, autorDaAlteracao(usuario)),
    (nome, c) => `"${nome}" foi ${concordar(c, "restaurado")}${COLECOES_DO_PAINEL[c].rascunhoNaLixeira ? " como rascunho" : ""}.`,
  );
}

export async function excluirItemDeVez(colecao: unknown, id: unknown, confirmacao: unknown): Promise<RespostaDaAcaoDoItem> {
  const preparo = await preparar("conteudo.excluirDeVez", colecao, id);
  return executar(
    preparo,
    ({ usuario, colecao: c, id: i }) => excluirDeVez(firestoreAdmin(), c, i, confirmacao, autorDaAlteracao(usuario)),
    (nome, c) => `"${nome}" foi ${concordar(c, "excluído")} de vez.`,
  );
}

// Duplicar (posts e artigos nesta etapa; produtos na seguinte): cópia como
// rascunho, "Cópia de ...", sem slug nem publicação.
export async function duplicarItem(colecao: unknown, id: unknown): Promise<RespostaDaAcaoDoItem> {
  const preparo = await preparar("conteudo.editar", colecao, id);
  if (!preparo.ok) return preparo.resposta;
  const { usuario, colecao: c, id: i } = preparo;
  try {
    const autor = autorDaAlteracao(usuario);
    const copia =
      c === "posts" ? await duplicarPost(firestoreAdmin(), i, autor, LIMITE_TITULO_DO_POST) : c === "artigos" ? await duplicarArtigo(firestoreAdmin(), i, autor, LIMITE_TITULO_DO_ARTIGO) : null;
    if (!copia) return { ok: false, mensagem: "Este item não pode ser duplicado." };
    if (!copia.ok) return { ok: false, mensagem: copia.mensagem };
    atualizarPaginas(c);
    return { ok: true, mensagem: `Cópia criada como rascunho: "${copia.titulo}".`, novoId: copia.id };
  } catch (erro) {
    console.error("Falha ao duplicar no painel:", erro);
    return { ok: false, mensagem: ERRO_GENERICO };
  }
}
