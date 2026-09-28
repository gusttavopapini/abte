import Link from "next/link";
import estilos from "./CardCategoriaArtigo.module.css";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import { Botao } from "@/components/Botao/Botao";

type Props = {
  nome: string;
  imagemUrl?: string;
  slug: string;
};

export function CardCategoriaArtigo({ nome, imagemUrl, slug }: Props) {
  return (
    <div className={estilos.card}>
      {imagemUrl ? (
        <img src={imagemUrl} alt={nome} className={estilos.imagem} />
      ) : (
        <div className={estilos.imagemPlaceholder}>
          <PlaceholderImagem />
        </div>
      )}
      <div className={estilos.rodape}>
        <span className={estilos.nome}>{nome}</span>
        <Botao href={`/artigos/categoria/${slug}`} variante="primario" className={estilos.botao}>
          Todos os artigos
        </Botao>
      </div>
    </div>
  );
}
