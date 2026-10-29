import type { Metadata } from "next";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { CardMembroDiretoria } from "@/components/CardMembroDiretoria/CardMembroDiretoria";
import { CabecalhoDePagina } from "@/components/CabecalhoDePagina/CabecalhoDePagina";
import { revelar } from "@/components/Revelar/revelar";
import { lerDiretoria } from "@/lib/dados/colecoes";
import { diretoriaPorPeriodo, tituloDoPeriodo } from "@/lib/diretoria";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
import estilos from "./page.module.css";

export const metadata: Metadata = { title: "Diretoria" };

// Sempre lê o Firestore na hora: um membro publicado aparece sem novo deploy.
export const dynamic = "force-dynamic";

// Página pública da diretoria, só leitura (24/10/2026). Mostra cargo, nome,
// foto e período como estão no Firestore; quem aparece e a ordem ficam em
// lib/diretoria.ts. Sem tela de edição no painel (pendência).
export default async function PaginaDiretoria() {
  // Coleção pequena: lida inteira e filtrada na memória.
  const grupos = diretoriaPorPeriodo((await lerDiretoria().get()).docs.map((documento) => documento.data()));
  // Fotos fora da lixeira da biblioteca; as outras ficam com o placeholder.
  const fotos = await imagensAtivasPorId(grupos.flatMap((grupo) => grupo.membros.map((membro) => membro.fotoMidiaId)));

  return (
    <LayoutPublico header="solida">
      <div className={estilos.secao}>
        <div className={`container ${estilos.container}`}>
          <CabecalhoDePagina titulo="Diretoria" espacoAbaixo={false} />

          {grupos.length === 0 ? (
            <p className={`tipo-texto ${estilos.vazio}`}>Nenhum membro da diretoria publicado ainda.</p>
          ) : (
            grupos.map((grupo) => (
              <section key={grupo.periodo} className={estilos.grupo} aria-labelledby={`periodo-${grupo.periodo || "sem"}`}>
                <h2 id={`periodo-${grupo.periodo || "sem"}`} className={`tipo-h2 ${estilos.periodo}`}>{tituloDoPeriodo(grupo.periodo)}</h2>
                <ul role="list" {...revelar("grade-de-cards")}>
                  {grupo.membros.map((membro) => (
                    <li key={membro.id}>
                      <CardMembroDiretoria nome={membro.nome} cargo={membro.cargo} foto={membro.fotoMidiaId ? fotos.get(membro.fotoMidiaId) ?? null : null} />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </LayoutPublico>
  );
}
