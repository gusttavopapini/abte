import type { CSSProperties } from "react";
import Link from "next/link";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { CardProduto } from "@/components/CardProduto/CardProduto";
import { listarProdutosVisiveis, listarTopicosAtivos } from "@/lib/dados/colecoes";
import { enderecoDaLoja, filtrarItens, lerFiltrosDaUrl, montarFiltroDaLoja, ordenarItens, semFiltros } from "@/lib/filtrosDaLoja";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
import { imagemPrincipal } from "@/lib/produtos";
import { FiltroDaLoja } from "./_componentes/FiltroDaLoja/FiltroDaLoja";
import estilos from "./page.module.css";

export const metadata = { title: "Loja" };
export const dynamic = "force-dynamic";

// Atraso da entrada em cascata dos cards: até o 12º, depois todos juntos.
const LIMITE_DA_CASCATA = 12;

export default async function PaginaLoja({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [produtos, categorias, parametros] = await Promise.all([listarProdutosVisiveis(), listarTopicosAtivos("categoriaDeProduto"), searchParams]);
  // Filtro da loja (29/10/2026): só produtos publicados e fora da lixeira,
  // na ordem da loja; filtros, contagens e ordem pelas funções puras.
  const { itens, opcoes } = montarFiltroDaLoja(produtos, categorias);
  const filtros = lerFiltrosDaUrl(parametros, opcoes);
  const porId = new Map(produtos.map((produto) => [produto.id, produto]));
  const exibidos = ordenarItens(filtrarItens(itens, filtros), filtros.ordem).flatMap((item) => porId.get(item.id) ?? []);
  // Imagem principal de cada produto exibido (a primeira disponível da galeria).
  const imagens = await imagensAtivasPorId(exibidos.flatMap((produto) => produto.imagens.map((imagem) => imagem.midiaId)));

  return (
    <div className={`container ${estilos.secao}`}>
      {parametros.conta === "excluida" && (
        <Mensagem tipo="sucesso" className={estilos.aviso}>Sua conta foi excluída, com seu nome, seu e-mail e seu carrinho.</Mensagem>
      )}
      <h1 className={`tipo-h1 ${estilos.titulo}`}>Loja da ABTE</h1>
      <p className={`tipo-texto-xl ${estilos.descricao}`}>Conheça nossos produtos. Cada compra apoia pacientes com escoliose.</p>

      {produtos.length === 0 ? (
        <p className={`tipo-texto ${estilos.vazio}`}>Nenhum produto disponível ainda.</p>
      ) : (
        <FiltroDaLoja itens={itens} opcoes={opcoes} filtros={filtros} total={exibidos.length}>
          {exibidos.length === 0 ? (
            <div className={estilos.semResultado}>
              <p className="tipo-texto">Nenhum produto encontrado com estes filtros.</p>
              <Link href={enderecoDaLoja(semFiltros(filtros))} replace scroll={false} className={estilos.limpar}>
                Limpar filtros
              </Link>
            </div>
          ) : (
            // A chave muda com os filtros: a grade nova entra em cascata.
            <ul key={enderecoDaLoja(filtros)} role="list" className={`grade-de-cards ${estilos.grade}`}>
              {exibidos.map((produto, posicao) => (
                <li key={produto.id} className={estilos.item} style={{ "--posicao": Math.min(posicao, LIMITE_DA_CASCATA) } as CSSProperties}>
                  <CardProduto
                    produto={{
                      nome: produto.nome,
                      slug: produto.slug,
                      preco: produto.preco,
                      precoPromocional: produto.precoPromocional,
                      selo: produto.selo,
                      esgotado: produto.status === "esgotado",
                      imagem: imagemPrincipal(produto.imagens, imagens),
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </FiltroDaLoja>
      )}
    </div>
  );
}
