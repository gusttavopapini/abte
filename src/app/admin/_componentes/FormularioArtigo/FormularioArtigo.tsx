import Link from "next/link";
import { Botao } from "@/components/Botao/Botao";
import type { Artigo } from "@/lib/dados/tipos";
import {
  estiloAreaDeTexto,
  estiloEntrada,
  estiloFormulario,
  estiloRotulo,
  estiloSelecao,
} from "../estilosDoFormulario";
import classes from "../estilosDoFormulario.module.css";

// Categoria ou tag cadastrada em "Tópicos dos artigos".
type OpcaoDeTopico = { id: string; nome: string };

type PropsFormularioArtigo = {
  acao: (dados: FormData) => Promise<void>;
  // Sem artigo: formulário de criação. Com artigo: edição, com os valores atuais.
  artigo?: Pick<Artigo, "id" | "titulo" | "categoria" | "tags" | "autores" | "link" | "resumo">;
  // Tópicos fora da lixeira, lidos do Firestore pela página.
  categorias: OpcaoDeTopico[];
  tags: OpcaoDeTopico[];
  rotuloPublicar: string;
  rotuloRascunho: string;
};

// Formulário de artigo científico, usado em "Adicionar Novo Artigo" e em "Editar Artigo".
export function FormularioArtigo({ acao, artigo, categorias, tags, rotuloPublicar, rotuloRascunho }: PropsFormularioArtigo) {
  return (
    <form action={acao} style={estiloFormulario}>
      {artigo && <input type="hidden" name="id" value={artigo.id} />}

      <div className={classes.grupo}>
        <label htmlFor="titulo" style={estiloRotulo}>Título do Artigo</label>
        <input
          type="text"
          id="titulo"
          name="titulo"
          defaultValue={artigo?.titulo}
          placeholder="Ex: The effect of bracing on scoliosis..."
          style={estiloEntrada}
          required
        />
      </div>

      <div className={classes.grupo}>
        <label htmlFor="categoria" style={estiloRotulo}>Categoria</label>
        <select id="categoria" name="categoria" defaultValue={artigo?.categoria} style={estiloSelecao} required aria-describedby="categoria-ajuda">
          <option value="">Selecione uma categoria...</option>
          {categorias.map(({ id, nome }) => (
            <option key={id} value={id}>{nome}</option>
          ))}
        </select>
        <p id="categoria-ajuda" className={classes.ajuda}>
          {categorias.length === 0 ? "Nenhuma categoria cadastrada ainda. " : "Para criar ou renomear categorias, use "}
          <Link href="/admin/artigos/topicos">{categorias.length === 0 ? "Cadastre em Tópicos dos artigos" : "Tópicos dos artigos"}</Link>.
        </p>
      </div>

      <fieldset className={`${classes.grupo} ${classes.semMoldura}`}>
        <legend style={estiloRotulo}>Tags (opcional)</legend>
        {tags.length === 0 ? (
          <p className={classes.ajuda}>Nenhuma tag cadastrada ainda.</p>
        ) : (
          <div className={classes.opcoes}>
            {tags.map(({ id, nome }) => (
              <label key={id} className={classes.opcao}>
                <input type="checkbox" name="tags" value={id} defaultChecked={artigo?.tags.includes(id)} />
                {nome}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className={classes.grupo}>
        <label htmlFor="autores" style={estiloRotulo}>Autores / Ano</label>
        <input
          type="text"
          id="autores"
          name="autores"
          defaultValue={artigo?.autores}
          placeholder="Ex: Negrini et al., 2018"
          style={estiloEntrada}
          required
        />
      </div>

      <div className={classes.grupo}>
        <label htmlFor="link" style={estiloRotulo}>Link do Estudo (URL)</label>
        <input
          type="text"
          id="link"
          name="link"
          defaultValue={artigo?.link}
          placeholder="https://pubmed.ncbi.nlm.nih.gov/..."
          style={estiloEntrada}
          required
        />
      </div>

      <div className={classes.grupo}>
        <label htmlFor="resumo" style={estiloRotulo}>Resumo ou Pontos Principais</label>
        <textarea
          id="resumo"
          name="resumo"
          defaultValue={artigo?.resumo}
          rows={10}
          placeholder="Descreva brevemente os achados do artigo..."
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
