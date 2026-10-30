"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { BuscaNaTabela } from "@/app/admin/_componentes/BuscaNaTabela/BuscaNaTabela";
import { SeloStatus } from "@/app/admin/_componentes/SeloStatus/SeloStatus";
import { CelulaDoPainel, LinhaDoPainel, TabelaPainel } from "@/app/admin/_componentes/TabelaPainel/TabelaPainel";
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
        trilha={[{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Profissionais" }]}
        titulo="Profissionais"
        descricao="Diretório de profissionais da ABTE. Só os marcados como visíveis aparecem em /profissionais. Excluídos ficam no fim da página e podem ser restaurados."
        acao={<Botao onClick={() => { setAviso(null); setJanela({ tipo: "formulario", profissional: null }); }}>Adicionar profissional</Botao>}
      />

      <div aria-live="polite">{aviso && <Mensagem tipo="sucesso">{aviso}</Mensagem>}</div>

      {ativos.length > 0 && (
        <BuscaNaTabela
          tabela="tabela-profissionais"
          rotuloDaBusca="Buscar pelo nome, tipo ou local"
          situacoes={[{ valor: "ativo", rotulo: "Visíveis no site" }, { valor: "oculto", rotulo: "Ocultos" }]}
          total={ativos.length}
          nomeNoSingular="profissional"
          nomeNoPlural="profissionais"
        />
      )}
      <TabelaPainel
        id="tabela-profissionais"
        legenda="Pelo campo Ordem e, no empate, pelo nome."
        colunas={["Nome", "Tipo", "Local", "No site", "Ações"]}
        vazia={ativos.length === 0}
        estadoVazio={
          <>
            <p className="tipo-texto">Nenhum profissional cadastrado. Os visíveis aparecem em /profissionais.</p>
            <Botao variante="secundario" onClick={() => { setAviso(null); setJanela({ tipo: "formulario", profissional: null }); }}>Adicionar o primeiro profissional</Botao>
          </>
        }
      >
        {ativos.map((profissional) => (
          <LinhaDoPainel key={profissional.id} busca={`${profissional.nome} ${profissional.tipo} ${local(profissional)}`} situacao={profissional.ativo ? "ativo" : "oculto"}>
            <CelulaDoPainel rotulo="Nome" destaque>{[profissional.tratamento, profissional.nome].filter(Boolean).join(" ")}</CelulaDoPainel>
            <CelulaDoPainel rotulo="Tipo">{profissional.tipo}</CelulaDoPainel>
            <CelulaDoPainel rotulo="Local">{local(profissional) || "Sem local"}</CelulaDoPainel>
            <CelulaDoPainel rotulo="No site"><SeloStatus status={profissional.ativo ? "ativo" : "oculto"} /></CelulaDoPainel>
            <CelulaDoPainel rotulo="Ações" acoes>
              <button type="button" className={`realce ${estilos.acao}`} onClick={() => { setAviso(null); setJanela({ tipo: "formulario", profissional }); }} aria-label={`Editar ${profissional.nome}`}>
                Editar
              </button>
              <button type="button" className={`realce ${estilos.acao}`} onClick={() => { setAviso(null); setJanela({ tipo: "excluir", profissional }); }} aria-label={`Excluir ${profissional.nome}`}>
                Excluir
              </button>
            </CelulaDoPainel>
          </LinhaDoPainel>
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

      <Modal aberto={janela?.tipo === "excluir"} aoFechar={fechar} titulo={janela?.tipo === "excluir" ? `Excluir "${janela.profissional.nome}"` : "Excluir profissional"}>
        {janela?.tipo === "excluir" && <ConfirmarExclusao profissional={janela.profissional} aoTerminar={concluir} aoCancelar={fechar} />}
      </Modal>
    </div>
  );
}
