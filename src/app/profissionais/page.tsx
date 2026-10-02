import { Suspense } from "react";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { TAG_SEM_CLASSIFICACAO } from "@/config/profissionais";
import { lerProfissionais } from "@/lib/dados/colecoes";
import { ProfissionaisClient, type ProfissionalPublico } from "./ProfissionaisClient";
import estilos from "./page.module.css";

export const metadata = { title: "Profissionais" };
export const dynamic = "force-dynamic";

export default async function PaginaProfissionais() {
  const snapshot = await lerProfissionais().where("status", "==", "publicado").get();

  const profissionais: ProfissionalPublico[] = snapshot.docs.map((documento) => {
    const profissional = documento.data();
    return {
      id: profissional.id,
      nome: profissional.nome,
      especialidade: profissional.especialidade,
      tag: profissional.tag || TAG_SEM_CLASSIFICACAO,
      linkedinUrl: profissional.linkedinUrl,
      imagemUrl: profissional.imagemUrl,
    };
  });

  return (
    <LayoutPublico header="solida">
      <div className={estilos.secao}>
        <div className={`container ${estilos.container}`}>
          <div className={estilos.cabecalho}>
            <h1 className={`tipo-h1 ${estilos.titulo}`}>Profissionais</h1>
            <p className={`tipo-texto-lg ${estilos.descricao}`}>
              Este é o espaço para encontrar profissionais capacitados e referência nacional no tratamento conservador da escoliose. Conecte-se com nossa rede.
            </p>
          </div>

          {/* O filtro lê a tag do endereço (useSearchParams), por isso fica em Suspense. */}
          <Suspense>
            <ProfissionaisClient profissionais={profissionais} />
          </Suspense>
        </div>
      </div>
    </LayoutPublico>
  );
}
