import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";

// Public Sans auto-hospedada pelo Next.js: o arquivo da fonte é baixado no
// build e servido pelo próprio site, sem requisição ao Google no navegador.
const publicSans = Public_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
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
};

export default function LayoutRaiz({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={publicSans.className}>
      <body>{children}</body>
    </html>
  );
}
