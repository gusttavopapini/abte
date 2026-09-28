import Link from "next/link";
import estilos from "./CardArtigo.module.css";

type Props = {
  titulo: string;
  resumo: string;
  autor: string;
  data: string;
  slug: string;
};

export function CardArtigo({ titulo, resumo, autor, data, slug }: Props) {
  return (
    <article className={estilos.card}>
      <div className={estilos.meta}>
         <span className={estilos.autor}>{autor}</span>
         <span className={estilos.separador}>•</span>
         <span className={estilos.data}>{data}</span>
      </div>
      <h3 className={`tipo-h3 ${estilos.titulo}`}>{titulo}</h3>
      <p className={`tipo-texto-sm ${estilos.resumo}`}>{resumo}</p>
      
      <div className={estilos.rodape}>
        <Link href={`/artigos/${slug}`} className={estilos.link}>
          Ler artigo completo &rarr;
        </Link>
      </div>
    </article>
  );
}
