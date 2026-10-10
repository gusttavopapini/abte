"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { excluirContaCliente } from "@/app/loja/acoes-conta";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { mensagemDeErroDoLogin } from "@/lib/auth/erros-do-login";
import { obterAuthCliente } from "@/lib/firebase/cliente";
import estilos from "./ExcluirConta.module.css";

// Exclusão da conta pelo próprio cliente: pede a senha de novo e apaga a conta,
// os dados do cliente e o carrinho. Deu certo, a ação leva para a loja, que
// mostra a confirmação; aqui só aparecem os erros.
export function ExcluirConta({ email }: { email: string }) {
  const id = useId();
  const [senha, setSenha] = useState("");
  const [erroSenha, setErroSenha] = useState<string>();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const respostaRef = useRef<HTMLDivElement>(null);

  async function excluir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    if (!senha) {
      setErroSenha("Digite sua senha para confirmar.");
      return;
    }
    setErroSenha(undefined);
    setEnviando(true);
    let mensagem: string;
    try {
      const auth = obterAuthCliente();
      const credencial = await signInWithEmailAndPassword(auth, email, senha);
      const idToken = await credencial.user.getIdToken();
      await signOut(auth).catch(() => undefined);
      const resultado = await excluirContaCliente(idToken);
      // Deu certo: a ação já está levando para a loja.
      if (!resultado) return;
      mensagem = resultado.mensagem;
    } catch (falha) {
      mensagem = mensagemDeErroDoLogin(falha).replace("E-mail ou senha incorretos.", "Senha incorreta.");
    }
    setErro(mensagem);
    setEnviando(false);
    requestAnimationFrame(() => respostaRef.current?.focus());
  }

  return (
    <form className={estilos.bloco} onSubmit={excluir} noValidate>
      <p>Isto apaga sua conta da loja, com seu nome, seu e-mail e seu carrinho. Não dá para desfazer.</p>
      <Campo id={`${id}-senha`} type="password" rotulo="Sua senha, para confirmar" obrigatorio autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} erro={erroSenha} />
      {erro && <Mensagem tipo="erro" ref={respostaRef}>{erro}</Mensagem>}
      <Botao type="submit" variante="secundario" disabled={enviando}>{enviando ? "Excluindo…" : "Excluir minha conta"}</Botao>
    </form>
  );
}
