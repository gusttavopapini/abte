import type { NextConfig } from "next";

const semIndexacao = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  // A raiz do projeto é esta pasta. Sem isso, o Turbopack avisa sobre um
  // package-lock.json solto fora do repositório (na pasta do usuário).
  turbopack: { root: __dirname },
  serverExternalPackages: ["firebase-admin"],
  transpilePackages: ["jwks-rsa", "jose"],
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
