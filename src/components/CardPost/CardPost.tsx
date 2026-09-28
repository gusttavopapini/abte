import { Botao } from "@/components/Botao/Botao";
import estilos from "./CardPost.module.css";

type Props = {
  titulo: string;
  resumo: string;
  imagemUrl?: string;
  slug: string;
};

export function CardPost({ titulo, resumo, imagemUrl, slug }: Props) {
  return (
    <article className={estilos.card}>
      {imagemUrl && (
        <div className={estilos.imagemContainer}>
          <img src={imagemUrl} alt={titulo} className={estilos.imagem} />
        </div>
      )}
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
