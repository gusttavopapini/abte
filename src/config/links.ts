// Links externos do site num lugar só (30/10/2026).
//
// Associação por Google Forms: decisão provisória do responsável em
// 30/10/2026 (P8). Os dois endereços são públicos (formulários abertos do
// Google) e podem ficar versionados.
export const FORMULARIOS_DE_ASSOCIACAO = {
  medico: "https://forms.gle/3L79QvKTxG6T9VES6",
  fisioterapeuta: "https://docs.google.com/forms/d/e/1FAIpQLSfUJ1onBYMPT2tVL9fsHd99xTknpzF9mYB1MffAcuKJDGbR_Q/viewform",
} as const;

// Endereços do próprio site (30/10/2026): colados no link do banner como
// "Página do site", viram o caminho interno (ex.: /blog).
export const DOMINIOS_DO_SITE = ["abte-lovat.vercel.app"] as const;
