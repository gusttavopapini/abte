import estilos from "./FotoAusenteProfissional.module.css";

// Profissional sem foto (04/11/2026): ícone de usuário (cabeça e ombros) em
// azul claro sobre branco, no lugar do placeholder "IMAGEM". Ocupa todo o
// espaço da foto (o contêiner do card e do popup define a proporção e o
// recorte). Decorativo: o nome já está no card e no título do popup.
export function FotoAusenteProfissional() {
  return (
    <div className={estilos.quadro} aria-hidden="true">
      <svg className={estilos.icone} viewBox="0 0 24 24" focusable="false">
        <circle cx="12" cy="7.5" r="4.5" />
        <path d="M3 22c0-5 4-8.5 9-8.5s9 3.5 9 8.5z" />
      </svg>
    </div>
  );
}
