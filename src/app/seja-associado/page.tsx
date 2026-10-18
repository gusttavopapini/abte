import type { Metadata } from "next";
import { Botao } from "@/components/Botao/Botao";
import { PaginaDeTexto } from "@/components/PaginaDeTexto/PaginaDeTexto";

export const metadata: Metadata = {
  title: "Seja associado",
  description: "Junte-se à Associação e faça parte de uma rede de especialistas no tratamento da escoliose.",
};

// Página PROVISÓRIA: a forma de associação está em aberto (decisão P8 no
// CLAUDE.md: Google Forms ou formulário próprio). O texto é o mesmo do card
// "Para profissionais de saúde" da home.
export default function PaginaSejaAssociado() {
  return (
    <PaginaDeTexto
      titulo="Seja associado"
      introducao={
        <>
          <p>Junte-se à Associação. Faça parte de uma rede de especialistas qualificados e ajude a transformar a vida de pessoas com escoliose.</p>
          <Botao href="/contato">Fale com a ABTE</Botao>
        </>
      }
    />
  );
}
