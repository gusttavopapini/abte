"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { criarSessao } from "@/app/admin/acoes";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { obterAuthCliente } from "@/lib/firebase/cliente";
import { mensagemDeErroDoLogin } from "./erros";
import estilos from "./FormularioLogin.module.css";

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ErrosCampo = { email?: string; senha?: string };

export function FormularioLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [errosCampo, setErrosCampo] = useState<ErrosCampo>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const senhaRef = useRef<HTMLInputElement>(null);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroGeral(null);

    const erros: ErrosCampo = {};
    if (!email.trim()) erros.email = "Informe seu e-mail.";
    else if (!EMAIL_VALIDO.test(email.trim())) erros.email = "Informe um e-mail válido, como nome@exemplo.com.";
    if (!senha) erros.senha = "Informe sua senha.";
    setErrosCampo(erros);
    if (erros.email) return emailRef.current?.focus();
    if (erros.senha) return senhaRef.current?.focus();

    setEnviando(true);
    try {
      const auth = obterAuthCliente();
      const credencial = await signInWithEmailAndPassword(auth, email.trim(), senha);
      const idToken = await credencial.user.getIdToken();
      const resultado = await criarSessao(idToken);
      // O login no navegador só serve para gerar o token: a sessão fica no
      // cookie criado pelo servidor.
      await signOut(auth);

      if (resultado.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      setErroGeral(
        resultado.motivo === "nao-autorizado"
          ? "Acesso não autorizado. Esta conta não tem permissão para usar o painel da ABTE."
          : "Não foi possível entrar agora. Tente de novo em alguns minutos.",
      );
    } catch (erro) {
      setErroGeral(mensagemDeErroDoLogin(erro));
    }
    setEnviando(false);
  }

  return (
    <form className={estilos.formulario} onSubmit={entrar} noValidate>
      <Campo
        id="login-email"
        ref={emailRef}
        rotulo="E-mail"
        type="email"
        obrigatorio
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        erro={errosCampo.email}
      />
      <Campo
        id="login-senha"
        ref={senhaRef}
        rotulo="Senha"
        type="password"
        obrigatorio
        autoComplete="current-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        erro={errosCampo.senha}
      />
      {erroGeral && <Mensagem tipo="erro">{erroGeral}</Mensagem>}
      <Botao variante="envio" type="submit" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Botao>
      <Link href="/admin/entrar/recuperar-senha" className={estilos.link}>
        Esqueci minha senha
      </Link>
    </form>
  );
}
