import Link from "next/link";
import estilos from "./Logo.module.css";

// Logo da ABTE.
// PROVISÓRIO: a ABTE ainda não enviou o logo em vetor. Quando o arquivo
// chegar, salve o SVG em /public/logo-abte.svg e troque o <span> abaixo por
// <img src="/logo-abte.svg" alt="" /> (o nome acessível já está no link).
export function Logo({ className, aoClicar }: { className?: string; aoClicar?: () => void }) {
  return (
    <Link href="/" className={`${estilos.logo} ${className ?? ""}`} aria-label="ABTE, página inicial" onClick={aoClicar}>
      <img src="/logo-abte.png" alt="" className={estilos.imagem} />
    </Link>
  );
}
