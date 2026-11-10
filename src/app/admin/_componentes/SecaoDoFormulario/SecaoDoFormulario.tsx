import { useId, type ReactNode } from "react";
import estilos from "./SecaoDoFormulario.module.css";

type Props = {
  titulo: string;
  descricao?: ReactNode;
  children: ReactNode;
  // Nível do título: h2 nas páginas (abaixo do h1) e h3 nas janelas (abaixo
  // do título da janela, que é h2). Padrão: 2.
  nivel?: 2 | 3;
  // Campos em grade de 2 colunas a partir de 1024px (painel.css).
  grade?: boolean;
};

// Grupo de campos de um formulário do painel (29/10/2026): caixa branca com
// título e, se houver, uma frase de orientação. Dentro de uma janela de
// formulário, a caixa ganha contorno (a janela já é branca).
export function SecaoDoFormulario({ titulo, descricao, children, nivel = 2, grade }: Props) {
  const id = useId();
  const Titulo = nivel === 3 ? "h3" : "h2";
  return (
    <section className={estilos.secao} aria-labelledby={`${id}-titulo`}>
      <div className={estilos.cabecalho}>
        <Titulo id={`${id}-titulo`} className={estilos.titulo}>{titulo}</Titulo>
        {descricao && <p className={estilos.descricao}>{descricao}</p>}
      </div>
      {grade ? <div className="painel-grade">{children}</div> : children}
    </section>
  );
}
