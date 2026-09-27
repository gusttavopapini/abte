import estilos from "./PularParaConteudo.module.css";

// Primeiro link da página: só aparece quando recebe foco pelo teclado.
export function PularParaConteudo({ alvo = "conteudo" }: { alvo?: string }) {
  return (
    <a href={`#${alvo}`} className={estilos.pular}>
      Pular para o conteúdo
    </a>
  );
}
