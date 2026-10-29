import type { ReactNode } from "react";
import estilos from "./CabecalhoDePagina.module.css";

// Cabeçalho das páginas internas (29/10/2026, pedido da ABTE): o H1 único da
// página, o subtítulo e o que vier junto (busca, filtros), tudo centralizado
// numa largura de leitura. Sem imagem decorativa. "espacoAbaixo" desliga a
// margem de baixo quando quem usa já cuida do espaço.
export function CabecalhoDePagina({
  titulo,
  descricao,
  children,
  espacoAbaixo = true,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  children?: ReactNode;
  espacoAbaixo?: boolean;
}) {
  return (
    <div className={`${estilos.cabecalho} ${espacoAbaixo ? estilos.comEspaco : ""}`}>
      <h1 className={`tipo-h1 ${estilos.titulo}`}>{titulo}</h1>
      {descricao && <div className={`tipo-texto-lg ${estilos.descricao}`}>{descricao}</div>}
      {children}
    </div>
  );
}
