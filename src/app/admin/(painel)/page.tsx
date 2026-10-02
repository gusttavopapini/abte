import type { Metadata } from "next";
import estilos from "./page.module.css";

export const metadata: Metadata = { title: "Visão Geral" };

export default function PaginaPainel() {
  return (
    <div>
      <h1 className={`tipo-h3 ${estilos.titulo}`}>
        Bem-vindo ao Painel da ABTE
      </h1>
      <p className="tipo-texto">
        Utilize o menu lateral para gerenciar as publicações do Blog e os Artigos Científicos.
      </p>
    </div>
  );
}
