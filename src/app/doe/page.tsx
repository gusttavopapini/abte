import type { Metadata } from "next";
import { Botao } from "@/components/Botao/Botao";
import { PaginaDeTexto } from "@/components/PaginaDeTexto/PaginaDeTexto";

export const metadata: Metadata = {
  title: "Doe para a ABTE",
  description: "Em breve você poderá apoiar a ABTE por esta página.",
};

// Página PROVISÓRIA: a forma de doação está em aberto (decisão P1 no
// CLAUDE.md). Sem Pix, sem QR code e sem nenhum dado de pagamento.
export default function PaginaDoe() {
  return (
    <PaginaDeTexto
      titulo="Doe para a ABTE"
      introducao={
        <>
          <p>Em breve você poderá apoiar a ABTE por esta página.</p>
          <p>As formas de doação ainda estão sendo definidas pela associação. Enquanto isso, se quiser apoiar o trabalho da ABTE, fale com a gente.</p>
          <Botao href="/contato">Fale com a ABTE</Botao>
        </>
      }
    />
  );
}
