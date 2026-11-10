import type { ReactNode } from "react";
import estilos from "./TabelaPainel.module.css";

type PropsTabelaPainel = {
  // Id da tabela (opcional).
  id?: string;
  // Frase curta sobre a lista, lida antes dela (ex.: a ordem).
  legenda: string;
  colunas: string[];
  // Sem linhas: o estado vazio (explicação e botão) no lugar da tabela.
  vazia: boolean;
  estadoVazio: ReactNode;
  children: ReactNode;
};

// Tabela das listas do painel (29/10/2026, só tokens): caixa branca; até
// 767px, cada linha vira um cartão e cada célula mostra o nome da coluna
// (data-rotulo, posto por CelulaDoPainel), sem esconder nada.
export function TabelaPainel({ id, legenda, colunas, vazia, estadoVazio, children }: PropsTabelaPainel) {
  if (vazia) return <div className={estilos.vazio}>{estadoVazio}</div>;
  return (
    <div className={estilos.moldura}>
      <table id={id} className={estilos.tabela}>
        <caption className={estilos.legenda}>{legenda}</caption>
        <thead>
          <tr>
            {colunas.map((coluna) => (
              <th key={coluna} scope="col">{coluna}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// Célula da tabela (10/11/2026): a de destaque (nome) fica em até duas
// linhas, com reticências e o texto completo no title; "quebrar" deixa um
// texto sem espaços (e-mail) quebrar em qualquer ponto.
export function CelulaDoPainel({ rotulo, destaque, acoes, quebrar, titulo, children }: { rotulo: string; destaque?: boolean; acoes?: boolean; quebrar?: boolean; titulo?: string; children: ReactNode }) {
  return (
    <td data-rotulo={rotulo} className={`${destaque ? estilos.destaque : ""} ${acoes ? estilos.acoes : ""} ${quebrar ? estilos.quebrar : ""}`}>
      {acoes ? <div className={estilos.botoesDaLinha}>{children}</div> : destaque ? <span className={estilos.nomeLongo} title={titulo}>{children}</span> : children}
    </td>
  );
}
