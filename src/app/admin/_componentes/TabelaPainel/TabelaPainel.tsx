import type { ReactNode } from "react";
import estilos from "./TabelaPainel.module.css";

type PropsTabelaPainel = {
  // Id da tabela (a busca da lista a encontra por ele).
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

// Linha da tabela; "busca" e "situacao" alimentam a busca da lista (BuscaNaTabela).
export function LinhaDoPainel({ busca, situacao, children }: { busca: string; situacao?: string; children: ReactNode }) {
  return (
    <tr data-busca={busca} data-situacao={situacao}>
      {children}
    </tr>
  );
}

export function CelulaDoPainel({ rotulo, destaque, acoes, children }: { rotulo: string; destaque?: boolean; acoes?: boolean; children: ReactNode }) {
  return (
    <td data-rotulo={rotulo} className={`${destaque ? estilos.destaque : ""} ${acoes ? estilos.acoes : ""}`}>
      {acoes ? <div className={estilos.botoesDaLinha}>{children}</div> : children}
    </td>
  );
}
