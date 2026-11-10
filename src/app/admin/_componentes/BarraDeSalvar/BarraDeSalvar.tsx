import type { ReactNode } from "react";
import estilos from "./BarraDeSalvar.module.css";

type Props = {
  children: ReactNode;
  // Situação atual do item (ex.: "Ativo no site", "Oculto", "Rascunho").
  situacao?: ReactNode;
  // Frase curta de ajuda (o que cada botão faz, ou "Há alterações não salvas").
  aviso?: ReactNode;
};

// Barra com os botões de salvar (29/10/2026; numa linha desde 10/11/2026):
// à esquerda a situação e a ajuda; à direita Cancelar, o botão secundário e o
// primário, nessa ordem. Nas páginas, fica presa ao pé da tela; nas janelas
// de formulário, é o rodapé da janela, na largura toda. Até 767px, os botões
// ficam empilhados, na largura toda.
export function BarraDeSalvar({ children, situacao, aviso }: Props) {
  return (
    <div className={estilos.barra}>
      {(situacao || aviso) && (
        <div className={estilos.textos}>
          {situacao && (
            <p className={estilos.situacao}>
              Situação: <strong>{situacao}</strong>
            </p>
          )}
          {aviso && <p className={estilos.aviso}>{aviso}</p>}
        </div>
      )}
      <div className={estilos.botoes}>{children}</div>
    </div>
  );
}
