import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import estilos from "./Botao.module.css";

export type VarianteBotao = "primario" | "secundario" | "link" | "envio";

// Usado só na página /componentes para mostrar os estados lado a lado.
export type EstadoDemonstracao = "hover" | "foco";

type PropsComuns = {
  variante?: VarianteBotao;
  demonstrar?: EstadoDemonstracao;
  className?: string;
};

type PropsLink = PropsComuns & { href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "className">;
type PropsBotao = PropsComuns & { href?: undefined } & Omit<ComponentPropsWithoutRef<"button">, "className">;

// Botão do design system (seção 8.2). Com href vira link; sem href, <button>.
export function Botao(props: PropsLink | PropsBotao) {
  const { variante = "primario", demonstrar, className, ...resto } = props;
  const classes = `${estilos.botao} ${estilos[variante]} ${className ?? ""}`;

  if (resto.href !== undefined) {
    return <Link {...(resto as Omit<PropsLink, keyof PropsComuns>)} className={classes} data-demonstrar={demonstrar} />;
  }
  const { type = "button", ...atributos } = resto as Omit<PropsBotao, keyof PropsComuns>;
  return <button type={type} {...atributos} className={classes} data-demonstrar={demonstrar} />;
}
