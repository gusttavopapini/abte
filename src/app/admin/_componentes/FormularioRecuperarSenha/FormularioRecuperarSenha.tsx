"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { obterAuthCliente } from "@/lib/firebase/cliente";
import estilos from "./FormularioRecuperarSenha.module.css";

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "Esqueci minha senha": usa o e-mail de redefinição do próprio Firebase.
// Mostra sempre a mesma confirmação, exista ou não uma conta com o e-mail.
export function FormularioRecuperarSenha() {
  const [email, setEmail] = useState("");
  const [erroEmail, setErroEmail] = useState<string>();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const confirmacaoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (enviado) confirmacaoRef.current?.focus();
  }, [enviado]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroGeral(null);
    const valor = email.trim();
    const erro = !valor ? "Informe seu e-mail." : !EMAIL_VALIDO.test(valor) ? "Informe um e-mail válido, como nome@exemplo.com." : undefined;
    setErroEmail(erro);
    if (erro) return emailRef.current?.focus();

    setEnviando(true);
    try {
      await sendPasswordResetEmail(obterAuthCliente(), valor);
    } catch (falha) {
      const codigo = typeof falha === "object" && falha !== null && "code" in falha ? String(falha.code) : "";
      // Só a falta de conexão muda a resposta; qualquer outro erro mostra a
      // mesma confirmação, para não revelar quais e-mails têm conta.
      if (codigo === "auth/network-request-failed") {
        setErroGeral("Sem conexão com a internet. Confira sua conexão e tente de novo.");
        setEnviando(false);
        return;
      }
    }
    setEnviando(false);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className={estilos.formulario}>
        <Mensagem tipo="sucesso" ref={confirmacaoRef}>
          Se houver uma conta do painel com este e-mail, enviamos um link para criar uma nova senha. Confira sua caixa de
          entrada e também a pasta de spam.
        </Mensagem>
        <Link href="/admin/entrar" className={estilos.link}>
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form className={estilos.formulario} onSubmit={enviar} noValidate>
      <p>Informe o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.</p>
      <Campo
        id="recuperar-email"
        ref={emailRef}
        rotulo="E-mail"
        type="email"
        obrigatorio
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        erro={erroEmail}
      />
      {erroGeral && <Mensagem tipo="erro">{erroGeral}</Mensagem>}
      <Botao variante="envio" type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar link"}
      </Botao>
      <Link href="/admin/entrar" className={estilos.link}>
        Voltar para o login
      </Link>
    </form>
  );
}
