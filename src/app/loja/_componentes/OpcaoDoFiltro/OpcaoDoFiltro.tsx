import estilos from "./OpcaoDoFiltro.module.css";

// Opção do filtro da loja: caixa de seleção própria (input nativo, com a
// marca em SVG), o rótulo e a contagem de produtos entre parênteses. Com 0
// produto e desmarcada, fica desabilitada e apagada, sem sumir.
export function OpcaoDoFiltro({
  nome,
  valor,
  rotulo,
  contagem,
  marcada,
  aoMudar,
}: {
  nome: string;
  valor: string;
  rotulo: string;
  contagem: number;
  marcada: boolean;
  aoMudar: (marcada: boolean) => void;
}) {
  const desabilitada = contagem === 0 && !marcada;
  return (
    <label className={`${estilos.opcao} ${desabilitada ? estilos.desabilitada : ""}`}>
      <span className={estilos.caixa}>
        <input
          type="checkbox"
          name={nome}
          value={valor}
          checked={marcada}
          disabled={desabilitada}
          onChange={(evento) => aoMudar(evento.target.checked)}
          className={estilos.entrada}
        />
        <svg className={estilos.marca} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      </span>
      <span className={estilos.rotulo}>{rotulo}</span>
      <span className={estilos.contagem} aria-hidden="true">({contagem})</span>
      <span className="somente-leitor">, {contagem} {contagem === 1 ? "produto" : "produtos"}</span>
    </label>
  );
}
