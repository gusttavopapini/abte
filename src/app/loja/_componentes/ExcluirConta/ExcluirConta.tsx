"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { excluirContaCliente } from "@/app/loja/acoes-conta";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { Modal } from "@/components/Modal/Modal";
import { mensagemDeErroDoLogin } from "@/lib/auth/erros-do-login";
import { obterAuthCliente } from "@/lib/firebase/cliente";
import estilos from "./ExcluirConta.module.css";

// Exclusão da conta pelo próprio cliente: pede a senha de novo e apaga a conta,
// os dados do cliente e o carrinho. Deu certo, a ação leva para a loja, que
// mostra a confirmação; aqui só aparecem os erros.
export function ExcluirConta({ email }: { email: string }) {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const [erroSenha, setErroSenha] = useState<string>();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const respostaRef = useRef<HTMLDivElement>(null);
  const senhaRef = useRef<HTMLInputElement>(null);

  function fechar() {
    if (enviando) return;
    setAberto(false);
    setSenha("");
    setErroSenha(undefined);
    setErro(null);
  }

  async function excluir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    if (!senha) {
      setErroSenha("Digite sua senha para confirmar.");
      senhaRef.current?.focus();
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
    <div>
      <Botao
        variante="link"
        className={estilos.abrir}
        aria-haspopup="dialog"
        onClick={(evento) => {
          evento.currentTarget.focus();
          setAberto(true);
        }}
      >
        Excluir minha conta
      </Botao>
      <Modal aberto={aberto} aoFechar={fechar} titulo="Excluir minha conta" focoInicial="fechar">
        <form className={estilos.bloco} onSubmit={excluir} noValidate>
          <p>A exclusão é permanente. Ela apaga sua conta da loja, seu nome, seu e-mail e seu carrinho.</p>
          <Campo
            id={`${id}-senha`}
            ref={senhaRef}
            type="password"
            rotulo="Sua senha, para confirmar"
            obrigatorio
            autoComplete="current-password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            erro={erroSenha}
          />
          {erro && <Mensagem tipo="erro" ref={respostaRef}>{erro}</Mensagem>}
          <div className={estilos.acoes}>
            <Botao variante="secundario" onClick={fechar} disabled={enviando}>Cancelar</Botao>
            <Botao type="submit" className={estilos.confirmar} disabled={enviando}>{enviando ? "Excluindo…" : "Confirmar exclusão"}</Botao>
          </div>
        </form>
      </Modal>
    </div>
  );
}
