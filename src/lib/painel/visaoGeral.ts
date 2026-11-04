// Regras puras da visão geral do painel (etapa 3, 04/11/2026): contagem de
// publicados, rascunhos e itens na lixeira de cada área, e o nome de cada
// coleção nas últimas alterações do registro. Sem Firebase; usadas pela
// página /admin e pelos testes de unidade.
import { situacaoDoItem, type ColecaoDoPainel } from "../lixeira.ts";

export type ContagemDaArea = { publicados: number; rascunhos: number; lixeira: number };

export function contarSituacoes(colecao: ColecaoDoPainel, documentos: Record<string, unknown>[]): ContagemDaArea {
  const contagem: ContagemDaArea = { publicados: 0, rascunhos: 0, lixeira: 0 };
  for (const dados of documentos) {
    const situacao = situacaoDoItem(colecao, dados);
    if (situacao === "lixeira") contagem.lixeira++;
    else if (situacao === "rascunho") contagem.rascunhos++;
    else contagem.publicados++;
  }
  return contagem;
}

// Mídia: só a lixeira conta (imagem não tem rascunho).
export function contarLixeira(documentos: Record<string, unknown>[]): number {
  return documentos.filter((dados) => Boolean(dados.excluidoEm)).length;
}

const ROTULOS_DAS_COLECOES: Record<string, string> = {
  posts: "Blog",
  artigos: "Artigos",
  profissionais: "Profissionais",
  produtos: "Loja",
  midias: "Mídia",
  configuracoes: "Home e configurações",
  paginasInstitucionais: "Páginas",
  categoriasDePosts: "Categorias do blog",
  tagsDePosts: "Tags do blog",
  categoriasDeArtigos: "Categorias dos artigos",
  tagsDeArtigos: "Tags dos artigos",
  categoriasDeProdutos: "Categorias da loja",
  diretoria: "Diretoria",
};

// Nome da coleção para a tela; desconhecida: "Outro".
export function rotuloDaColecaoNoRegistro(colecao: unknown): string {
  return typeof colecao === "string" && Object.hasOwn(ROTULOS_DAS_COLECOES, colecao) ? ROTULOS_DAS_COLECOES[colecao] : "Outro";
}

export const QUANTAS_ALTERACOES = 10;
