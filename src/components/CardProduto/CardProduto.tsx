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
  digital: boolean;
  // Imagem principal (a primeira da galeria); null sem imagem ou na lixeira.
  imagem: ImagemNaTela | null;
};

// Largura do card: 2 colunas até 1023px e de 3 a 4 a partir de 1024px.
const LARGURA_DA_IMAGEM = "(max-width: 1023px) 50vw, 25vw";

// Card de produto no molde de loja virtual (08/11/2026): o card inteiro é um
// único link para o produto; imagem 1:1 inteira (sem recorte) sobre branco,
// com o selo no canto; depois o preço (antigo riscado, atual em destaque e
// desconto), o nome em até 2 linhas e uma linha pequena com "Produto
// digital" e "Esgotado". No código, o nome vem antes do preço, para o leitor
// de tela anunciar o link pelo nome; a ordem visual é feita no CSS.
// nivelDoTitulo: h2 na lista da loja, h3 nos relacionados e na home.
export function CardProduto({ produto, nivelDoTitulo = 2 }: { produto: ProdutoDoCard; nivelDoTitulo?: 2 | 3 }) {
  const Titulo = nivelDoTitulo === 2 ? "h2" : "h3";
  const detalhes = [produto.digital ? "Produto digital" : "", produto.esgotado ? "Esgotado" : ""].filter(Boolean);
  return (
    <Link href={`/loja/produto/${produto.slug}`} className={estilos.card}>
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
      <div className={estilos.conteudo}>
        <Titulo className={estilos.titulo}>{produto.nome}</Titulo>
        <div className={estilos.preco}>
          <PrecoProduto preco={produto.preco} precoPromocional={produto.precoPromocional} />
        </div>
        {detalhes.length > 0 && <p className={estilos.detalhes}>{detalhes.join(" · ")}</p>}
      </div>
    </Link>
  );
}
