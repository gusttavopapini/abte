// Validações puras, sem dependências: usadas no servidor e nos testes de unidade.

// Regras de ID de documento do Firestore: texto não vazio, até 1.500 bytes,
// sem barra, diferente de "." e de "..", e fora do formato reservado __nome__.
const TAMANHO_MAXIMO_ID_EM_BYTES = 1500;
const ID_RESERVADO = /^__.*__$/;

export function ehIdDeDocumentoValido(valor: unknown): valor is string {
  if (typeof valor !== "string" || valor.length === 0) return false;
  if (new TextEncoder().encode(valor).length > TAMANHO_MAXIMO_ID_EM_BYTES) return false;
  if (valor.includes("/") || valor === "." || valor === "..") return false;
  return !ID_RESERVADO.test(valor);
}

type OpcoesDoCampo = {
  // Nome do campo como aparece na tela, para a mensagem de erro.
  rotulo: string;
  // Limite de caracteres. Só para campos curtos; textos longos não têm limite.
  limite?: number;
};

// Lê um campo de texto de um FormData. Qualquer coisa que não seja texto
// (ex.: um arquivo enviado no lugar) vira texto vazio. Acima do limite, recusa
// com mensagem em português.
export function lerTextoDoFormulario(dados: FormData, campo: string, { rotulo, limite }: OpcoesDoCampo): string {
  const valor = dados.get(campo);
  if (typeof valor !== "string") return "";
  if (limite !== undefined && valor.length > limite) {
    throw new Error(`O campo "${rotulo}" aceita no máximo ${limite} caracteres.`);
  }
  return valor;
}

// Formato mínimo de e-mail (algo@algo.algo, sem espaços). Usado no login, na
// recuperação de senha e no formulário de contato.
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ehEmailValido(valor: string): boolean {
  return EMAIL_VALIDO.test(valor);
}

type OpcoesDoInteiro = {
  rotulo: string;
  minimo: number;
  maximo: number;
  // Valor usado quando o campo vem vazio.
  padrao: number;
};

// Lê um número inteiro de um FormData (ex.: a ordem de exibição). Campo vazio
// usa o padrão; texto que não é inteiro ou fora do intervalo é recusado com
// mensagem em português.
export function lerInteiroDoFormulario(dados: FormData, campo: string, { rotulo, minimo, maximo, padrao }: OpcoesDoInteiro): number {
  const valor = dados.get(campo);
  if (typeof valor !== "string" || valor.trim() === "") return padrao;
  if (!/^-?\d+$/.test(valor.trim())) throw new Error(`O campo "${rotulo}" aceita só números inteiros.`);
  const numero = Number(valor.trim());
  if (numero < minimo || numero > maximo) {
    throw new Error(`O campo "${rotulo}" aceita valores de ${minimo} a ${maximo}.`);
  }
  return numero;
}

// Lê todos os valores de um campo repetido (ex.: caixas de seleção marcadas),
// sem repetição e sem nada que não seja texto. Acima do limite, recusa.
export function lerListaDoFormulario(dados: FormData, campo: string, { rotulo, limite }: { rotulo: string; limite: number }): string[] {
  const valores = [...new Set(dados.getAll(campo).filter((valor): valor is string => typeof valor === "string" && valor !== ""))];
  if (valores.length > limite) throw new Error(`O campo "${rotulo}" aceita no máximo ${limite} itens.`);
  return valores;
}
