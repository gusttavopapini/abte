# ABTE: Especificação de design do redesign aprovado

> Arquivo para o agente gerador de prompts do Claude Code.
> Complementa o arquivo `ABTE_contexto_redesign.md` (arquitetura, dados, banco, painel e pagamentos).
> **Atualizado em 26/09/2026** com o design system v3.1 e as decisões de escopo (stack Next.js + Firebase, pagamento desativado, loja como vitrine, doação por Pix).
> Levantamento feito em 26/09/2026 a partir de https://tratandoescoliose.wixsite.com/my-site-4 (rascunho aprovado pela diretoria).
> Onde algo é inferência ou não pôde ser verificado, está marcado com **[INFERÊNCIA]**, **[NÃO VERIFICADO]** ou **[PREENCHER]**.

---

> **ATUALIZAÇÃO (26/09/2026):** a seção 3 (design tokens) deste arquivo foi **substituída** pelo design system v3.1. Ordem de prioridade para o agente: **1) tokens.css / tokens.json, 2) design-system.md, 3) este arquivo, 4) ABTE_contexto_redesign.md**. Onde houver conflito, vale o de maior prioridade. Fonte confirmada: Public Sans. Cor primária: #00449F.
>
> **Escopo vigente:** pagamento online **desativado** (futuro: Stripe). Loja é **vitrine sem compra**, com aviso "Em breve". Doação por **Pix estático** (chave e QR code), a confirmar com a Bianca antes da etapa 2. Componentes de carrinho e checkout não são construídos agora.

## 0. Resumo para o agente (leia primeiro)

1. O design aprovado é um **template do Wix** chamado **"Justir"** (demo pública: https://www.wix.com/demone2/justir). [INFERÊNCIA: os arquivos de imagem se chamam "Medical Company", então provavelmente é o template "Medical Company" do Wix, com nome de marca fictícia "Justir".]
2. No rascunho da ABTE, **só foram adaptados**: o menu, o título e o texto do hero da home, e o blog (posts migrados). **Todo o resto ainda é texto de exemplo do template, em inglês.**
3. Portanto, o que foi aprovado é o **estilo visual e a estrutura de seções**, não o conteúdo. O conteúdo vem do arquivo de contexto (site atual da ABTE).
4. O site será **código próprio** (sem Wix). O agente deve **recriar o visual**, não copiar código do Wix.
5. **Cores, fontes e espaçamentos** estão resolvidos no design system v3.1 (`tokens.css`, `tokens.json`, `design-system.md`). **Não invente valores fora dos tokens.**
6. Nunca usar travessão (o sinal longo de pontuação) em textos gerados. Idioma: português do Brasil.

---

## 1. Origem do design

| Item | Valor |
|---|---|
| Rascunho aprovado | https://tratandoescoliose.wixsite.com/my-site-4 (nome interno no Wix: "ABTE (redesign)") |
| Template base | "Justir" (Wix), demo em https://www.wix.com/demone2/justir |
| Páginas do template | Home, About, Our Technology, For Providers, Accessibility Statement, Privacy Policy, Terms & conditions |
| Páginas existentes no rascunho ABTE | Home, Blog (lista), Post (individual). Itens de menu sem link: Médicos, Ortesistas, Psicólogos, Outros, Fisioterapeutas, Artigos, Loja, Contato |
| Aprovação | Diretoria ABTE (informado pela Bianca) |

> Como as páginas internas da ABTE ainda não foram montadas no rascunho, os **padrões de layout das páginas internas** foram tirados das páginas About, Our Technology e For Providers do template demo. Confirme com o usuário se essas páginas também fazem parte do que foi aprovado.

---

## 2. Linguagem visual observada

O que dá para afirmar a partir da estrutura (sem ver as imagens):

- **Estilo "health tech" editorial:** fotos grandes e sangradas, títulos curtos e fortes, muito respiro, blocos alternando texto e imagem.
- **Rótulos entre colchetes** como motivo tipográfico: `[A]`, `[B]` nos cards de público; `[01]`, `[02]`, `[03]`, `[04]` nos cards numerados. Usar esse recurso de forma consistente.
- **Títulos em duas linhas com quebra intencional**, formato "afirmação + virada" (ex. do template: "Medicine usually waits for the storm. / We track the wind").
- **Números grandes em destaque** (seção de estatísticas com 4 números + legenda curta).
- **Depoimentos em citação** com rótulo de categoria ("Doctor's Voice", "Patient's Voice"), nome e função.
- **Faixa de CTA final** em toda página ("Ready to...") com imagem e um botão.
- **Formulário de contato fixo antes do rodapé** em todas as páginas.
- **Rodapé em colunas:** Menu, Legal, Contato, redes sociais, logo e copyright.
- **Fotografia:** imagens geradas por IA (nomes de arquivo "Gemini 3 (Nano Banana Pro)") e banco de imagens (Shutterstock), temática médica/cuidado/cotidiano. **As fotos do template não podem ser reaproveitadas**: são do template e de terceiros. Usar fotos reais da ABTE ou gerar novas.

---

## 3. Design tokens

**Substituída pelo design system v3.1.** Use somente `tokens.css` / `tokens.json` e `design-system.md`. A tabela antiga com campos [PREENCHER] foi removida.

Nota de hierarquia que continua valendo: no template, o texto de apoio dos cards de público usava H6. No código novo, usar `<p>` com estilo próprio, não H6.

---

## 4. Estrutura global

### 4.1 Header
Observado no rascunho:
- Logo à esquerda (link para a home)
- Menu: Médicos, Ortesistas, Psicólogos, Outros, Fisioterapeutas, Blog, Artigos, Loja, Contato
- Botão de destaque à direita (no template: "Get Justir Sense")
- "Log In" (padrão Wix)

Adaptação para o código novo (validar):
- Ordem do menu no rascunho está **invertida** em relação à arquitetura aprovada (Fisioterapeutas aparece por último). Sugestão: agrupar em **"Encontre um profissional"** com submenu (Fisioterapeutas, Médicos, Ortesistas, Psicólogos, Outros), seguindo a arquitetura do arquivo de contexto
- Botão de destaque: **"Doe para a ABTE"** (é o CTA de destaque do site atual), levando para `/doe`
- "Log In": o login do painel administrativo **não aparece no site público** (acesso por `/admin`). Só manter um "Entrar" se houver área do associado [decisão em aberto]
- **Sem ícone de carrinho** enquanto o pagamento estiver desativado
- Header fixo no topo ao rolar (PROPOSTA do design-system.md) e menu hambúrguer com menu em tela cheia abaixo de 1024px (AJUSTE APROVADO, design-system.md seção 8.1)

### 4.2 Bloco de contato antes do rodapé (todas as páginas)
Template: título "Contact Us", campos First name*, Last name*, Subject, Long answer, botão Submit.
Adaptação: "Fale com a ABTE", campos Nome*, Sobrenome*, E-mail*, Assunto, Mensagem, botão "Enviar", checkbox de consentimento LGPD. Envio real (onde a mensagem fica guardada e qual serviço de e-mail dispara o aviso) é decisão em aberto: ver ABTE_contexto_redesign.md seção 14.

### 4.3 Rodapé
Template: colunas **Menu** (About, Our Technology, For Providers), **Legal** (Accessibility Statement, Privacy Policy, Terms & conditions), **Contact** (Mail, Tel), ícones sociais (Facebook, X, LinkedIn, Instagram), logo, "© 2035 by Justir".

Adaptação:
- **Menu:** Sobre, Encontre um profissional, Blog, Artigos, Loja, Seja associado, Doe
- **Legal:** Declaração de acessibilidade, Política de privacidade, Termos de uso (necessários pela LGPD e pela loja)
- **Contato:** tratandoescoliose@gmail.com (conferir: o site atual tem esse e-mail com erro de digitação na página Contato)
- **Redes:** Instagram @abte.escoliose e Facebook. Remover X e LinkedIn se a ABTE não tiver [validar]
- Copyright: "© [ano atual] ABTE, Associação Brasileira de Tratamento da Escoliose. Todos os direitos reservados." CNPJ se a ABTE quiser exibir [validar]

### 4.4 Remover do rascunho
- Faixa do Wix no topo ("This site was designed with the .com website builder")
- Todo texto de exemplo em inglês
- Contatos fictícios (info@mysite.com, 123-456-7890) e links para as redes do Wix

---

## 5. Biblioteca de seções (componentes)

Cada seção abaixo existe no template. Para cada uma: estrutura, proporção de imagem (tamanho de renderização lido nas URLs do Wix) e sugestão de uso na ABTE.

### S1. Hero
- Imagem grande de fundo ou ao lado (renderizada a 980x541, proporção ~1,8:1)
- H1 + parágrafo + 2 botões (primário e secundário)
- **Conteúdo ABTE (já aprovado no rascunho):**
  - H1: "ABTE. Informação confiável, profissionais certificados e apoio para pacientes e famílias."
  - Texto: "Aqui você encontra conteúdos e profissionais referência nacional no tratamento conservador da escoliose. Base científica, excelência em atendimento e um olhar atento para quem vive essa jornada."
  - Botão 1: "Conheça nossos membros" (no rascunho aponta para a home; no código deve ir para a página de profissionais)
  - Botão 2: ainda com texto do template ("Meet Justir Sense"). Sugestão: "Encontre um profissional" ou "Seja associado" [validar]

### S2. Faixa de logos ("Trusted by")
- Título H2 + 6 logos (renderizados a 596x501)
- Sugestão ABTE: só usar com **logos reais e autorizados** (parceiros como Projeto Mude a Curva, se a ABTE aprovar). **Não inventar parcerias nem usar logos de sociedades científicas sem autorização.** Se não houver logos, remover a seção [validar]

### S3. Afirmação + cards de público
- H2 em duas linhas + parágrafo
- 2 cards lado a lado, cada um com: rótulo `[A]` / `[B]`, frase curta em primeira pessoa ("I want peace of mind."), H3, texto, botão
- **Sugestão ABTE:**
  - H2: frase curta baseada na missão [copy a definir com a ABTE]
  - `[A]` "Quero cuidar da minha coluna ou da do meu filho." / H3 "Para pacientes e famílias" / botão "Encontre um profissional"
  - `[B]` "Quero me especializar e fazer parte da rede." / H3 "Para profissionais de saúde" / botão "Seja associado"
  - (textos sugeridos, validar com a ABTE)

### S4. Números ("By The Numbers")
- H2 + imagem vertical (980x1217, ~4:5) + 4 números grandes com legenda
- **Somente números reais**, confirmados pela ABTE. Candidatos a partir do site atual (todos a confirmar):
  - "+45" pacientes atendidos nos mutirões
  - "+500" ou "quase 500" atendimentos (o site atual se contradiz)
  - Nº de fisioterapeutas e médicos membros (contagem atual aproximada: 69 e 23)
  - Ano de início: 2018 (Tratando Escoliose) ou fundação da ABTE: 2021
  - Nº de estados/países com profissionais

### S5. Depoimentos
- H2 + colagem de imagens (980x732, 980x980, 980x541, 980x551) + 2 citações com rótulo ("Doctor's Voice" / "Patient's Voice"), nome, função
- Adaptação: rótulos "Voz do profissional" e "Voz da família" [validar]
- **Não existem depoimentos no site atual.** Precisam ser coletados com autorização (paciente, responsável legal se menor de idade). **Não inventar depoimentos.** Se não houver, trocar por outra seção

### S6. Quem somos ("Who We Are")
- H2 + 2 parágrafos + botão + imagem (980x837)
- Sugestão ABTE: resumo da história (2018 a 2025) + botão "Conheça nossa história"

### S7. CTA final ("Ready to...")
- H2 + frase + botão (+ imagem em algumas páginas, 980x541)
- Sugestões ABTE: "Faça parte dessa rede" (Seja associado) ou "Ajude a transformar vidas" (Doe) [validar]

### S8. Cabeçalho de página interna
- H1 curto + subtítulo de uma linha (ex. template: "For Healthier Lives / By scientists, built for real people")

### S9. Blocos de texto institucional
- H2 + 1 a 2 parágrafos, sem imagem ("Why we started", "Our Mission")
- Uso: Sobre (história, missão)

### S10. Cards numerados `[01]` a `[04]`
- H2 + texto de apoio + 4 cards com rótulo numerado, H3 e linha curta
- Uso sugerido: valores da ABTE (a definir com a ABTE), métodos de tratamento (Schroth ISST, BSPTS Conceito Rigo, SEAS, SSOL/Lyon) ou ações sociais (triagem, mutirões, evento Pais e Filhos, cartilhas)

### S11. Linha do tempo
- H2 + anos com uma linha de texto cada
- Uso: história da ABTE (2018, 2020, 2021, 2022, 2023, 2024, 2025, textos no arquivo de contexto seção 5.8)

### S12. Equipe / liderança
- H2 + cards com foto quase quadrada (~980x964), H3 nome, cargo, minibio
- Uso: **Diretoria 2025-2027** (6 pessoas, dados no arquivo de contexto). Pode ser base do card de profissional também

### S13. Texto + imagem alternados
- H2 em duas linhas + parágrafo + imagem (980x541); blocos "Parameter 01/02" com H3 e texto; "Our Edge / Our Promise"
- Uso possível: página sobre tratamento conservador ou sobre os mutirões

### S14. Benefícios com rótulo `[A]` a `[D]` + número de destaque (página For Providers)
- Blocos de benefício com letra, um número grande com legenda ("35% / Patient retention...") e faixa de logos
- Uso sugerido: página **"Seja associado"** (benefícios de fazer parte da ABTE: encontros clínicos mensais, visibilidade no diretório, eventos). Benefícios reais a confirmar com a ABTE

---

## 6. Mapa: páginas da ABTE x seções do design

| Página ABTE | Seções sugeridas (na ordem) |
|---|---|
| **Início** | S1 Hero, S3 Público, S4 Números, S6 Quem somos, Blog (3 posts, componente B1), Loja (vitrine, componente L1), Mapa/Encontre um profissional (componente P3), S5 Depoimentos (se houver), S7 CTA, Contato, Rodapé |
| **Sobre** | S8, S9 história e missão, S11 linha do tempo, S10 ações sociais, S12 diretoria, S7 CTA |
| **Encontre um profissional** (hub) | S8, cards das 5 categorias separados em "Membros ABTE" e "Parceiros", P3 busca/mapa |
| **Fisioterapeutas / Médicos / Parceiros** | S8, P1 filtros, P2 grade de cards |
| **Blog** | S8, B1 lista |
| **Post** | B2 |
| **Artigos** | S8, A1 lista |
| **Loja** | S8, aviso "Em breve" sobre a compra online, L1 grade, filtros por categoria |
| **Produto** | L2 (sem compra) |
| **Carrinho / Checkout** | DESATIVADO (pagamento desativado; futuro: Stripe) |
| **Seja associado** | S8, S14 benefícios, formulário |
| **Doe** | S8, D1 doação por Pix, S7 |
| **Contato** | S8, bloco de contato |
| **Legais** (privacidade, termos, acessibilidade) | S8, texto longo |

---

## 7. Componentes que o template NÃO tem (criar no mesmo estilo)

O template não tem diretório, loja nem doação. Criar estes componentes seguindo os tokens e o estilo das seções 2 e 5:

- **P1 Filtros do diretório:** estado, cidade, método, telerreabilitação, busca por nome
- **P2 Card de profissional:** foto, tratamento + nome, registro (Crefito/CRM/CRP), métodos em etiquetas, cidade/UF, ícones de WhatsApp, Instagram, e-mail. Base visual: S12
- **P3 Mapa / seletor de estado:** clicar no estado filtra a lista (substitui o mapa estático do site atual). Incluir Paraguai e Bolívia
- **B1 Card de post:** capa, título, resumo, autor, data, tempo de leitura
- **B2 Post:** H1, autor com foto, data, tempo de leitura, corpo com H2/H3 reais, bloco "Conteúdo autoral de [profissional]" com foto, referências, posts recentes (3), comentários [decisão em aberto]
- **A1 Card de artigo:** título em texto, descrição, botões "Ler resumo (CAT)" e "Ler artigo completo" (PDFs)
- **L1 Card de produto:** imagem, nome, preço normal riscado + promocional, selo ("Monte seu kit", "Esgotado", "Digital")
- **L2 Página de produto:** galeria, H1, preço, descrição, compartilhar. No lugar de quantidade e "Adicionar ao carrinho", aviso "Em breve" informando que a compra online ainda não está disponível
- **L3 Carrinho e checkout:** DESATIVADO. Quando o pagamento for ativado (Stripe): resumo, cupom, frete (produtos físicos), pagamento
- **D1 Doação por Pix** [CONFIRMAR COM A BIANCA antes da etapa 2]: valores sugeridos (R$25, R$50, R$100) + valor livre, QR code Pix gerado para o valor escolhido, botão "Copiar código Pix", nome do titular e, se a ABTE quiser, CNPJ. Sem campo "Doação em nome de" e sem dados do doador (nada é registrado)
- **Estados de interface:** vazio, carregando, erro, sucesso (formulários, filtros sem resultado, código Pix copiado)

---

## 8. Blog no rascunho (template de lista e post)

- Lista em coluna única com: título (link), resumo, autor ("Tratando Escoliose"), data, tempo de leitura
- 20 posts visíveis, todos com data "Sep 17" e "0 min read": são **datas e tempos da migração**, não os originais. No código novo, usar a **data original** de cada post (site atual) e calcular o tempo de leitura
- Textos do sistema em inglês ("All Posts", "Writer", "Recent Posts", "See All", "Comments", "Write a comment") precisam ir para português
- Post com crédito de autoria no fim (ex: "Conteúdo Autoral desenvolvido pelo Dr. Denis Sakai" com foto): transformar em **autor real** do post (vinculado ao cadastro de profissionais)
- Um post migrado tem erro de digitação no texto original ("Tmabém"). Revisar ortografia na migração com aprovação da ABTE

---

## 9. Imagens

| Uso | Proporção de referência |
|---|---|
| Hero | ~1,8:1 (980x541) |
| Imagem vertical da seção de números | ~4:5 (980x1217) |
| Colagem de depoimentos | 4:3, 1:1, ~1,8:1 |
| Quem somos | ~1,17:1 (980x837) |
| Foto de equipe/diretoria | ~1:1 |
| Logos de parceiros | ~1,2:1 (596x501) |
| Card de profissional (site atual) | 1:1 |
| Produto (site atual) | 3:4 (1200x1600) |

- Todas as imagens com **alt text descritivo** em português
- Formatos otimizados (WebP/AVIF) e carregamento sob demanda
- Fotos de pacientes menores de idade: só com autorização dos responsáveis [validar com a ABTE]

---

## 10. Responsividade e acessibilidade

- Responsivo: mesmo design do desktop, readaptado (ver 10.1)
- Contraste mínimo WCAG AA em textos e botões
- Foco visível em links, botões e campos
- Navegação por teclado no menu, filtros e painel
- Um H1 por página, hierarquia sem saltos
- A página "Declaração de acessibilidade" existe no template: manter

---

## 10.1 Regra de responsividade (DECISÃO DA DESIGNER)

**O mobile e o tablet são o MESMO design do desktop, apenas readaptado em tamanho.** Não existe layout mobile diferente, não se cria componente novo para o celular e não se muda a ordem, as cores ou o estilo das seções.

### O que muda com a tela
- **Tamanhos:** tipografia, margens e espaço entre seções encolhem pelos `clamp()` do tokens.css (máximo = desktop medido, mínimo = celular)
- **Colunas:** grades com várias colunas passam a empilhar ou reduzir colunas (tabela abaixo)
- **Controles:** botões e campos com altura mínima de 44 px no celular (`--control-min-height-mobile`)

### O que NÃO muda
- Ordem das seções e dos elementos dentro de cada seção
- Cores, raio 0, ausência de sombra, rótulos entre colchetes
- Conteúdo (nada é escondido no celular)

### Breakpoints (AJUSTE APROVADO PELA DESIGNER, design-system.md v3.1)
| Faixa | Largura |
|---|---|
| Celular | até 767 px |
| Tablet | 768 px a 1023 px |
| Desktop | a partir de 1024 px (referência de medição: 1710 px) |

### Adaptação de cada padrão
Ver **design-system.md, seção 9** (tabela de colunas por faixa) e **seção 8.1** (header e menu em tela cheia). Aquela tabela é a versão oficial e substitui a que existia aqui.

### Única exceção necessária
Abaixo de 1024 px o menu vira **hambúrguer** com menu em tela cheia (detalhes em design-system.md, seção 8.1).

### Checagem obrigatória no desenvolvimento
Testar em **390 px, 768 px, 1280 px e 1710 px**. Nenhuma rolagem horizontal, nenhum texto cortado, nenhum botão com rótulo quebrando em 3 linhas.

---

## 11. Pendências para completar este arquivo

1. ~~Cores, fontes, espaçamentos e raios~~ (resolvido: design system v3.1)
2. **Logo da ABTE** em vetor (SVG) ou PNG de alta resolução
3. ~~Confirmar se as páginas About, Our Technology e For Providers entram no design aprovado~~ (resolvido: páginas internas aprovadas, ver design-system.md, registro v1 para v2)
4. Texto do **segundo botão do hero** e títulos das seções S3, S4, S7
5. **Números oficiais** para a seção de estatísticas
6. **Depoimentos reais** autorizados (ou remover a seção)
7. **Logos de parceiros** autorizados (ou remover a seção)
8. **Fotos**: banco de imagens próprio da ABTE ou autorização para gerar novas
9. ~~Prints do layout mobile~~ (resolvido: ver 10.1, mobile é o desktop readaptado)
10. **Dados do Pix da ABTE** (chave, titular, cidade, exibição do CNPJ) e confirmação de que a doação por Pix entra enquanto a Stripe não é ativada
11. Prints da lista e do post do blog (design-system.md seção 8.11 segue NÃO VERIFICADO)

---

*Fim do documento.*
