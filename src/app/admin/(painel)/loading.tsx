import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";

// Enquanto a tela do painel carrega (29/10/2026).
export default function Carregando() {
  return (
    <CaixaDoPainel titulo="Carregando" anunciar>
      <p>Buscando os dados desta tela...</p>
    </CaixaDoPainel>
  );
}
