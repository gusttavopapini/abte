"use client";

import { useId, useState } from "react";
import estilos from "./BuscaNaTabela.module.css";

type Props = {
  // Id da tabela (TabelaPainel) cujas linhas são filtradas.
  tabela: string;
  rotuloDaBusca: string;
  // Opções do filtro de situação (valor de data-situacao das linhas).
  situacoes?: { valor: string; rotulo: string }[];
  total: number;
  nomeNoSingular: string;
  nomeNoPlural: string;
};

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// Busca e filtro das listas do painel (29/10/2026): esconde as linhas que não
// combinam (data-busca e data-situacao, LinhaDoPainel) e anuncia a contagem.
// Sem JavaScript, a lista aparece inteira.
export function BuscaNaTabela({ tabela, rotuloDaBusca, situacoes, total, nomeNoSingular, nomeNoPlural }: Props) {
  const id = useId();
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState("");
  const [visiveis, setVisiveis] = useState(total);

  // Esconde as linhas que não combinam com a busca e a situação novas.
  function aplicar(novaBusca: string, novaSituacao: string) {
    setBusca(novaBusca);
    setSituacao(novaSituacao);
    const termo = normalizar(novaBusca.trim());
    let contagem = 0;
    document.querySelectorAll<HTMLTableRowElement>(`#${CSS.escape(tabela)} tbody tr[data-busca]`).forEach((linha) => {
      const combina = (!termo || normalizar(linha.dataset.busca ?? "").includes(termo)) && (!novaSituacao || linha.dataset.situacao === novaSituacao);
      linha.hidden = !combina;
      if (combina) contagem++;
    });
    setVisiveis(contagem);
  }

  const filtrando = busca.trim() !== "" || situacao !== "";
  return (
    <div className={estilos.barra} role="search">
      <div className={estilos.campo}>
        <label htmlFor={`${id}-busca`} className={estilos.rotulo}>{rotuloDaBusca}</label>
        <input id={`${id}-busca`} type="search" value={busca} onChange={(evento) => aplicar(evento.target.value, situacao)} className={estilos.entrada} autoComplete="off" />
      </div>
      {situacoes && (
        <div className={estilos.campo}>
          <label htmlFor={`${id}-situacao`} className={estilos.rotulo}>Situação</label>
          <select id={`${id}-situacao`} value={situacao} onChange={(evento) => aplicar(busca, evento.target.value)} className={estilos.entrada}>
            <option value="">Todas</option>
            {situacoes.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>
            ))}
          </select>
        </div>
      )}
      <p className={estilos.contagem} aria-live="polite">
        {filtrando ? `${visiveis} de ${total} ${total === 1 ? nomeNoSingular : nomeNoPlural}` : `${total} ${total === 1 ? nomeNoSingular : nomeNoPlural}`}
        {filtrando && visiveis === 0 && ". Nenhum resultado: mude a busca ou a situação."}
      </p>
    </div>
  );
}
