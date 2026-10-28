// O que a página /profissionais envia ao navegador. Função pura: recebe o
// documento já lido no servidor e devolve SÓ os campos públicos que o card e o
// popup mostram. Campos internos (ativo, ordem, datas, id da foto e qualquer
// campo da migração ou de revisão gravado no documento) nunca saem daqui.
import { PAISES, TAGS_DE_PROFISSIONAIS, TAG_SEM_CLASSIFICACAO } from "../config/profissionais.ts";
import type { Profissional } from "./dados/tipos.ts";
import type { ImagemNaTela } from "./midia/tela.ts";

export type ProfissionalPublico = {
  id: string;
  // Tipo do profissional, usado pelo filtro (?tag=...).
  tipo: string;
  tratamento: string;
  nome: string;
  registro: string;
  metodos: string[];
  // Cidades, UF ou país, já em texto (ex.: "Cidade Um, Cidade Dois / SP").
  local: string;
  telerreabilitacao: boolean;
  whatsapp: string;
  instagram: string;
  facebook: string;
  email: string;
  // Apresentação completa (o card mostra a versão curta; o popup, toda).
  bio: string;
  // Foto da biblioteca de mídia; null sem foto ou com a imagem na lixeira.
  foto: ImagemNaTela | null;
};

// Lista fechada dos campos que vão ao navegador (conferida nos testes).
export const CAMPOS_PUBLICOS_DO_PROFISSIONAL = [
  "id", "tipo", "tratamento", "nome", "registro", "metodos", "local", "telerreabilitacao",
  "whatsapp", "instagram", "facebook", "email", "bio", "foto",
] as const satisfies readonly (keyof ProfissionalPublico)[];

// "Cidade Um, Cidade Dois / SP" no Brasil; nos outros países, o nome do país.
export function localDoProfissional({ cidades, pais, uf }: Pick<Profissional, "cidades" | "pais" | "uf">): string {
  const regiao = pais === "BR" ? uf : PAISES.find((item) => item.codigo === pais)?.nome ?? "";
  return [cidades.join(", "), regiao].filter(Boolean).join(" / ");
}

// Monta o objeto campo a campo (nunca espalha o documento), para que um campo
// novo no Firestore não chegue ao navegador sem passar por aqui.
export function paraProfissionalPublico(profissional: Profissional, foto: ImagemNaTela | null): ProfissionalPublico {
  return {
    id: profissional.id,
    tipo: (TAGS_DE_PROFISSIONAIS as readonly string[]).includes(profissional.tipo) ? profissional.tipo : TAG_SEM_CLASSIFICACAO,
    tratamento: profissional.tratamento,
    nome: profissional.nome,
    registro: profissional.registro,
    metodos: [...profissional.metodos],
    local: localDoProfissional(profissional),
    telerreabilitacao: profissional.telerreabilitacao,
    whatsapp: profissional.whatsapp,
    instagram: profissional.instagram,
    facebook: profissional.facebook,
    email: profissional.email,
    bio: profissional.bio,
    foto: foto ? { alt: foto.alt, largura: foto.largura, altura: foto.altura, variantes: foto.variantes.map(({ largura, url }) => ({ largura, url })) } : null,
  };
}
