import estilos from "./SeloStatus.module.css";

const ROTULOS: Record<string, string> = { publicado: "Publicado", rascunho: "Rascunho", ativo: "Ativo", inativo: "Inativo", oculto: "Oculto" };

// Etiqueta de situação das listas do painel (29/10/2026, só tokens): o texto
// diz a situação; "Publicado" e "Ativo" em fundo cheio, os outros em contorno.
export function SeloStatus({ status }: { status: string }) {
  const cheio = status === "publicado" || status === "ativo";
  return <span className={`${estilos.selo} ${cheio ? estilos.cheio : ""}`}>{ROTULOS[status] ?? status}</span>;
}
