import estilos from "./Revelar.module.css";

// Atributos para um bloco que entra ao rolar a página. Use espalhando no
// próprio elemento, sem criar outro em volta:
//   <section {...revelar(estilos.secao)}>  ou  <div {...revelar(classe, 1)}>
// "ordem" (1 a 3) atrasa a entrada para blocos lado a lado entrarem em sequência.
// Quem mostra o bloco é o ObservadorDeRevelacao, presente no LayoutPublico.
export function revelar(className?: string, ordem?: 1 | 2 | 3) {
  return {
    className: className ? `${estilos.revelar} ${className}` : estilos.revelar,
    "data-revelar": "",
    "data-ordem": ordem,
  };
}
