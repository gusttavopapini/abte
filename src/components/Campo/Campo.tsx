import type { ComponentPropsWithoutRef, Ref } from "react";
import estilos from "./Campo.module.css";

type PropsCampo = {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
  erro?: string;
  multilinha?: boolean;
  // Só para campos de uma linha (usado para levar o foco ao campo com erro).
  ref?: Ref<HTMLInputElement>;
} & Omit<ComponentPropsWithoutRef<"input">, "id" | "required">;

// Campo de formulário com rótulo visível e mensagem de erro ligada ao campo
// por aria-describedby (design-system.md seção 8.8).
export function Campo({ id, rotulo, obrigatorio, erro, multilinha, ref, className, ...atributos }: PropsCampo) {
  const idErro = `${id}-erro`;
  const comuns = {
    id,
    required: obrigatorio,
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": erro ? idErro : undefined,
    className: `${estilos.entrada} ${multilinha ? estilos.areaTexto : ""} ${erro ? estilos.comErro : ""}`,
  };

  return (
    <div className={`${estilos.campo} ${className ?? ""}`}>
      <label htmlFor={id} className={estilos.rotulo}>
        {rotulo}
        {obrigatorio && <span aria-hidden="true"> *</span>}
      </label>
      {multilinha ? (
        <textarea {...comuns} {...(atributos as ComponentPropsWithoutRef<"textarea">)} />
      ) : (
        <input {...comuns} ref={ref} {...atributos} />
      )}
      {erro && (
        <p id={idErro} className={estilos.erro}>
          {erro}
        </p>
      )}
    </div>
  );
}
