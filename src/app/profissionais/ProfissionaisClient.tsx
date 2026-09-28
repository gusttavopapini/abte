"use client";

import { useState } from "react";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { CardProfissional } from "@/components/CardProfissional/CardProfissional";
import estilos from "./page.module.css";

const TAGS = ["Todos", "Fisioterapeutas", "Médicos", "Ortesistas", "Psicólogos", "Outros"];

const PROFISSIONAIS_MOCK = [
  { nome: "Don Francis", especialidade: "Fisioterapeuta", tag: "Fisioterapeutas", linkedinUrl: "https://linkedin.com" },
  { nome: "Ashley Jonest", especialidade: "Médica", tag: "Médicos", linkedinUrl: "https://linkedin.com" },
  { nome: "Tess Brown", especialidade: "Ortesista", tag: "Ortesistas", linkedinUrl: "https://linkedin.com" },
  { nome: "Lisa Rose", especialidade: "Psicóloga", tag: "Psicólogos", linkedinUrl: "https://linkedin.com" },
  { nome: "Kevin Nye", especialidade: "Fisioterapeuta", tag: "Fisioterapeutas", linkedinUrl: "https://linkedin.com" },
  { nome: "Alex Young", especialidade: "Médico", tag: "Médicos", linkedinUrl: "https://linkedin.com" },
  { nome: "Andrew Cole", especialidade: "Fisioterapeuta", tag: "Fisioterapeutas", linkedinUrl: "https://linkedin.com" },
  { nome: "Debbie Green", especialidade: "Ortesista", tag: "Ortesistas", linkedinUrl: "https://linkedin.com" },
  { nome: "Alissa Rose", especialidade: "Psicóloga", tag: "Psicólogos", linkedinUrl: "https://linkedin.com" },
];

export function ProfissionaisClient() {
  const [tagAtiva, setTagAtiva] = useState("Todos");

  const profissionaisFiltrados = tagAtiva === "Todos" 
    ? PROFISSIONAIS_MOCK 
    : PROFISSIONAIS_MOCK.filter(p => p.tag === tagAtiva);

  return (
    <LayoutPublico header="solida">
      <main className={estilos.secao}>
        <div className={`container ${estilos.container}`}>
          <div className={estilos.cabecalho}>
            <h1 className={`tipo-display ${estilos.titulo}`}>Profissionais</h1>
            <p className={`tipo-texto-xl ${estilos.descricao}`}>
              Este é o espaço para encontrar profissionais capacitados e referência nacional no tratamento conservador da escoliose. Conecte-se com nossa rede.
            </p>
          </div>

          <div className={estilos.filtros}>
            {TAGS.map((tag) => (
              <button 
                key={tag} 
                onClick={() => setTagAtiva(tag)}
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
              />
            ))}
          </div>
        </div>
      </main>
    </LayoutPublico>
  );
}
