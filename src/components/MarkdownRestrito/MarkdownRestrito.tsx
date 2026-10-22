import Link from "next/link";
import type { ReactNode } from "react";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import type { Bloco, Trecho } from "@/lib/markdownRestrito";
import type { ImagemNaTela } from "@/lib/midia/tela";
import estilos from "./MarkdownRestrito.module.css";

type Props = {
  // Já lidos por lerMarkdownRestrito (src/lib/markdownRestrito.ts).
  blocos: Bloco[];
  // Imagens da biblioteca já buscadas no servidor (imagensAtivasPorId). Uma
  // imagem fora do mapa (inexistente, na lixeira ou ainda não ligada) não
  // aparece.
  imagens: Map<string, ImagemNaTela>;
  // Largura ocupada pelas imagens na tela (atributo sizes).
  sizes: string;
};

// Conteúdo em Markdown restrito (decisão 1), montado só com elementos React:
// nada de HTML vindo do conteúdo. O H1 é o título da página; os títulos do
// conteúdo começam no H2, e um ### antes de qualquer ## vira H2, para a
// hierarquia não pular nível.
export function MarkdownRestrito({ blocos, imagens, sizes }: Props) {
  let temH2 = false;
  return blocos.map((bloco, i) => {
    if (bloco.tipo === "titulo") {
      const nivel = bloco.nivel === 3 && temH2 ? 3 : 2;
      temH2 = true;
      return nivel === 2 ? <h2 key={i}>{trechos(bloco.trechos)}</h2> : <h3 key={i}>{trechos(bloco.trechos)}</h3>;
    }
    if (bloco.tipo === "lista") {
      const itens = bloco.itens.map((item, j) => <li key={j}>{trechos(item)}</li>);
      return bloco.numerada ? (
        <ol key={i} start={bloco.inicio === 1 ? undefined : bloco.inicio} className={estilos.lista}>
          {itens}
        </ol>
      ) : (
        <ul key={i} className={estilos.lista}>
          {itens}
        </ul>
      );
    }
    if (bloco.tipo === "citacao") {
      return (
        <blockquote key={i} className={estilos.citacao}>
          {bloco.paragrafos.filter((parte) => parte.length > 0).map((parte, j) => (
            <p key={j}>{trechos(parte)}</p>
          ))}
        </blockquote>
      );
    }
    if (bloco.tipo === "imagem") {
      const imagem = imagens.get(bloco.midia);
      if (!imagem) return null;
      return (
        <ImagemDaMidia key={i} variantes={imagem.variantes} alt={imagem.alt} largura={imagem.largura} altura={imagem.altura} sizes={sizes} className={estilos.imagem} />
      );
    }
    return <p key={i}>{trechos(bloco.trechos)}</p>;
  });
}

function trechos(lista: Trecho[]): ReactNode[] {
  return lista.map((trecho, i) => {
    if (trecho.tipo === "texto") return trecho.texto;
    if (trecho.tipo === "negrito") return <strong key={i} className={estilos.negrito}>{trechos(trecho.trechos)}</strong>;
    if (trecho.tipo === "italico") return <em key={i}>{trechos(trecho.trechos)}</em>;
    // O endereço já foi conferido na leitura (https:, mailto: ou caminho interno).
    if (trecho.endereco.startsWith("/")) {
      return (
        <Link key={i} href={trecho.endereco}>
          {trechos(trecho.trechos)}
        </Link>
      );
    }
    return (
      <a key={i} href={trecho.endereco} rel={trecho.endereco.startsWith("https:") ? "noopener noreferrer" : undefined}>
        {trechos(trecho.trechos)}
      </a>
    );
  });
}
