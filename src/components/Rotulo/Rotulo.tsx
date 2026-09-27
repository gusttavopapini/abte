import estilos from "./Rotulo.module.css";

// Rótulo entre colchetes, motivo tipográfico do design ([A], [B], [01]).
export function Rotulo({ texto, className }: { texto: string; className?: string }) {
  return <span className={`${estilos.rotulo} ${className ?? ""}`}>[{texto}]</span>;
}
