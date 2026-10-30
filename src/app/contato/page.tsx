import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { BlocoContato } from "@/components/BlocoContato/BlocoContato";
import { lerPaginasEmCache } from "@/lib/dados/paginas";
import { paginaNoSite } from "@/lib/site/paginas";
import estilos from "./page.module.css";

export const metadata = { title: "Contato" };

export default async function PaginaContato() {
  const politicaPublicada = paginaNoSite((await lerPaginasEmCache()).get("politica-de-privacidade"));
  return (
    <LayoutPublico header="solida">
      {/* Único H1 da página, só para leitores de tela: o título visível é o do bloco de contato. */}
      <h1 className="somente-leitor">Contato</h1>
      <div className={`container pagina-interna ${estilos.containerForm}`}>
        <div className={estilos.formularioCentralizado}>
          <BlocoContato centralizado politicaPublicada={politicaPublicada} />
        </div>
      </div>
    </LayoutPublico>
  );
}
