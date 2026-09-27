import type { Metadata } from "next";
import { Botao } from "@/components/Botao/Botao";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import estilos from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Página não encontrada",
};

// Página 404 PROVISÓRIA: a versão final é da etapa 2.
export default function PaginaNaoEncontrada() {
  return (
    <LayoutPublico>
      <div className={`container ${estilos.conteudo}`}>
        <h1>Página não encontrada</h1>
        <Botao href="/" variante="link">
          Voltar para o início
        </Botao>
      </div>
    </LayoutPublico>
  );
}
