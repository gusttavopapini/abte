import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import type { ImagemNaTela } from "@/lib/midia/tela";
import estilos from "./CardMembroDiretoria.module.css";

// Largura do card na grade de /diretoria (1, 2 e 4 colunas), para o navegador
// escolher a variante da foto.
const LARGURA_DA_FOTO = "(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw";

// Card de equipe no padrão dos cards de profissional (25/10/2026): foto
// quadrada primeiro, depois nome e cargo. Com foto, a imagem da biblioteca
// com o texto alternativo cadastrado nela; sem foto, ou com a imagem na
// lixeira, o placeholder no mesmo quadrado.
export function CardMembroDiretoria({ nome, cargo, foto }: { nome: string; cargo: string; foto: ImagemNaTela | null }) {
  return (
    <article className={estilos.card}>
      <div className={estilos.imagemContainer}>
        {foto ? (
          <ImagemDaMidia variantes={foto.variantes} alt={foto.alt} largura={foto.largura} altura={foto.altura} sizes={LARGURA_DA_FOTO} className={estilos.imagem} />
        ) : (
          <PlaceholderImagem />
        )}
      </div>
      <div className={estilos.cabecalho}>
        <h3 className={estilos.nome}>{nome}</h3>
        {cargo && <p className={estilos.cargo}>{cargo}</p>}
      </div>
    </article>
  );
}
