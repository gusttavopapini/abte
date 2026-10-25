import type { CSSProperties, ReactNode } from "react";
import estilos from "./TabelaPainel.module.css";

// Estilo da linha e classe da célula, para as páginas que montam as linhas da tabela.
// A borda de 1px fica inline por não ter token (exceção registrada no CLAUDE.md).
export const estiloLinha: CSSProperties = { borderBottom: "1px solid color-mix(in srgb, var(--color-text) 5%, transparent)" };

export const classeDaCelula = estilos.celula;

const estiloMoldura: CSSProperties = { background: "var(--color-surface-soft)", padding: "var(--space-24)", borderRadius: "var(--radius)" };

const estiloLinhaDoCabecalho: CSSProperties = { borderBottom: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)" };

const estiloTituloDaColuna: CSSProperties = { paddingBottom: "var(--space-16)", fontWeight: 500 };

const estiloMensagemVazia: CSSProperties = { paddingTop: "var(--space-24)", textAlign: "center", opacity: 0.7 };

type PropsTabelaPainel = {
  colunas: string[];
  // Sem linhas: mostra a mensagem no lugar delas.
  vazia: boolean;
  mensagemVazia: string;
  children: ReactNode;
};

// Tabela das listas do painel (blog, artigos e profissionais).
export function TabelaPainel({ colunas, vazia, mensagemVazia, children }: PropsTabelaPainel) {
  return (
    <div style={estiloMoldura}>
      <table className={estilos.tabela}>
        <thead>
          <tr style={estiloLinhaDoCabecalho}>
            {colunas.map((coluna) => (
              <th key={coluna} style={estiloTituloDaColuna}>{coluna}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vazia ? (
            <tr>
              <td colSpan={colunas.length} style={estiloMensagemVazia}>
                {mensagemVazia}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
