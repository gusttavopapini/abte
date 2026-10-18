import Link from "next/link";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import type { ImagemNaTela } from "@/lib/midia/tela";
import { PrecoProduto } from "@/components/PrecoProduto/PrecoProduto";
import estilos from "./CardProduto.module.css";

export type ProdutoDoCard = {
  nome: string;
  slug: string;
  preco: number;
  precoPromocional: number | null;
  selo: string;
  esgotado: boolean;
  // Imagem principal (a primeira da galeria); null sem imagem ou na lixeira.
  imagem: ImagemNaTela | null;
};

// Largura do card na grade da loja e dos relacionados (1, 2 e 3 colunas).
const LARGURA_DA_IMAGEM = "(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw";

// Card de produto (design-system.md: imagem 3:4, selo em #00449F e preço
// riscado). Imagem principal da galeria, cortada em 3:4; sem imagem, o placeholder.
// nivelDoTitulo: h2 na lista da loja, h3 nos relacionados.
export function CardProduto({ produto, nivelDoTitulo = 2 }: { produto: ProdutoDoCard; nivelDoTitulo?: 2 | 3 }) {
  const Titulo = nivelDoTitulo === 2 ? "h2" : "h3";
  return (
    <article className={estilos.card}>
      <div className={estilos.imagem}>
        {produto.imagem ? (
          <ImagemDaMidia
            variantes={produto.imagem.variantes}
            alt={produto.imagem.alt}
            largura={produto.imagem.largura}
            altura={produto.imagem.altura}
            sizes={LARGURA_DA_IMAGEM}
            className={estilos.foto}
          />
        ) : (
          <PlaceholderImagem />
        )}
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
