import { encerrarSessao } from "@/app/admin/acoes";
import { Botao } from "@/components/Botao/Botao";

// "Sair": apaga o cookie e revoga a sessão no servidor.
export function BotaoSair() {
  return (
    <form action={encerrarSessao}>
      <Botao variante="secundario" type="submit">
        Sair
      </Botao>
    </form>
  );
}
