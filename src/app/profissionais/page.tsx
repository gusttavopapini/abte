import { Suspense } from "react";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { PAISES, TAGS_DE_PROFISSIONAIS, TAG_SEM_CLASSIFICACAO } from "@/config/profissionais";
import { lerProfissionais, ordenarProfissionais } from "@/lib/dados/colecoes";
import type { Profissional } from "@/lib/dados/tipos";
import { ProfissionaisClient, type ProfissionalPublico } from "./ProfissionaisClient";
import estilos from "./page.module.css";

export const metadata = { title: "Profissionais" };
export const dynamic = "force-dynamic";

// "Cidade Um, Cidade Dois / SP" no Brasil; nos outros países, o nome do país.
function local({ cidades, pais, uf }: Profissional): string {
  const regiao = pais === "BR" ? uf : PAISES.find((item) => item.codigo === pais)?.nome ?? "";
  return [cidades.join(", "), regiao].filter(Boolean).join(" / ");
}

export default async function PaginaProfissionais() {
  // Só quem está marcado para aparecer no site e fora dos excluídos.
  const snapshot = await lerProfissionais().where("ativo", "==", true).get();
  const visiveis = ordenarProfissionais(snapshot.docs.map((documento) => documento.data()).filter((profissional) => !profissional.excluidoEm));

  const profissionais: ProfissionalPublico[] = visiveis.map((profissional) => ({
    id: profissional.id,
    tipo: (TAGS_DE_PROFISSIONAIS as readonly string[]).includes(profissional.tipo) ? profissional.tipo : TAG_SEM_CLASSIFICACAO,
    tratamento: profissional.tratamento,
    nome: profissional.nome,
    registro: profissional.registro,
    metodos: profissional.metodos,
    local: local(profissional),
    telerreabilitacao: profissional.telerreabilitacao,
    whatsapp: profissional.whatsapp,
    instagram: profissional.instagram,
    facebook: profissional.facebook,
    email: profissional.email,
    bio: profissional.bio,
  }));

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
