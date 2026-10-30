import type { Metadata } from "next";
import { Botao } from "@/components/Botao/Botao";
import { BlocoPix } from "@/components/BlocoPix/BlocoPix";
import { PaginaDeTexto } from "@/components/PaginaDeTexto/PaginaDeTexto";
import { lerConfiguracaoDoSiteEmCache } from "@/lib/dados/site";
import { ROTULOS_DOS_TIPOS_DE_CHAVE, type ChavePix } from "@/lib/site/configuracoes";

export const metadata: Metadata = {
  title: "Doe para a ABTE",
  description: "Em breve você poderá apoiar a ABTE por esta página.",
};

// CNPJ com a pontuação de sempre na tela; a cópia leva só os números.
function chaveNaTela(pix: ChavePix): string {
  if (pix.tipo === "cnpj") return pix.chave.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  return pix.chave;
}

// Página PROVISÓRIA: a forma de doação está em aberto (decisão P1 no
// CLAUDE.md). Desde 30/10/2026, com o Pix ESTÁTICO preenchido pelo
// administrador em /admin/configuracoes (configuracoes/site), a página mostra
// a chave para copiar; sem chave, exatamente o texto de antes. Sem QR Code,
// sem gateway e sem nenhum registro de doação.
export default async function PaginaDoe() {
  const { pix } = await lerConfiguracaoDoSiteEmCache();
  if (pix) {
    return (
      <PaginaDeTexto titulo="Doe para a ABTE" introducao={<p>Você pode apoiar a ABTE com uma doação por Pix.</p>}>
        <BlocoPix tipo={ROTULOS_DOS_TIPOS_DE_CHAVE[pix.tipo]} chaveExibida={chaveNaTela(pix)} chaveParaCopiar={pix.chave} favorecido={pix.favorecido} orientacao={pix.orientacao} />
      </PaginaDeTexto>
    );
  }
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
