import Link from "next/link";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import { PrecoProduto } from "@/components/PrecoProduto/PrecoProduto";
import estilos from "./CardProduto.module.css";

export type ProdutoDoCard = {
  nome: string;
  slug: string;
  preco: number;
  precoPromocional: number | null;
  selo: string;
  esgotado: boolean;
};

// Card de produto (design-system.md: imagem 3:4, selo em #00449F e preço
// riscado). Sem foto até a biblioteca de mídia (etapa 4d): mostra o placeholder.
// nivelDoTitulo: h2 na lista da loja, h3 nos relacionados.
export function CardProduto({ produto, nivelDoTitulo = 2 }: { produto: ProdutoDoCard; nivelDoTitulo?: 2 | 3 }) {
  const Titulo = nivelDoTitulo === 2 ? "h2" : "h3";
  return (
    <article className={estilos.card}>
      <div className={estilos.imagem}>
        <PlaceholderImagem />
        {produto.selo && <span className={estilos.selo}>{produto.selo}</span>}
      </div>
      <Titulo className={estilos.nome}>
        <Link href={`/loja/produto/${produto.slug}`} className={estilos.link}>
          {produto.nome}
        </Link>
      </Titulo>
      <PrecoProduto preco={produto.preco} precoPromocional={produto.precoPromocional} />
      {produto.esgotado && <p className={estilos.esgotado}>Esgotado</p>}
    </article>
  );
}
