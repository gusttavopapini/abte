import type { ReactNode } from "react";
import { PlaceholderImagem } from "../PlaceholderImagem/PlaceholderImagem";
import estilos from "./Hero.module.css";

type PropsHero = {
  titulo: ReactNode;
  // "h1" nas páginas; "p" na página /componentes (visual de H1 sem criar outro H1).
  elementoTitulo?: "h1" | "p";
  // Cartão branco no canto inferior esquerdo, com texto e botões.
  cartao?: { texto: ReactNode; botoes: ReactNode };
  // Deixa espaço no topo para o header transparente fixo (home).
  sobHeaderFixo?: boolean;
};

// Hero (design-system.md seção 8.7). Enquanto não há fotos, um bloco
// --color-bg-alt ocupa o lugar da foto.
// O atributo data-hero é usado pelo header transparente para saber quando o
// hero saiu da tela.
export function Hero({ titulo, elementoTitulo: Titulo = "h1", cartao, sobHeaderFixo }: PropsHero) {
  return (
    <section data-hero="" className={`${estilos.hero} ${sobHeaderFixo ? estilos.sobHeaderFixo : ""}`}>
      {/* Lugar da foto sangrada (fotos ainda não recebidas) */}
      <div className={estilos.foto}>
        <PlaceholderImagem />
      </div>
      <div className={`container ${estilos.conteudo}`}>
        <Titulo className={`tipo-h1 ${estilos.titulo}`}>{titulo}</Titulo>
        {cartao && (
          <div className={estilos.cartao}>
            <div className="tipo-texto-lg">{cartao.texto}</div>
            <div className={estilos.botoes}>{cartao.botoes}</div>
          </div>
        )}
      </div>
    </section>
  );
}
