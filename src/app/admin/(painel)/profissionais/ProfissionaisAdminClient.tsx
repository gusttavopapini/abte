"use client";

import { useState } from "react";
import { TabelaPainel, classeDaCelula, estiloLinha } from "@/app/admin/_componentes/TabelaPainel/TabelaPainel";
import { Modal } from "@/components/Modal/Modal";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { salvarProfissional, atualizarProfissional, excluirProfissional } from "@/app/admin/acoes-conteudo";
import { TAGS_DE_PROFISSIONAIS } from "@/config/profissionais";
import estilos from "./ProfissionaisAdminClient.module.css";
import type { Profissional as ProfissionalDoBanco } from "@/lib/dados/tipos";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";

type Profissional = Omit<ProfissionalDoBanco, "criadoEm" | "atualizadoEm">;

type Props = {
  profissionaisIniciais: Profissional[];
};

export function ProfissionaisAdminClient({ profissionaisIniciais }: Props) {
  const [profissionais, setProfissionais] = useState(profissionaisIniciais);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Profissional | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroAoSalvar, setErroAoSalvar] = useState<string | null>(null);

  const abrirNovo = () => {
    setEditando(null);
    setErroAoSalvar(null);
    setModalAberto(true);
  };

  const abrirEdicao = (profissional: Profissional) => {
    setEditando(profissional);
    setErroAoSalvar(null);
    setModalAberto(true);
  };

  const excluir = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este profissional?")) {
      await excluirProfissional(id);
      setProfissionais((atuais) => atuais.filter((profissional) => profissional.id !== id));
    }
  };

  const salvar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setSalvando(true);
    setErroAoSalvar(null);
    const formData = new FormData(evento.currentTarget);
    // O modal não tem rascunho: todo profissional salvo aqui é publicado.
    formData.append("acao", "publicar");
    
    try {
      if (editando) {
        formData.append("id", editando.id);
        await atualizarProfissional(formData);
      } else {
        await salvarProfissional(formData);
      }
    } catch {
      // O detalhe técnico fica no registro do servidor; aqui só a mensagem em português.
      setErroAoSalvar("Não foi possível salvar o profissional. Confira os dados e tente de novo.");
      setSalvando(false);
      return;
    }
    
    setModalAberto(false);
    setSalvando(false);
    
    // Recarrega a página para mostrar a lista atualizada.
    window.location.reload();
  };

  return (
    <div>
      <CabecalhoDoPainel
        titulo="Profissionais"
        descricao="Gerencie o diretório de profissionais da ABTE."
        acao={<Botao onClick={abrirNovo}>Adicionar Novo</Botao>}
      />
      
      <TabelaPainel colunas={["Nome", "Especialidade", "Tag", "Ações"]} vazia={profissionais.length === 0} mensagemVazia="Nenhum profissional encontrado.">
        {profissionais.map((profissional) => (
          <tr key={profissional.id} style={estiloLinha}>
            <td className={classeDaCelula} style={{ fontWeight: 500 }}>{profissional.nome}</td>
            <td className={classeDaCelula}>{profissional.especialidade}</td>
            <td className={classeDaCelula} style={{ opacity: 0.8 }}>{profissional.tag}</td>
            <td className={`${classeDaCelula} ${estilos.acoes}`}>
              <button type="button" onClick={() => abrirEdicao(profissional)} style={{ fontSize: "14px", textDecoration: "underline", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer" }}>
                Editar
              </button>
              <button type="button" onClick={() => excluir(profissional.id)} style={{ fontSize: "14px", textDecoration: "underline", color: "#e74c3c", background: "none", border: "none", cursor: "pointer" }}>
                Excluir
              </button>
            </td>
          </tr>
        ))}
      </TabelaPainel>

      <Modal 
        aberto={modalAberto} 
        aoFechar={() => setModalAberto(false)} 
        titulo={editando ? "Editar Profissional" : "Novo Profissional"}
      >
        <form onSubmit={salvar} className={estilos.formulario}>
          <Campo id="nome" name="nome" type="text" rotulo="Nome Completo" obrigatorio defaultValue={editando?.nome || ""} placeholder="Ex: Dra. Maria Silva" style={{ border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)" }} />
          
          <Campo id="especialidade" name="especialidade" type="text" rotulo="Especialidade (Exibição)" obrigatorio defaultValue={editando?.especialidade || ""} placeholder="Ex: Ortopedista Pediátrico" style={{ border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)" }} />

          <div className={estilos.grupoDaTag}>
            <label htmlFor="tag" style={{ fontWeight: 500, fontSize: "14px" }}>Tag (Filtro do site) *</label>
            <select id="tag" name="tag" required defaultValue={editando?.tag || TAGS_DE_PROFISSIONAIS[0]} style={{ padding: "12px", border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)", borderRadius: "4px", background: "var(--color-surface)", color: "var(--color-text)", fontSize: "16px" }}>
              {TAGS_DE_PROFISSIONAIS.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          <Campo id="linkedinUrl" name="linkedinUrl" type="url" rotulo="URL do LinkedIn" defaultValue={editando?.linkedinUrl || ""} placeholder="https://linkedin.com/in/..." style={{ border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)" }} />

          <Campo id="imagemUrl" name="imagemUrl" type="url" rotulo="URL da Foto (Opcional)" defaultValue={editando?.imagemUrl || ""} placeholder="https://..." style={{ border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)" }} />

          {erroAoSalvar && <Mensagem tipo="erro">{erroAoSalvar}</Mensagem>}

          <div className={estilos.botoes}>
            <Botao type="button" variante="secundario" onClick={() => setModalAberto(false)}>Cancelar</Botao>
            <Botao type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Botao>
          </div>
        </form>
      </Modal>
    </div>
  );
}
