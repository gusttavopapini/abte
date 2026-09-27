// Traduz os erros do Firebase Authentication para mensagens em português.
// Nunca mostra a mensagem técnica em inglês e nunca revela se o e-mail existe.
export function mensagemDeErroDoLogin(erro: unknown): string {
  const codigo = typeof erro === "object" && erro !== null && "code" in erro ? String(erro.code) : "";

  switch (codigo) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
    case "auth/user-disabled":
      return "E-mail ou senha incorretos.";
    case "auth/too-many-requests":
      return "Muitas tentativas seguidas. Por segurança, o acesso foi bloqueado por alguns minutos. Aguarde e tente de novo, ou use \"Esqueci minha senha\".";
    case "auth/network-request-failed":
      return "Sem conexão com a internet. Confira sua conexão e tente de novo.";
    default:
      return "Não foi possível entrar agora. Tente de novo em alguns minutos.";
  }
}
