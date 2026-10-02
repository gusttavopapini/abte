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

// Classificações oferecidas no painel. Atenção: são diferentes das categorias
// de exemplo da página pública /artigos (pendência registrada no CLAUDE.md).
const CLASSIFICACOES = [
  { valor: "diretrizes", rotulo: "Diretrizes (SOSORT guidelines)" },
  { valor: "revisao-sistematica", rotulo: "Revisão Sistemática" },
  { valor: "colete", rotulo: "Uso de colete (Bracing)" },
  { valor: "exercicios", rotulo: "Exercícios Específicos (PSSE)" },
  { valor: "cirurgia", rotulo: "Cirurgia" },
  { valor: "qualidade-de-vida", rotulo: "Qualidade de vida / Saúde Mental" },
  { valor: "outros", rotulo: "Outros" },
];

type PropsFormularioArtigo = {
  acao: (dados: FormData) => Promise<void>;
  // Sem artigo: formulário de criação. Com artigo: edição, com os valores atuais.
  artigo?: Pick<Artigo, "id" | "titulo" | "categoria" | "autores" | "link" | "resumo">;
  rotuloPublicar: string;
  rotuloRascunho: string;
};

// Formulário de artigo científico, usado em "Adicionar Novo Artigo" e em "Editar Artigo".
export function FormularioArtigo({ acao, artigo, rotuloPublicar, rotuloRascunho }: PropsFormularioArtigo) {
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
        <label htmlFor="categoria" style={estiloRotulo}>Classificação / Tipo de Artigo</label>
        <select id="categoria" name="categoria" defaultValue={artigo?.categoria} style={estiloSelecao} required>
          <option value="">Selecione uma categoria...</option>
          {CLASSIFICACOES.map(({ valor, rotulo }) => (
            <option key={valor} value={valor}>{rotulo}</option>
          ))}
        </select>
      </div>

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
