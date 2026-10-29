import { Suspense } from "react";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { CabecalhoDePagina } from "@/components/CabecalhoDePagina/CabecalhoDePagina";
import { lerProfissionais, ordenarProfissionais } from "@/lib/dados/colecoes";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
import { paraProfissionalPublico } from "@/lib/profissionaisPublicos";
import { ProfissionaisClient } from "./ProfissionaisClient";
import estilos from "./page.module.css";

export const metadata = { title: "Profissionais" };
export const dynamic = "force-dynamic";

export default async function PaginaProfissionais() {
  // Só quem está marcado para aparecer no site e fora dos excluídos.
  const snapshot = await lerProfissionais().where("ativo", "==", true).get();
  const visiveis = ordenarProfissionais(snapshot.docs.map((documento) => documento.data()).filter((profissional) => !profissional.excluidoEm));
  // Fotos fora da lixeira da biblioteca; as outras ficam com o placeholder.
  const fotos = await imagensAtivasPorId(visiveis.map((profissional) => profissional.fotoMidiaId));

  // Só os campos públicos vão ao navegador (lista fechada e testada).
  const profissionais = visiveis.map((profissional) =>
    paraProfissionalPublico(profissional, profissional.fotoMidiaId ? fotos.get(profissional.fotoMidiaId) ?? null : null),
  );

  return (
    <LayoutPublico header="solida">
      <div className={estilos.secao}>
        <div className="container pagina-interna">
          <CabecalhoDePagina
            titulo="Profissionais"
            descricao="Este é o espaço para encontrar profissionais capacitados e referência nacional no tratamento conservador da escoliose. Conecte-se com nossa rede."
          />

          {/* O filtro lê a tag do endereço (useSearchParams), por isso fica em Suspense. */}
          <Suspense>
            <ProfissionaisClient profissionais={profissionais} />
          </Suspense>
        </div>
      </div>
    </LayoutPublico>
  );
}
