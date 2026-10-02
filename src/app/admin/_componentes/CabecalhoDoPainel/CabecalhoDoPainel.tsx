import type { ReactNode } from "react";
import estilos from "./CabecalhoDoPainel.module.css";

type PropsCabecalhoDoPainel = {
  titulo: string;
  descricao: string;
  // Botão à direita (ex.: "Adicionar Novo Post"), usado nas listas.
  acao?: ReactNode;
};

// Cabeçalho das telas do painel (listas, criação e edição).
export function CabecalhoDoPainel({ titulo, descricao, acao }: PropsCabecalhoDoPainel) {
  const textos = (
    <>
      <h1 className={`tipo-h3 ${estilos.titulo}`}>{titulo}</h1>
      <p className="tipo-texto">{descricao}</p>
    </>
  );

  if (!acao) return <header className={estilos.cabecalho}>{textos}</header>;

  return (
    <header className={`${estilos.cabecalho} ${estilos.comAcao}`}>
      <div>{textos}</div>
      {acao}
    </header>
  );
}
