import type { Metadata } from "next";
import { FormularioRecuperarSenha } from "@/components/FormularioRecuperarSenha/FormularioRecuperarSenha";
import estilos from "./page.module.css";

export const metadata: Metadata = { title: "Esqueci minha senha", robots: { index: false, follow: false } };

export default function PaginaRecuperarSenhaLoja() {
  return (
    <div className={`container ${estilos.secao}`}>
      <h1 className={`tipo-h2 ${estilos.titulo}`}>Esqueci minha senha</h1>
      <div className={estilos.conteudo}>
        <FormularioRecuperarSenha rotaDoLogin="/loja/entrar" deOnde="da loja" />
      </div>
    </div>
  );
}
