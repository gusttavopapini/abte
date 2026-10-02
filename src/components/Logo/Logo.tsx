import Link from "next/link";
import estilos from "./Logo.module.css";

// Logo da ABTE.
// PROVISÓRIO: usa o PNG em /public/logo-abte.png enquanto a ABTE não envia o
// logo em vetor. Quando o SVG chegar, salve em /public/logo-abte.svg e troque
// o src abaixo. O alt fica vazio porque o nome acessível já está no link.
export function Logo({ className, aoClicar }: { className?: string; aoClicar?: () => void }) {
  return (
    <Link href="/" className={`${estilos.logo} ${className ?? ""}`} aria-label="ABTE, página inicial" onClick={aoClicar}>
      <img src="/logo-abte.png" alt="" className={estilos.imagem} />
    </Link>
  );
}
