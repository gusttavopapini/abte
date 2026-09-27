// Stylelint: garante que cores e tamanhos de fonte venham só do tokens.css.
/** @type {import('stylelint').Config} */
const configuracao = {
  // O tokens.css é a única fonte dos valores visuais.
  ignoreFiles: ["src/styles/tokens.css", "node_modules/**", ".next/**", "docs/**"],
  reportNeedlessDisables: true,
  rules: {
    // Nenhuma cor em hexadecimal, rgb, hsl ou por nome (use var(--color-...)).
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color"],
    // Nenhum tamanho de fonte em px (use var(--font-size-...)).
    "declaration-property-unit-disallowed-list": {
      "font-size": ["px"],
      font: ["px"],
    },
  },
};

export default configuracao;
