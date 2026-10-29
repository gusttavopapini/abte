import { Botao } from "@/components/Botao/Botao";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import type { ImagemNaTela } from "@/lib/midia/tela";
import estilos from "./CardArtigo.module.css";

type Props = {
  titulo: string;
  // Texto livre dos autores; vazio, a linha não aparece.
  autores: string;
  resumo: string;
  // Imagem da biblioteca; null sem imagem ou com ela na lixeira (placeholder).
  imagem: ImagemNaTela | null;
  slug: string;
  nivelDoTitulo?: 2 | 3;
};

// Largura do card na grade (1, 2 e 4 colunas), para o navegador escolher a variante.
const LARGURA_DA_IMAGEM = "(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw";

// Card de artigo no molde do card do blog (29/10/2026): cartão branco,
// imagem 16:9 no topo, título e autores com número de linhas limitado,
// resumo quando houver e o botão "Ler artigo" no fim, o único link. Sem data:
// a única gravada é a da importação, que não é a do artigo.
export function CardArtigo({ titulo, autores, resumo, imagem, slug, nivelDoTitulo = 3 }: Props) {
  const Titulo = nivelDoTitulo === 2 ? "h2" : "h3";
  return (
    <article className={estilos.card}>
      <div className={estilos.imagemContainer}>
        {imagem ? (
          <ImagemDaMidia variantes={imagem.variantes} alt={imagem.alt} largura={imagem.largura} altura={imagem.altura} sizes={LARGURA_DA_IMAGEM} className={estilos.imagem} />
        ) : (
          <PlaceholderImagem />
        )}
      </div>
      <div className={estilos.conteudo}>
        <Titulo className={`tipo-h3 ${estilos.titulo}`}>{titulo}</Titulo>
        {autores && <p className={estilos.autores}>{autores}</p>}
        {resumo && <p className={estilos.resumo}>{resumo}</p>}
        <Botao href={`/artigos/${slug}`} variante="primario" className={estilos.botao} aria-label={`Ler artigo: ${titulo}`}>
          Ler artigo
        </Botao>
      </div>
    </article>
  );
}
