import type { NextConfig } from "next";

const semIndexacao = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  // Não anuncia o framework no cabeçalho das respostas.
  poweredByHeader: false,
  async headers() {
    return [
      // Painel e página de revisão visual fora dos buscadores.
      { source: "/admin", headers: semIndexacao },
      { source: "/admin/:caminho*", headers: semIndexacao },
      { source: "/componentes", headers: semIndexacao },
    ];
  },
};

export default nextConfig;
