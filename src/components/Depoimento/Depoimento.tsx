import estilos from "./Depoimento.module.css";

type PropsDepoimento = {
  categoria: string;
  citacao: string;
  nome: string;
  funcao: string;
};

// Depoimento (design-system.md seção 8.5). Só com depoimentos reais e
// autorizados; não existem ainda.
export function Depoimento({ categoria, citacao, nome, funcao }: PropsDepoimento) {
  return (
    <figure className={estilos.card}>
      <p className={estilos.categoria}>{categoria}</p>
      <blockquote className="tipo-texto-xl">
        <p>{citacao}</p>
      </blockquote>
      <figcaption className={estilos.autoria}>
        <span>{nome}</span>
        <span>{funcao}</span>
      </figcaption>
    </figure>
  );
}
