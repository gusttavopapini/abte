"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { TabelaPainel, classeDaCelula, estiloLinha } from "@/app/admin/_componentes/TabelaPainel/TabelaPainel";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { FormularioProfissional, type ProfissionalNaTela } from "@/app/admin/_componentes/FormularioProfissional/FormularioProfissional";
import { excluirProfissional, restaurarProfissional } from "@/app/admin/acoes-profissionais";
import { Botao } from "@/components/Botao/Botao";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { Modal } from "@/components/Modal/Modal";
import estilos from "./ProfissionaisAdminClient.module.css";

type Props = {
  ativos: ProfissionalNaTela[];
  excluidos: ProfissionalNaTela[];
};

type Janela = { tipo: "formulario"; profissional: ProfissionalNaTela | null } | { tipo: "excluir"; profissional: ProfissionalNaTela } | null;

function local(profissional: ProfissionalNaTela): string {
  const lugar = [profissional.cidades.join(", "), profissional.uf || profissional.pais].filter(Boolean).join(" / ");
  return profissional.telerreabilitacao ? `${lugar ? `${lugar}, ` : ""}telerreabilitação` : lugar;
}

// Confirmação de exclusão: o profissional vai para os excluídos (some do site
// e pode ser restaurado). Erro aparece dentro da janela, em português.
function ConfirmarExclusao({ profissional, aoTerminar, aoCancelar }: { profissional: ProfissionalNaTela; aoTerminar: (mensagem: string) => void; aoCancelar: () => void }) {
  const [resposta, excluir, excluindo] = useActionState(excluirProfissional, null);
  useEffect(() => {
    if (resposta?.ok) aoTerminar(resposta.mensagem);
  }, [resposta, aoTerminar]);
  return (
    <form action={excluir} className={estilos.formulario}>
      <input type="hidden" name="id" value={profissional.id} />
      <p className="tipo-texto">
        &ldquo;{profissional.nome}&rdquo; sai do site e vai para os excluídos. Dá para restaurar depois.
      </p>
      {resposta?.ok === false && <Mensagem tipo="erro">{resposta.mensagem}</Mensagem>}
      <div className={estilos.botoes}>
        <Botao type="button" variante="secundario" onClick={aoCancelar}>Cancelar</Botao>
        <Botao type="submit" disabled={excluindo}>{excluindo ? "Excluindo..." : "Excluir"}</Botao>
      </div>
    </form>
  );
}

export function ProfissionaisAdminClient({ ativos, excluidos }: Props) {
  const [janela, setJanela] = useState<Janela>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [respostaRestaurar, restaurar, restaurando] = useActionState(restaurarProfissional, null);

  const fechar = useCallback(() => setJanela(null), []);
  const concluir = useCallback((mensagem: string) => {
    setJanela(null);
    setAviso(mensagem);
  }, []);

  return (
    <div className={estilos.pagina}>
      <CabecalhoDoPainel
        titulo="Profissionais"
        descricao="Gerencie o diretório de profissionais da ABTE."
        acao={<Botao onClick={() => { setAviso(null); setJanela({ tipo: "formulario", profissional: null }); }}>Adicionar Novo</Botao>}
      />

      {aviso && <Mensagem tipo="sucesso">{aviso}</Mensagem>}

      <TabelaPainel colunas={["Nome", "Tipo", "Local", "No site", "Ações"]} vazia={ativos.length === 0} mensagemVazia="Nenhum profissional cadastrado.">
        {ativos.map((profissional) => (
          <tr key={profissional.id} style={estiloLinha}>
            <td className={classeDaCelula}>{[profissional.tratamento, profissional.nome].filter(Boolean).join(" ")}</td>
            <td className={classeDaCelula}>{profissional.tipo}</td>
            <td className={classeDaCelula}>{local(profissional)}</td>
            <td className={classeDaCelula}>{profissional.ativo ? "Sim" : "Não (oculto)"}</td>
            <td className={`${classeDaCelula} ${estilos.acoes}`}>
              <button type="button" className={`realce ${estilos.acao}`} onClick={() => { setAviso(null); setJanela({ tipo: "formulario", profissional }); }} aria-label={`Editar ${profissional.nome}`}>
                Editar
              </button>
              <button type="button" className={`realce ${estilos.acao}`} onClick={() => { setAviso(null); setJanela({ tipo: "excluir", profissional }); }} aria-label={`Excluir ${profissional.nome}`}>
                Excluir
              </button>
            </td>
          </tr>
        ))}
      </TabelaPainel>

      <section className={estilos.excluidos} aria-labelledby="titulo-excluidos">
        <h2 id="titulo-excluidos" className="tipo-texto-lg">Excluídos</h2>
        {respostaRestaurar && <Mensagem tipo={respostaRestaurar.ok ? "sucesso" : "erro"}>{respostaRestaurar.mensagem}</Mensagem>}
        {excluidos.length === 0 ? (
          <p className="tipo-texto">Nenhum profissional excluído.</p>
        ) : (
          <ul role="list" className={estilos.lista}>
            {excluidos.map((profissional) => (
              <li key={profissional.id}>
                <form action={restaurar} className={estilos.linhaExcluido}>
                  <input type="hidden" name="id" value={profissional.id} />
                  <span>{profissional.nome}</span>
                  <Botao type="submit" variante="secundario" disabled={restaurando} aria-label={`Restaurar ${profissional.nome}`}>Restaurar</Botao>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        aberto={janela?.tipo === "formulario"}
        aoFechar={fechar}
        titulo={janela?.tipo === "formulario" && janela.profissional ? "Editar Profissional" : "Novo Profissional"}
      >
        {janela?.tipo === "formulario" && (
          <FormularioProfissional key={janela.profissional?.id ?? "novo"} profissional={janela.profissional} aoSalvar={concluir} aoCancelar={fechar} />
        )}
      </Modal>

      <Modal aberto={janela?.tipo === "excluir"} aoFechar={fechar} titulo="Excluir profissional">
        {janela?.tipo === "excluir" && <ConfirmarExclusao profissional={janela.profissional} aoTerminar={concluir} aoCancelar={fechar} />}
      </Modal>
    </div>
  );
}
