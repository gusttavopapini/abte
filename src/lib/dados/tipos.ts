// Tipos dos documentos do Firestore, do jeito que o site os usa.
// Sem dependências: o servidor usa os valores e o navegador importa só os tipos.
// Campos de texto ausentes no banco chegam como texto vazio; datas ausentes,
// como null (ver os conversores em colecoes.ts).

export type Post = {
  id: string;
  titulo: string;
  // Endereço de capa antigo (texto livre, antes da biblioteca de mídia). Não é
  // mais editado no painel nem apagado: aparece só enquanto não há capaMidiaId.
  imagem: string;
  // Capa da biblioteca de mídia (fatia 3b); quando existe, vence a imagem antiga.
  capaMidiaId: string | null;
  conteudo: string;
  // "markdown": conteudo em Markdown restrito (posts importados do site
  // antigo, etapa 6). Ausente: texto puro, como os posts do painel.
  formatoConteudo: "markdown" | "texto";
  // Resumo para a lista do blog (vazio nos posts do painel).
  resumo: string;
  // Idioma do conteúdo, para o atributo lang da página (ausente: pt-BR).
  idioma: "pt-BR" | "es";
  status: string;
  slug: string;
  // Data original de publicação (posts importados); ausente: vale criadoEm.
  publicadoEm: Date | null;
  criadoEm: Date | null;
  atualizadoEm: Date | null;
};

export type Artigo = {
  id: string;
  titulo: string;
  // Id do documento em categoriasDeArtigos.
  categoria: string;
  // Ids dos documentos em tagsDeArtigos.
  tags: string[];
  autores: string;
  link: string;
  resumo: string;
  // Imagem da biblioteca de mídia (fatia 3c); aparece só na página do artigo.
  imagemMidiaId: string | null;
  status: string;
  criadoEm: Date | null;
  atualizadoEm: Date | null;
};

// Profissional do diretório (modelo de 10/10/2026). Contatos já padronizados
// pela validação (src/lib/contatos.ts): WhatsApp só com dígitos e código do
// país, Instagram só o usuário, Facebook o link completo. A foto é uma imagem
// da biblioteca de mídia (fotoMidiaId, etapa 4d); sem ela, o card mostra o
// espaço de imagem. Com excluidoEm preenchido, está na lixeira.
export type Profissional = {
  id: string;
  tipo: string;
  tratamento: string;
  nome: string;
  registro: string;
  metodos: string[];
  pais: string;
  uf: string;
  cidades: string[];
  telerreabilitacao: boolean;
  whatsapp: string;
  instagram: string;
  facebook: string;
  email: string;
  bio: string;
  ativo: boolean;
  ordem: number;
  fotoMidiaId: string | null;
  criadoEm: Date | null;
  atualizadoEm: Date | null;
  excluidoEm: Date | null;
};

// Tópicos editáveis no painel: categorias e tags dos artigos e categorias de
// produto. O slug é criado com o nome e não muda ao renomear (os endereços
// públicos continuam valendo). Com excluidoEm preenchido, o tópico está na
// lixeira: some do site e pode ser restaurado.
export type Topico = {
  id: string;
  nome: string;
  slug: string;
  // Ordem de exibição (só usada nas categorias; menor aparece primeiro).
  ordem: number;
  // Imagem da biblioteca de mídia (só categorias de artigo e de produto;
  // fatias 3c e 3d). O modelo de dados não define este campo: segue o padrão
  // imagemMidiaId dos artigos (registrado no CLAUDE.md).
  imagemMidiaId: string | null;
  criadoEm: Date | null;
  atualizadoEm: Date | null;
  excluidoEm: Date | null;
};

// categoria e tag: artigos; categoriaDeProduto: loja.
export type TipoDeTopico = "categoria" | "tag" | "categoriaDeProduto";

// Produto da loja. Preços em centavos (inteiros) para não haver erro de
// arredondamento; precoPromocional null quando não há promoção. O slug é
// criado com o nome, é único e não muda ao renomear. Sem galeria até a
// biblioteca de mídia (etapa 4d). Com excluidoEm preenchido, está na lixeira.
export type Produto = {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  preco: number;
  precoPromocional: number | null;
  // Id do documento em categoriasDeProdutos.
  categoria: string;
  tipo: "fisico" | "digital";
  status: "disponivel" | "esgotado";
  selo: string;
  ordem: number;
  publicado: boolean;
  // Imagens da biblioteca de mídia (fatia 3d), já ordenadas pela ordem; a
  // primeira é a principal.
  imagens: { midiaId: string; ordem: number }[];
  criadoEm: Date | null;
  atualizadoEm: Date | null;
  excluidoEm: Date | null;
};

// Imagem da biblioteca de mídia (etapa 4d). O documento guarda só caminhos
// no Storage; o endereço público é montado com o bucket (urlPublica, em
// src/lib/midia/regras.ts). Largura e altura são as da imagem enviada, já na
// orientação certa. Com excluidoEm preenchido, está na lixeira (arquivos em
// lixeira/, fora do ar).
export type VarianteDeMidia = { largura: number; caminho: string; tamanho: number };

// Conferência de fotos de menores nas imagens importadas do site antigo
// (etapa 6): toda imagem migrada entra "pendente"; só uma pessoa marca
// "conferido" ou "naoSeAplica". Imagens enviadas pelo painel não têm o campo.
export type ConferenciaDeMenor = "pendente" | "conferido" | "naoSeAplica";

// De onde veio uma imagem importada: o sistema antigo, o id da mídia lá (nunca
// o endereço) e a execução do script que a criou.
export type OrigemDaMidia = { sistema: string; midiaId: string; execucao: string };

export type Midia = {
  id: string;
  caminhoStorage: string;
  tipo: "imagem";
  alt: string;
  largura: number;
  altura: number;
  tamanho: number;
  variantes: VarianteDeMidia[];
  enviadoPor: string;
  // Aviso de menores (texto PROVISÓRIO): quem confirmou a autorização e quando.
  // As imagens importadas do site antigo não gravam esses campos (chegam como
  // false e null); usam conferenciaDeMenor.
  indicaMenor: boolean;
  autorizacaoConfirmadaPor: string | null;
  autorizacaoConfirmadaEm: Date | null;
  // Só nas importadas: alt montado pelo script, a revisar (editar o alt no
  // painel limpa a marca), conferência de menores e origem. Nas enviadas pelo
  // painel: false, null e null.
  altProvisorio: boolean;
  conferenciaDeMenor: ConferenciaDeMenor | null;
  origem: OrigemDaMidia | null;
  criadoEm: Date | null;
  excluidoEm: Date | null;
};
