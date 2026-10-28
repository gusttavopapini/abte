import { Botao } from "@/components/Botao/Botao";
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

// Largura do card na grade da loja e dos relacionados (1, 2 e 4 colunas).
const LARGURA_DA_IMAGEM = "(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw";

// Card de produto no molde do card do blog (28/10/2026): cartão branco,
// imagem no topo (3:4, com o selo no canto), título, preço, aviso de esgotado
// e o botão "Ver produto" no fim, que é o único link do card. Sem compra nem
// carrinho aqui. nivelDoTitulo: h2 na lista da loja, h3 nos relacionados e na home.
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
      <div className={estilos.conteudo}>
        <Titulo className={`tipo-h3 ${estilos.titulo}`}>{produto.nome}</Titulo>
        {/* Preço, aviso e botão ficam juntos no fim do card, alinhados entre
            os cards da mesma linha, qualquer que seja o tamanho do título. */}
        <div className={estilos.rodape}>
          <PrecoProduto preco={produto.preco} precoPromocional={produto.precoPromocional} />
          {produto.esgotado && <p className={estilos.esgotado}>Esgotado</p>}
          <Botao href={`/loja/produto/${produto.slug}`} variante="primario" className={estilos.botaoVerProduto}>
            Ver produto<span className="somente-leitor">: {produto.nome}</span>
          </Botao>
        </div>
      </div>
    </article>
  );
}
