"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CardProfissional } from "@/components/CardProfissional/CardProfissional";
import { TAGS_DE_PROFISSIONAIS } from "@/config/profissionais";
import estilos from "./page.module.css";
import { revelar } from "@/components/Revelar/revelar";

const TODOS = "Todos";
const OPCOES_DO_FILTRO: readonly string[] = [TODOS, ...TAGS_DE_PROFISSIONAIS];

export type ProfissionalPublico = {
  id: string;
  nome: string;
  especialidade: string;
  tag: string;
  linkedinUrl: string;
  imagemUrl: string;
};

// Filtro por tag e grade de cards da página /profissionais. A tag escolhida
// fica no endereço (?tag=...), para o link do submenu abrir já filtrado.
export function ProfissionaisClient({ profissionais }: { profissionais: ProfissionalPublico[] }) {
  const parametros = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tagDoEndereco = parametros.get("tag");
  const tagAtiva = tagDoEndereco && OPCOES_DO_FILTRO.includes(tagDoEndereco) ? tagDoEndereco : TODOS;

  function selecionarTag(tag: string) {
    const novosParametros = new URLSearchParams(parametros.toString());
    if (tag === TODOS) {
      novosParametros.delete("tag");
    } else {
      novosParametros.set("tag", tag);
    }
    router.replace(`${pathname}?${novosParametros.toString()}`, { scroll: false });
  }

  const profissionaisFiltrados =
    tagAtiva === TODOS ? profissionais : profissionais.filter((profissional) => profissional.tag === tagAtiva);

  return (
    <>
      <div className={estilos.filtros}>
        {OPCOES_DO_FILTRO.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => selecionarTag(tag)}
            className={`${estilos.tag} ${tagAtiva === tag ? estilos.tagAtiva : ""}`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div {...revelar(estilos.grade)}>
        {profissionaisFiltrados.map((profissional) => (
          <CardProfissional
            key={profissional.id}
            nome={profissional.nome}
            especialidade={profissional.especialidade}
            linkedinUrl={profissional.linkedinUrl}
            imagemUrl={profissional.imagemUrl}
          />
        ))}
      </div>
    </>
  );
}
