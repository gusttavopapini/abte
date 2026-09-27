import estilos from "./Estatisticas.module.css";

export type Estatistica = { numero: string; legenda: string };

// Estatísticas (design-system.md seção 8.4): 4 cards em xadrez, alternando
// #76ACF5 e branco. Legendas com 24px fixos (regra do #76ACF5).
// Só números reais e confirmados pela ABTE; até lá, "00".
export function Estatisticas({ itens }: { itens: Estatistica[] }) {
  return (
    <ul role="list" className={estilos.grade}>
      {itens.map((item, indice) => (
        <li key={indice} className={`${estilos.card} ${estilos[`posicao${indice % 4}`]}`}>
          <p className={`tipo-h2 ${estilos.numero}`}>{item.numero}</p>
          <p className="tipo-texto">{item.legenda}</p>
        </li>
      ))}
    </ul>
  );
}
