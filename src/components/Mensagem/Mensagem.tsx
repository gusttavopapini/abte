import type { ReactNode, Ref } from "react";
import estilos from "./Mensagem.module.css";

// Caixa branca de erro ou de sucesso (design-system.md seção 8.8).
export function Mensagem({
  tipo,
  children,
  id,
  ref,
  className,
}: {
  tipo: "erro" | "sucesso";
  children: ReactNode;
  id?: string;
  ref?: Ref<HTMLDivElement>;
  className?: string;
}) {
  return (
    <div
      id={id}
      ref={ref}
      tabIndex={ref ? -1 : undefined}
      role={tipo === "erro" ? "alert" : "status"}
      className={`${estilos.mensagem} ${estilos[tipo]} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
