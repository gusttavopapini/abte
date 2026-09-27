import type { ReactNode, Ref } from "react";
import estilos from "./CaixaConsentimento.module.css";

// Caixa de seleção com texto (ex.: consentimento LGPD). A linha inteira é o
// rótulo e pode ser clicada, com 44px de altura mínima no celular.
export function CaixaConsentimento({
  id,
  children,
  obrigatorio,
  erro,
  marcado,
  aoMudar,
  ref,
}: {
  id: string;
  children: ReactNode;
  obrigatorio?: boolean;
  erro?: string;
  marcado: boolean;
  aoMudar: (marcado: boolean) => void;
  ref?: Ref<HTMLInputElement>;
}) {
  const idErro = `${id}-erro`;
  return (
    <div className={estilos.campo}>
      <label htmlFor={id} className={estilos.linha}>
        <span className={estilos.caixa}>
          <input
            id={id}
            ref={ref}
            type="checkbox"
            checked={marcado}
            onChange={(evento) => aoMudar(evento.target.checked)}
            required={obrigatorio}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? idErro : undefined}
            className={`${estilos.entrada} ${erro ? estilos.comErro : ""}`}
          />
          <svg className={estilos.marca} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        </span>
        <span className={estilos.texto}>
          {children}
          {obrigatorio && <span aria-hidden="true"> *</span>}
        </span>
      </label>
      {erro && (
        <p id={idErro} className={estilos.erro}>
          {erro}
        </p>
      )}
    </div>
  );
}
