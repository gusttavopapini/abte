import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";

// Public Sans auto-hospedada pelo Next.js: o arquivo da fonte é baixado no
// build e servido pelo próprio site, sem requisição ao Google no navegador.
const publicSans = Public_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ABTE, Associação Brasileira de Tratamento da Escoliose",
    template: "%s | ABTE",
  },
  description:
    "Informação confiável, profissionais certificados e apoio para pacientes e famílias no tratamento conservador da escoliose.",
  // Sem ícone até a ABTE enviar o logo em vetor (evita o erro 404 do favicon).
  icons: { icon: "data:," },
  // PROVISÓRIO: o site inteiro fora dos buscadores enquanto houver conteúdo
  // de exemplo (junto com o src/app/robots.ts). REMOVER NO LANÇAMENTO
  // (etapa 9, ver checklist de lançamento no CLAUDE.md).
  robots: { index: false, follow: false },
};

// Liga o movimento de entrada (componente Revelar) antes da primeira pintura,
// só com JavaScript ativo, IntersectionObserver disponível e sem preferência
// por movimento reduzido. Se o observador não avisar em 3 segundos que
// carregou (data-revelacao-pronta), a marca sai e nada fica escondido.
const SCRIPT_DO_MOVIMENTO = `(function(){var h=document.documentElement;try{if(!window.matchMedia("(prefers-reduced-motion: no-preference)").matches||!("IntersectionObserver" in window))return;h.classList.add("movimento");setTimeout(function(){if(!h.hasAttribute("data-revelacao-pronta"))h.classList.remove("movimento")},3000)}catch(e){h.classList.remove("movimento")}})();`;

export default function LayoutRaiz({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: o script abaixo acrescenta classe e atributo ao <html> antes do React.
    <html lang="pt-BR" className={publicSans.className} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_DO_MOVIMENTO }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
