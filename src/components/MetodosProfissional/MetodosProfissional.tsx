import estilos from "./MetodosProfissional.module.css";

// Etiquetas dos métodos do profissional (card e popup), cada método com a sua
// cor estável; valor inesperado usa a cor principal.
export function MetodosProfissional({ metodos }: { metodos: string[] }) {
  if (metodos.length === 0) return null;
  return (
    <ul role="list" aria-label="Métodos" className={estilos.metodos}>
      {metodos.map((metodo) => <li key={metodo} className={estilos.metodo} data-metodo={metodo}>{metodo}</li>)}
    </ul>
  );
}
