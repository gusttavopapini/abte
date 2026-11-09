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
  // Código do país (BR, PY, BO) e a UF (só no Brasil; vazia se não cadastrada),
  // usados pelo filtro por estado (04/11/2026).
  pais: string;
  uf: string;
  telerreabilitacao: boolean;
  whatsapp: string;
  // Telefones (06/11/2026), só os dígitos com o código do país.
  telefones: string[];
  instagram: string;
  // Sem Facebook desde 04/11/2026: o dado continua no cadastro do painel,
  // mas não vai ao site.
  email: string;
  // Campos extras (08/11/2026): endereço do consultório, site, outros perfis
  // e a lista de cidades (o local acima junta cidades e UF). Os e-mails
  // extras ficam só no painel.
  endereco: string;
  site: string;
  outrosPerfis: { rotulo: string; url: string }[];
  cidades: string[];
  // Apresentação completa (o card mostra a versão curta; o popup, toda).
  bio: string;
  // Foto da biblioteca de mídia; null sem foto ou com a imagem na lixeira.
  foto: ImagemNaTela | null;
};

// Lista fechada dos campos que vão ao navegador (conferida nos testes).
export const CAMPOS_PUBLICOS_DO_PROFISSIONAL = [
  "id", "tipo", "tratamento", "nome", "registro", "metodos", "local", "pais", "uf", "telerreabilitacao",
  "whatsapp", "telefones", "instagram", "email", "endereco", "site", "outrosPerfis", "cidades", "bio", "foto",
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
    pais: profissional.pais,
    // UF só no Brasil; fora dele, vazia (nunca inventada).
    uf: profissional.pais === "BR" ? profissional.uf : "",
    telerreabilitacao: profissional.telerreabilitacao,
    whatsapp: profissional.whatsapp,
    telefones: [...profissional.telefones],
    instagram: profissional.instagram,
    email: profissional.email,
    endereco: profissional.endereco,
    // Só links http(s) chegam ao navegador (conferido de novo aqui).
    site: /^https?:\/\//i.test(profissional.site) ? profissional.site : "",
    outrosPerfis: profissional.outrosPerfis.filter((perfil) => /^https?:\/\//i.test(perfil.url)).map(({ rotulo, url }) => ({ rotulo, url })),
    cidades: [...profissional.cidades],
    bio: profissional.bio,
    foto: foto ? { alt: foto.alt, largura: foto.largura, altura: foto.altura, variantes: foto.variantes.map(({ largura, url }) => ({ largura, url })) } : null,
  };
}
