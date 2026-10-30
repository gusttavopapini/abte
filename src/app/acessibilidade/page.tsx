import type { Metadata } from "next";
import { PaginaDeTexto } from "@/components/PaginaDeTexto/PaginaDeTexto";
import { PaginaInstitucional } from "@/components/PaginaInstitucional/PaginaInstitucional";
import { EMAIL_CONTATO } from "@/config/navegacao";

export const metadata: Metadata = {
  title: "Declaração de acessibilidade",
  description: "Versão preliminar: recursos de acessibilidade do site da ABTE e problemas já conhecidos.",
};

// VERSÃO PRELIMINAR, em revisão pela ABTE. Descreve só o que o código faz
// hoje e os problemas registrados no CLAUDE.md; não declara conformidade
// com nenhuma norma (o site não passou por auditoria).
function TextoPreliminar() {
  return (
    <PaginaDeTexto
      preliminar
      titulo="Declaração de acessibilidade"
      introducao={
        <p>
          Esta página descreve os recursos de acessibilidade que o site da ABTE tem hoje e os problemas já conhecidos. Ela não é
          uma declaração de conformidade com normas: o site ainda não passou por auditoria de acessibilidade.
        </p>
      }
    >
      <section>
        <h2>O que o site já faz</h2>
        <ul>
          <li>Um link &ldquo;Pular para o conteúdo&rdquo; aparece no primeiro uso da tecla Tab.</li>
          <li>Menus, links, botões e campos de formulário podem ser usados pelo teclado, com o foco visível.</li>
          <li>Os submenus abrem pelo teclado e fecham com a tecla Esc.</li>
          <li>No celular, o menu em tela cheia mantém o foco dentro dele e o devolve ao botão que o abriu.</li>
          <li>Com a opção de reduzir movimento ligada no aparelho, as animações são desligadas e o banner da página inicial não passa sozinho.</li>
          <li>No formulário de contato, os erros aparecem por escrito, em português, e o foco vai para o primeiro campo com erro.</li>
          <li>O banner da página inicial para de passar sozinho com o mouse ou o foco do teclado sobre ele.</li>
        </ul>
      </section>

      <section>
        <h2>Problemas conhecidos</h2>
        <ul>
          <li>O banner da página inicial ainda não tem um botão de pausa visível, e as imagens dele têm descrições genéricas.</li>
          <li>No celular, as setas do banner são menores que o tamanho recomendado para toque.</li>
          <li>Os botões de filtro da lista de profissionais não informam ao leitor de tela qual filtro está ativo.</li>
          <li>Algumas páginas pulam níveis de título.</li>
          <li>Parte das imagens e dos textos ainda é de exemplo e será trocada.</li>
        </ul>
      </section>

      <section>
        <h2>Encontrou uma barreira?</h2>
        <p>
          Escreva para <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a> contando a página e o problema.
        </p>
      </section>
    </PaginaDeTexto>
  );
}

// Desde 30/10/2026 a página só existe quando publicada em /admin/paginas
// (paginasInstitucionais/acessibilidade); publicada sem corpo, mostra o texto
// preliminar acima, que continua no código.
export default async function PaginaAcessibilidade() {
  return <PaginaInstitucional slug="acessibilidade" preliminar={<TextoPreliminar />} />;
}
