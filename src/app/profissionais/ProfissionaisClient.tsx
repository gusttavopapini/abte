"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CardProfissional } from "@/components/CardProfissional/CardProfissional";
import { PopupProfissional } from "@/components/PopupProfissional/PopupProfissional";
import { TAGS_DE_PROFISSIONAIS } from "@/config/profissionais";
import type { ProfissionalPublico } from "@/lib/profissionaisPublicos";
import estilos from "./page.module.css";
import { revelar } from "@/components/Revelar/revelar";

const TODOS = "Todos";
const OPCOES_DO_FILTRO: readonly string[] = [TODOS, ...TAGS_DE_PROFISSIONAIS];

// Filtro por tag, grade de cards e popup de detalhes da página /profissionais.
// A tag escolhida fica no endereço (?tag=...), para o link do submenu abrir já
// filtrado. Recebe só os campos públicos (paraProfissionalPublico).
export function ProfissionaisClient({ profissionais }: { profissionais: ProfissionalPublico[] }) {
  const [aberto, setAberto] = useState<ProfissionalPublico | null>(null);
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
    tagAtiva === TODOS ? profissionais : profissionais.filter((profissional) => profissional.tipo === tagAtiva);

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

      <div {...revelar("grade-de-cards")}>
        {profissionaisFiltrados.map((profissional) => (
          <CardProfissional key={profissional.id} profissional={profissional} aoVerMais={() => setAberto(profissional)} />
        ))}
      </div>

      <PopupProfissional profissional={aberto} aoFechar={() => setAberto(null)} />
    </>
  );
}
