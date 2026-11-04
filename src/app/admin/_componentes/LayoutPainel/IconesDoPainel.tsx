// Ícones do menu do painel (etapa 3, 04/11/2026): SVG próprio, traço na cor
// do texto (currentColor), decorativos (aria-hidden), sem biblioteca.
import type { ReactNode } from "react";

type Props = { className?: string };

function Icone({ className, children }: Props & { children: ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const IconeVisaoGeral = (props: Props) => (
  <Icone {...props}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </Icone>
);

export const IconeCasa = (props: Props) => (
  <Icone {...props}>
    <path d="M3.5 11 12 4l8.5 7" />
    <path d="M6 9.5V20h12V9.5" />
    <path d="M10 20v-5.5h4V20" />
  </Icone>
);

export const IconeTexto = (props: Props) => (
  <Icone {...props}>
    <path d="M6 3.5h8.5L18.5 7.5V20.5H6z" />
    <path d="M14 3.5V8h4.5" />
    <path d="M9 12h6M9 15h6M9 18h4" />
  </Icone>
);

export const IconeLivro = (props: Props) => (
  <Icone {...props}>
    <path d="M4 5.5c2.5-1.3 5.5-1.3 8 0v14c-2.5-1.3-5.5-1.3-8 0z" />
    <path d="M12 5.5c2.5-1.3 5.5-1.3 8 0v14c-2.5-1.3-5.5-1.3-8 0" />
  </Icone>
);

export const IconePaginas = (props: Props) => (
  <Icone {...props}>
    <path d="M8 3.5h11v14H8z" />
    <path d="M5 6.5v14h11" />
  </Icone>
);

export const IconePessoas = (props: Props) => (
  <Icone {...props}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" />
    <path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4" />
    <path d="M17.5 14.4c2 .8 3.5 2.9 3.5 5.6" />
  </Icone>
);

export const IconeCaixa = (props: Props) => (
  <Icone {...props}>
    <path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z" />
    <path d="M3.5 7.5 12 11.5l8.5-4" />
    <path d="M12 11.5v9" />
  </Icone>
);

export const IconeImagem = (props: Props) => (
  <Icone {...props}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
    <circle cx="9" cy="9.5" r="1.8" />
    <path d="m4 18 5-5 3.5 3.5L15 14l5 5" />
  </Icone>
);

export const IconeAjustes = (props: Props) => (
  <Icone {...props}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Icone>
);
