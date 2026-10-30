import type { Metadata } from "next";
import { Botao } from "@/components/Botao/Botao";
import { PaginaDeTexto } from "@/components/PaginaDeTexto/PaginaDeTexto";
import { FORMULARIOS_DE_ASSOCIACAO } from "@/config/links";
import estilos from "./page.module.css";

export const metadata: Metadata = {
  title: "Seja associado",
  description: "Junte-se à Associação e faça parte de uma rede de especialistas no tratamento da escoliose.",
};

// Associação por Google Forms (decisão provisória do responsável em
// 30/10/2026, P8): um formulário para médicos e outro para fisioterapeutas,
// em nova aba. O texto é o mesmo do card "Para profissionais de saúde" da home.
export default function PaginaSejaAssociado() {
  return (
    <PaginaDeTexto
      titulo="Seja associado"
      introducao={
        <>
          <p>Junte-se à Associação. Faça parte de uma rede de especialistas qualificados e ajude a transformar a vida de pessoas com escoliose.</p>
          <div className={estilos.botoes}>
            <Botao href={FORMULARIOS_DE_ASSOCIACAO.medico} target="_blank" rel="noopener noreferrer">
              Sou Médico(a)<span className="somente-leitor"> (abre em nova aba)</span>
            </Botao>
            <Botao href={FORMULARIOS_DE_ASSOCIACAO.fisioterapeuta} target="_blank" rel="noopener noreferrer">
              Sou Fisioterapeuta<span className="somente-leitor"> (abre em nova aba)</span>
            </Botao>
          </div>
        </>
      }
    />
  );
}
