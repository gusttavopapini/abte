import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import estilos from "./CardProfissional.module.css";

type Props = {
  nome: string;
  especialidade: string;
  imagemUrl?: string;
  linkedinUrl?: string;
};

export function CardProfissional({ nome, especialidade, imagemUrl, linkedinUrl }: Props) {
  return (
    <article className={estilos.card}>
      <div className={estilos.cabecalho}>
        <h3 className={estilos.nome}>{nome}</h3>
        <p className={estilos.especialidade}>{especialidade}</p>
      </div>
      <div className={estilos.imagemContainer}>
        {imagemUrl ? (
          <img src={imagemUrl} alt={`Foto de ${nome}`} className={estilos.imagem} />
        ) : (
          <PlaceholderImagem />
        )}
        {linkedinUrl && (
          <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className={estilos.linkedin}>
            LinkedIn
          </a>
        )}
      </div>
    </article>
  );
}
