import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

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

// Endereços da rede local liberados só no servidor de desenvolvimento.
// O Next.js bloqueia, por segurança, os recursos de desenvolvimento pedidos
// de outra origem que não localhost; sem isto, quem abre o site pelo IP da
// máquina (por exemplo, no celular, em http://192.168.1.x:3000) recebe a
// página sem a conexão /_next/hmr, e o React não liga: banner parado, setas
// e submenu sem resposta. O "*" vale para o último número do IP, porque o
// roteador pode trocar o endereço da máquina dentro da rede 192.168.1.
// Nenhum endereço público entra aqui.
const origensDaRedeLocal = ["192.168.1.*"];

// No build de produção e na Vercel a configuração é a mesma de antes.
export default function configuracao(fase: string): NextConfig {
  if (fase !== PHASE_DEVELOPMENT_SERVER) return nextConfig;
  return { ...nextConfig, allowedDevOrigins: origensDaRedeLocal };
}
