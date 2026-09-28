"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { CardProfissional } from "@/components/CardProfissional/CardProfissional";
import estilos from "./page.module.css";

const TAGS = ["Todos", "Fisioterapeutas", "Médicos", "Ortesistas", "Psicólogos", "Outros"];

type Profissional = {
  nome: string;
  especialidade: string;
  tag: string;
  linkedinUrl?: string;
  imagemUrl?: string;
};

export function ProfissionaisClient({ profissionaisIniciais }: { profissionaisIniciais: Profissional[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tagUrl = searchParams.get("tag");
  const tagAtiva = tagUrl && TAGS.includes(tagUrl) ? tagUrl : "Todos";

  const handleTagClick = (tag: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tag === "Todos") {
      params.delete("tag");
    } else {
      params.set("tag", tag);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const profissionaisFiltrados = tagAtiva === "Todos" 
    ? profissionaisIniciais 
    : profissionaisIniciais.filter(p => p.tag === tagAtiva);

  return (
    <LayoutPublico header="solida">
      <main className={estilos.secao}>
        <div className={`container ${estilos.container}`}>
          <div className={estilos.cabecalho}>
            <h1 className={`tipo-h1 ${estilos.titulo}`}>Profissionais</h1>
            <p className={`tipo-texto-lg ${estilos.descricao}`}>
              Este é o espaço para encontrar profissionais capacitados e referência nacional no tratamento conservador da escoliose. Conecte-se com nossa rede.
            </p>
          </div>

          <div className={estilos.filtros}>
            {TAGS.map((tag) => (
              <button 
                key={tag} 
                onClick={() => handleTagClick(tag)}
                className={`${estilos.tag} ${tagAtiva === tag ? estilos.tagAtiva : ""}`}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className={estilos.grade}>
            {profissionaisFiltrados.map((prof, i) => (
              <CardProfissional 
                key={i}
                nome={prof.nome}
                especialidade={prof.especialidade}
                linkedinUrl={prof.linkedinUrl}
                imagemUrl={prof.imagemUrl}
              />
            ))}
          </div>
        </div>
      </main>
    </LayoutPublico>
  );
}
