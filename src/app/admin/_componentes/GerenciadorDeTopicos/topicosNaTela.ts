// Tópicos como a tela do painel recebe, com a imagem das categorias já
// montada. SOMENTE no servidor (lê a biblioteca de mídia).
import "server-only";

import type { Topico } from "@/lib/dados/tipos";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
import type { TopicoNaTela } from "./GerenciadorDeTopicos";

// Separa ativos e excluídos; só os campos que a tela usa (as datas não vão
// para o navegador).
export async function topicosNaTela(todos: Topico[]): Promise<{ ativos: TopicoNaTela[]; excluidos: TopicoNaTela[] }> {
  const imagens = await imagensAtivasPorId(todos.map((topico) => topico.imagemMidiaId));
  const paraTela = ({ id, nome, slug, ordem, imagemMidiaId, ativa }: Topico): TopicoNaTela => ({
    id,
    nome,
    slug,
    ordem,
    ativa,
    imagem: imagemMidiaId ? { id: imagemMidiaId, imagem: imagens.get(imagemMidiaId) ?? null } : null,
  });
  return {
    ativos: todos.filter((topico) => !topico.excluidoEm).map(paraTela),
    excluidos: todos.filter((topico) => topico.excluidoEm).map(paraTela),
  };
}
