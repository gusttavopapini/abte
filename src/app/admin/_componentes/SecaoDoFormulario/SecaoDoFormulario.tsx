import { useId, type ReactNode } from "react";
import estilos from "./SecaoDoFormulario.module.css";

// Grupo de campos de um formulário do painel (29/10/2026): caixa branca com
// título (h2) e, se houver, uma frase de orientação.
export function SecaoDoFormulario({ titulo, descricao, children }: { titulo: string; descricao?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section className={estilos.secao} aria-labelledby={`${id}-titulo`}>
      <div className={estilos.cabecalho}>
        <h2 id={`${id}-titulo`} className={estilos.titulo}>{titulo}</h2>
        {descricao && <p className={estilos.descricao}>{descricao}</p>}
      </div>
      {children}
    </section>
  );
}
