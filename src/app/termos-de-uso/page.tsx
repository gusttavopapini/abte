import type { Metadata } from "next";
import Link from "next/link";
import { PaginaDeTexto } from "@/components/PaginaDeTexto/PaginaDeTexto";
import { EMAIL_CONTATO } from "@/config/navegacao";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Versão preliminar: como o site da ABTE funciona hoje.",
};

// VERSÃO PRELIMINAR, em revisão pela ABTE e pela assessoria jurídica.
// Descreve só como o site funciona hoje, sem regras ou afirmações jurídicas
// (pendências no CLAUDE.md).
export default function PaginaTermosDeUso() {
  return (
    <PaginaDeTexto
      preliminar
      titulo="Termos de uso"
      introducao={
        <p>
          Este texto descreve como o site da ABTE funciona hoje. As condições de uso definitivas estão em revisão pela ABTE e serão
          publicadas nesta página.
        </p>
      }
    >
      <section>
        <h2>O que o site oferece</h2>
        <p>
          Informações sobre a ABTE, blog, artigos, uma lista de profissionais, uma loja e um formulário de contato. Para ler o
          conteúdo não é preciso se cadastrar.
        </p>
      </section>

      <section>
        <h2>Lista de profissionais</h2>
        <p>As informações de cada profissional são cadastradas pela equipe da ABTE no painel administrativo do site.</p>
      </section>

      <section>
        <h2>Loja</h2>
        <p>
          A loja mostra produtos e permite guardar itens num carrinho, com uma conta. Ainda não é possível finalizar compras nem
          pagar pelo site. Preço e disponibilidade são conferidos de novo cada vez que o carrinho é aberto.
        </p>
        <p>
          A conta da loja é protegida por senha e pode ser excluída a qualquer momento em <Link href="/loja/conta">Minha conta</Link>.
          Os dados guardados estão descritos na <Link href="/politica-de-privacidade">Política de privacidade</Link>.
        </p>
      </section>

      <section>
        <h2>Doações</h2>
        <p>A página de doação ainda está em preparação. O site não recebe doações nem pagamentos.</p>
      </section>

      <section>
        <h2>O que ainda será definido</h2>
        <p>
          Depois da revisão, esta página vai tratar da responsabilidade pelo conteúdo publicado, do uso do conteúdo do site, das
          regras da loja e de como estes termos podem mudar.
        </p>
        <p>
          Dúvidas: <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>.
        </p>
      </section>
    </PaginaDeTexto>
  );
}
