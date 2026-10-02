import { Botao } from "@/components/Botao/Botao";
import type { Post } from "@/lib/dados/tipos";
import {
  estiloAreaDeTexto,
  estiloEntrada,
  estiloFormulario,
  estiloRotulo,
} from "../estilosDoFormulario";
import classes from "../estilosDoFormulario.module.css";

type PropsFormularioPost = {
  acao: (dados: FormData) => Promise<void>;
  // Sem post: formulário de criação. Com post: edição, com os valores atuais.
  post?: Pick<Post, "id" | "titulo" | "imagem" | "conteudo">;
  rotuloPublicar: string;
  rotuloRascunho: string;
};

// Formulário de post do blog, usado em "Adicionar Novo Post" e em "Editar Post".
export function FormularioPost({ acao, post, rotuloPublicar, rotuloRascunho }: PropsFormularioPost) {
  return (
    <form action={acao} style={estiloFormulario}>
      {post && <input type="hidden" name="id" value={post.id} />}

      <div className={classes.grupo}>
        <label htmlFor="titulo" style={estiloRotulo}>Título do Post</label>
        <input
          type="text"
          id="titulo"
          name="titulo"
          defaultValue={post?.titulo}
          placeholder="Ex: Novo tratamento para escoliose..."
          style={estiloEntrada}
          required
        />
      </div>

      <div className={classes.grupo}>
        <label htmlFor="imagem" style={estiloRotulo}>Imagem de Capa (URL)</label>
        <input
          type="text"
          id="imagem"
          name="imagem"
          defaultValue={post?.imagem}
          placeholder="https://exemplo.com/imagem.jpg"
          style={estiloEntrada}
        />
      </div>

      <div className={classes.grupo}>
        <label htmlFor="conteudo" style={estiloRotulo}>Conteúdo</label>
        <textarea
          id="conteudo"
          name="conteudo"
          defaultValue={post?.conteudo}
          rows={15}
          placeholder="Escreva o conteúdo do post aqui..."
          style={estiloAreaDeTexto}
          required
        />
      </div>

      <div className={classes.botoes}>
        <Botao type="submit" name="acao" value="publicar" variante="primario">{rotuloPublicar}</Botao>
        <Botao type="submit" name="acao" value="rascunho" variante="secundario">{rotuloRascunho}</Botao>
      </div>
    </form>
  );
}
