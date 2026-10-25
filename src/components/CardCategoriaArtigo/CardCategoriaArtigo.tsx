import estilos from "./CardCategoriaArtigo.module.css";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import { Botao } from "@/components/Botao/Botao";
import type { ImagemNaTela } from "@/lib/midia/tela";

type Props = {
  nome: string;
  // Imagem da biblioteca de mídia; null sem imagem ou com ela na lixeira.
  imagem: ImagemNaTela | null;
  slug: string;
};

// Largura do card na grade de /artigos (1, 2 e 4 colunas), para o navegador
// escolher a variante.
const LARGURA_DA_IMAGEM = "(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw";

export function CardCategoriaArtigo({ nome, imagem, slug }: Props) {
  return (
    <div className={estilos.card}>
      <div className={estilos.moldura}>
        {imagem ? (
          <ImagemDaMidia variantes={imagem.variantes} alt={imagem.alt} largura={imagem.largura} altura={imagem.altura} sizes={LARGURA_DA_IMAGEM} className={estilos.imagem} />
        ) : (
          <PlaceholderImagem />
        )}
      </div>
      <div className={estilos.rodape}>
        <span className={estilos.nome}>{nome}</span>
        <Botao href={`/artigos/categoria/${slug}`} variante="primario" className={estilos.botao}>
          Ver Artigos
        </Botao>
      </div>
    </div>
  );
}
