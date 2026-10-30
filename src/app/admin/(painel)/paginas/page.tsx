import type { Metadata } from "next";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { Botao } from "@/components/Botao/Botao";
import { papelPodeExecutar } from "@/lib/auth/papeis";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerPaginasAgora } from "@/lib/dados/paginas";
import { caminhoDaPagina, dataDaAtualizacao } from "@/lib/site/paginas";
import estilos from "./paginas.module.css";

export const metadata: Metadata = { title: "Páginas" };

const TRILHA = [{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Páginas" }];
const DESCRICAO = "Páginas institucionais do rodapé: Declaração de acessibilidade, Política de privacidade e Termos de uso. Só o administrador edita.";

// Lista das páginas institucionais (30/10/2026), só administrador
// ("paginas.editar"). Cada cartão: situação, última atualização e Editar.
export default async function PaginaAdminPaginas() {
  const usuario = await exigirPapelDoPainel();
  if (!papelPodeExecutar(usuario.papel, "paginas.editar")) {
    return (
      <>
        <CabecalhoDoPainel trilha={TRILHA} titulo="Páginas" descricao={DESCRICAO} />
        <CaixaDoPainel tipo="atencao">Só o administrador edita as páginas institucionais.</CaixaDoPainel>
      </>
    );
  }
  const paginas = await lerPaginasAgora();
  return (
    <div className={estilos.pagina}>
      <CabecalhoDoPainel trilha={TRILHA} titulo="Páginas" descricao={DESCRICAO} />
      <CaixaDoPainel tipo="atencao">O conteúdo jurídico deve ser fornecido e validado pela ABTE com assessoria jurídica. Este painel não gera texto legal.</CaixaDoPainel>
      <CaixaDoPainel tipo="informacao">Uma página só aparece no site e no rodapé quando está publicada. Publicada sem texto, o site mostra o texto preliminar que já existe no código, com a faixa &quot;Versão preliminar, em revisão pela ABTE&quot;.</CaixaDoPainel>
      <ul role="list" className={estilos.grade}>
        {paginas.map((pagina) => {
          const data = dataDaAtualizacao(pagina.atualizadaEm);
          return (
            <li key={pagina.slug} className={estilos.cartao}>
              <h2 className={estilos.nome}>{pagina.titulo}</h2>
              <p className={estilos.etiquetas}>
                <span className={`${estilos.etiqueta} ${pagina.publicada ? estilos.publicada : ""}`}>{pagina.publicada ? "Publicada" : "Rascunho"}</span>
                <span className={estilos.etiqueta}>{caminhoDaPagina(pagina.slug)}</span>
              </p>
              <p className={estilos.detalhe}>{data ? `Atualizada em ${data}` : "Ainda não foi salva no painel"}</p>
              <p className={estilos.detalhe}>{pagina.corpo.trim() ? "Com texto do painel" : "Sem texto no painel"}</p>
              <div className={estilos.acoes}>
                <Botao variante="secundario" href={`/admin/paginas/${pagina.slug}`} aria-label={`Editar ${pagina.titulo}`}>
                  Editar
                </Botao>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
