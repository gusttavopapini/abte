import type { MetadataRoute } from "next";

// robots.txt PROVISÓRIO: bloqueia todos os buscadores enquanto o site tiver
// conteúdo de exemplo (junto com o robots da metadata em app/layout.tsx).
// REMOVER NO LANÇAMENTO (etapa 9, ver checklist de lançamento no CLAUDE.md):
// trocar por regras que liberem o site público e bloqueiem só /admin.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
