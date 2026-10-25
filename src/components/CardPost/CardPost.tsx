import { Botao } from "@/components/Botao/Botao";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import type { ImagemNaTela } from "@/lib/midia/tela";
import estilos from "./CardPost.module.css";

type Props = {
  titulo: string;
  resumo: string;
  // Capa da biblioteca de mídia (vence a capa antiga).
  capa: ImagemNaTela | null;
  // Capa antiga: endereço digitado antes da biblioteca (posts já existentes).
  imagemUrl?: string;
  slug: string;
};

// Largura do card na grade de /blog (1, 2 e 4 colunas), para o navegador
// escolher a variante da capa.
const LARGURA_DA_CAPA = "(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw";

// Card de post do blog. Capa: a da biblioteca, senão a antiga, senão o
// placeholder interno (sem serviço externo).
export function CardPost({ titulo, resumo, capa, imagemUrl, slug }: Props) {
  return (
    <article className={estilos.card}>
      <div className={estilos.imagemContainer}>
        {capa ? (
          <ImagemDaMidia variantes={capa.variantes} alt={capa.alt} largura={capa.largura} altura={capa.altura} sizes={LARGURA_DA_CAPA} className={estilos.imagem} />
        ) : imagemUrl ? (
          <img src={imagemUrl} alt={titulo} className={estilos.imagem} />
        ) : (
          <PlaceholderImagem />
        )}
      </div>
      <div className={estilos.conteudo}>
        <h3 className={`tipo-h3 ${estilos.titulo}`}>{titulo}</h3>
        <p className={`tipo-texto-sm ${estilos.resumo}`}>{resumo}</p>
        <Botao href={`/blog/${slug}`} variante="primario" className={estilos.botaoLerMais}>
          Ler post
        </Botao>
      </div>
    </article>
  );
}
