# ABTE: Contexto completo do site atual para redesign

> Documento de contexto para agente (Claude Code / Projeto Claude).
> Levantamento feito em 26/09/2026 a partir do site publicado https://www.abteescoliose.com.br
> **Atualizado em 26/09/2026 com as decisões de stack, contas e pagamento** (seções 11 a 14 reescritas).
> Tudo aqui foi extraído do HTML renderizado das páginas públicas. Onde algo é inferência ou não pôde ser verificado, está sinalizado com **[INFERÊNCIA]** ou **[NÃO VERIFICADO]**.

---

## Resumo das decisões vigentes (leia antes de tudo)

| Tema | Decisão |
|---|---|
| Plataforma | Sai 100% do Wix. Código próprio |
| Stack | **Next.js (App Router, TypeScript) + Firebase**: Cloud Firestore (banco), Firebase Authentication (login), Cloud Storage for Firebase (imagens e PDFs) |
| CMS | Nenhum. O painel administrativo é construído sob medida |
| Contas definitivas | **Em nome da ABTE** (Firebase de produção, hospedagem, domínio, pagamento futuro) |
| Desenvolvimento | Projeto Firebase `abte-dev` na conta Google da Bianca. Repositório privado no GitHub da Bianca (transferível para a ABTE depois) |
| Pagamento online | **DESATIVADO.** Nada de pagamento é criado agora. Quando for ativado, o gateway será a **Stripe** |
| Loja | **Vitrine sem compra**, com aviso "Em breve" |
| Doação | **Pix estático** (chave e QR code da ABTE, sem gateway) enquanto a Stripe não é ativada. **[CONFIRMAR COM A BIANCA antes da etapa 2]** |
| Design | design-system.md e tokens v3.1 |

Ordem de prioridade em caso de conflito: 1) tokens.css / tokens.json, 2) design-system.md, 3) ABTE_design_redesign.md, 4) este arquivo. As decisões da tabela acima valem sobre qualquer trecho antigo que diga o contrário.

---

## 0. Como usar este documento (instruções para o agente)

- As seções 1 a 10 são o **retrato do site atual**. Não são o briefing de design. Use para entender conteúdo, arquitetura da informação, dados e problemas a corrigir.
- As seções 11 a 14 são o **plano do sistema novo**: decisões tomadas, requisitos, modelo de dados, stack e decisões em aberto.
- **Não invente dados** de profissionais, preços, registros (Crefito/CRM) ou datas. Se precisar de um dado que não está aqui, peça ao usuário ou busque direto na página original.
- Contatos individuais dos profissionais (WhatsApp, Instagram, Facebook, e-mail) **não foram copiados** para este arquivo por volume. Eles estão nas páginas `/fisioterapeutas`, `/medicos`, `/ortesistas`, `/psicologos`, `/outros`. Se for montar a base de dados, faça a extração dessas páginas e valide com o usuário (há erros de links, ver seção 9).
- O usuário prefere textos **sem travessão (o sinal longo de pontuação)**. Não use travessão em copy gerada.
- Idioma do site: **português do Brasil**.

---

## 1. Sobre a organização

| Campo | Valor |
|---|---|
| Nome | ABTE, Associação Brasileira de Tratamento da Escoliose |
| Marca anterior / legado | Tratando Escoliose (projeto que originou a associação) |
| Domínio atual | abteescoliose.com.br |
| Domínio antigo ainda em uso em links | tratandoescoliose.com.br (o menu LOJA ainda aponta para ele) |
| Instagram | @abte.escoliose (antigo @tratando.escoliose) |
| Facebook | facebook.com/tratando.escoliose (ainda com nome antigo) |
| E-mail | tratandoescoliose@gmail.com |
| Fundação da associação | Agosto de 2021 (projeto Tratando Escoliose existe desde 2018) |
| Foco | Tratamento conservador da escoliose, baseado em evidência. Métodos Schroth ISST, BSPTS Conceito Rigo, SEAS, SSOL, Lyon |
| Público | Pacientes (muitos adolescentes), pais e famílias, profissionais de saúde |
| Atuação | Brasil, Paraguai e Bolívia |
| Contato do projeto de redesign | Patrícia Baracat (presidente da diretoria 2025-2027) |

### Missão (texto do site)
"Nossa missão é compartilhar informações, promover ações sociais e desenvolver materiais com embasamento técnico-científico a respeito da escoliose de forma gratuita, universalmente acessível e útil para todos. Além de promover a união de profissionais especializados no tratamento da escoliose."

### Tagline principal da home
"Informação confiável, profissionais certificados e apoio para pacientes e famílias."

Texto de apoio: "Aqui você encontra conteúdos e profissionais referência nacional no tratamento conservador da escoliose. Base científica, excelência em atendimento e um olhar atento para quem vive essa jornada."

---

## 2. Stack técnica atual (Wix, será substituída: ver seções 11 a 13)

| Item | Situação |
|---|---|
| Plataforma | **Wix** (meta generator: "Wix.com Website Builder") |
| Imagens | CDN Wix: `static.wixstatic.com/media/...` (formatos AVIF/WebP servidos via parâmetros de URL) |
| Blog | **Wix Blog** (URLs `/post/slug`, páginas de autor `/profile/.../profile`, comentários, botão "Inscrever-se") |
| Loja | **Wix Stores** (URLs `/product-page/slug` e `/category/slug`, carrinho, filtro por preço, preço normal x promocional, status "Esgotado") |
| Membros | **Wix Members** [INFERÊNCIA pelas páginas `/profile/`] |
| Formulários | Wix Forms na página Contato e Doação. Formulário de associação é **externo** (Google Forms) |
| Doação | Formulário com valores pré-definidos (R$25, R$50, R$100) e campo "Doação em nome de". Gateway de pagamento **[NÃO VERIFICADO]** |
| Arquivos (PDF) | Hospedados no Wix: `/_files/ugd/7dce06_....pdf` |
| SEO | Google Search Console verificado (meta google-site-verification). OG/Twitter cards configurados por página. Canonical definido |
| Menu | Menu horizontal com item "More" gerado automaticamente pelo Wix (itens que não cabem ficam escondidos) |

### Dados de volume já conhecidos (informados pelo usuário em levantamento anterior)
- Blog: **66 posts**
- Loja: **9 produtos**
- Membros cadastrados na área de membros Wix: **33**
- Lista de assinantes de e-mail: **mais de 2 mil contatos**
- Também existem: cupons de desconto da loja e respostas do formulário de doação

> Esses números vieram da migração feita no Wix. Confirme antes de usar em qualquer entrega.

---

## 3. Mapa do site (sitemap levantado)

```
/ (Home)
├── /especialidades ................ "PROFISSIONAIS" (hub)
│   ├── /fisioterapeutas ........... Membros ABTE
│   ├── /medicos ................... Membros ABTE
│   ├── /ortesistas ................ Parceiros (title da página: "Coletes")
│   ├── /psicologos ................ Parceiros
│   └── /outros .................... Parceiros (title da página: "Parceiros")
├── /blogtratandoescoliose ......... Blog (lista)
│   └── /post/{slug} ............... Post individual
├── /artigos ....................... Artigos científicos (PDFs)
├── /category/loja ................. Loja (menu aponta para tratandoescoliose.com.br/category/loja)
│   ├── /category/abte ............. "Produtos ABTE" [NÃO VERIFICADO]
│   ├── /category/produtos-parceiros "Produtos parceiros" [NÃO VERIFICADO]
│   └── /product-page/{slug} ....... Produto individual
├── /contato ....................... Contato
├── /doação ........................ Doação (URL com acento: /doa%C3%A7%C3%A3o)
├── /nossa-historia ................ História + Diretoria (NÃO está no menu visível, só linkada na home)
└── /profile/{id}/profile .......... Perfis de autores do blog (Wix Members)
```

**Página quebrada:** `/category/all-products` retorna **404**, e é o destino do botão "Compre agora" da home.

**Itens escondidos no "More":** não foi possível ver quais itens o Wix agrupou no "More" no desktop. **[NÃO VERIFICADO]**

---

## 4. Elementos globais (presentes em todas as páginas)

### 4.1 Top bar
- Texto-link: "Encontre o profissional mais próximo a você!" + link "AQUI" → `/especialidades`
- Ícone Instagram → `http://www.instagram.com.br/abte.escoliose`
- Ícone Facebook → `http://www.facebook.com.br/tratando.escoliose`
- E-mail: tratandoescoliose@gmail.com

> Atenção: os links sociais usam domínios `.com.br` e `http://` (não https). Devem ser trocados por `https://www.instagram.com/abte.escoliose` e `https://www.facebook.com/tratando.escoliose`.

### 4.2 Header
- Logo "Tratando Escoliose da ABTE" (PNG recortado) → home
- Ícone de casa → home
- Menu principal:
  - PROFISSIONAIS → `/especialidades`
    - FISIOTERAPEUTAS → `/fisioterapeutas`
    - MÉDICOS → `/medicos`
    - ORTESISTAS → `/ortesistas`
    - PSICÓLOGOS → `/psicologos`
    - OUTROS → `/outros`
  - BLOG → `/blogtratandoescoliose`
  - ARTIGOS → `/artigos`
  - LOJA → `https://www.tratandoescoliose.com.br/category/loja` (domínio antigo)
  - CONTATO → `/contato`
  - More (automático do Wix)
- Botão de destaque: **"Doe para ABTE"** → `/doação`

### 4.3 Footer
- Apenas uma linha, em **H6**: "Associação Brasileira de Tratamento da Escoliose - Todos os direitos reservados."
- Não tem: links de navegação, redes, contato, CNPJ, endereço, política de privacidade, newsletter.

---

## 5. Página a página

Formato: meta title, meta description, hierarquia de headings (como estão no HTML), seções do body na ordem, CTAs.

### 5.1 Home `/`
- **Title:** Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose
- **Meta description:** "No site da Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose você encontra informação confiável, profissionais certificados e apoio para pacientes e famílias. Reunimos conteúdos e profissionais referência nacional no tratamento conservador da escoliose..."
- **OG image:** 1080x700
- **H1:** **nenhum** (problema de SEO)

**Seções na ordem:**
1. **Banner duplo** (imagens "ABTE 34" e "ABTE 35"), ambos linkando para um **grupo de WhatsApp** (`chat.whatsapp.com/...`). [INFERÊNCIA: grupo de pais citado na história]
2. **Bloco de apresentação:** tagline + texto de apoio. CTAs:
   - "Quero ser associado (a)" → Google Forms externo
   - "Conheça nossos membros" → `/especialidades`
   - Imagem institucional (logo/selo ABTE) + imagem gerada por IA
3. **Missão:** parágrafo da missão
4. **Dois cards-link** (imagens geradas por IA): "Conheça nossa história" e "Diretoria ABTE", ambos → `/nossa-historia`
5. **H2 "BLOG ABTE"**
   - Subtítulo: "Conteúdo confiável para quem vive a escoliose"
   - Link: "Acesse todos os conteúdos aqui"
   - Texto: "A cada quinzena, nossos profissionais trazem informações baseadas em evidências, dicas de cuidado, novidades sobre pesquisas e histórias reais que inspiram..."
   - Grid com os **3 posts mais recentes**
6. **H2 "COMPRE AQUI SEU PRODUTO ABTE!"**
   - Subtítulo: "Cada Produto, Uma Ação pela Escoliose!"
   - Slider com os 9 produtos
   - Botão "Compre agora" → **404**
7. **Números:** "+45 pacientes atendidos" e "+500 atendimentos Fisioterapêuticos realizados"
8. **H2 "Mutirões que Transformam Vidas"**
   - Texto: atendimento fisioterapêutico voluntário dos membros em parceria com o **Projeto Mude a Curva**, pré e pós-operatório
9. **H4 "O cuidado que você merece, com os melhores profissionais."** + "Encontre o mais próximo de você!"
   - **Mapa do Brasil** (imagem estática) com botões por estado, todos linkando para `/fisioterapeutas` sem âncora: Amazonas, Ceará, Piauí, Pernambuco, Alagoas, Sergipe, Mato Grosso, Mato Grosso do Sul, Minas Gerais, Rio de Janeiro, São Paulo, Paraná, Santa Catarina, Goiás, Rio Grande do Norte, Paraíba
   - Mapa do Paraguai (imagem) + "Asunción"
   - Faltam no mapa: **Rio Grande do Sul** e **Bolívia** (existem profissionais lá)
10. Footer

### 5.2 Profissionais (hub) `/especialidades`
- **Title:** Especialidades | Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose
- **Meta description:** "Conheça profissionais multidisciplinares e especializados no tratamento **conversador** da ESCOLIOSE..." (erro: "conversador" em vez de "conservador")
- **Headings:**
  - H2 "Profissionais Referência no Tratamento da Escoliose"
  - H2 "Membros ABTE"
    - H5 "Fisioterapeutas" → "> Encontre o profissional mais próximo!"
    - H5 "Médicos" → "> Encontre o profissional mais próximo!"
  - H2 "Parceiros"
    - H5 "Ortesistas" → "> Saiba mais"
    - H5 "Psicólogos" → "> Saiba mais"
    - H5 "Outros" → "> Saiba mais"

> **Arquitetura importante:** o site separa **Membros ABTE** (fisioterapeutas e médicos) de **Parceiros** (ortesistas, psicólogos, outros). Manter essa distinção no redesign.

### 5.3 Fisioterapeutas `/fisioterapeutas`
- **Title:** Fisioterapeutas | Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose
- **Meta description:** "Conheça os Fisioterapeutas membros da Associação Brasileira de Tratamento da Escoliose."
- **Intro:** H2 "Fisioterapia Específica para Escoliose" + "Conheça todos os profissionais habilitados a atenderem pelos Métodos SEAS, Schroth e BSPTS cadastrados em nossa Associação"
- **Estrutura:** agrupado por estado. Cada estado tem título (H1 em SP, H2 nos demais) + linha com cidades. Cada profissional é um card com: foto quadrada 220x220, registro Crefito, **nome em H1**, métodos, ícone WhatsApp, ícones Facebook/Instagram, ícone de e-mail (mailto com assunto "Quero Informações Sobre Atendimento - Site" ou "Eu desejo informações sobre atendimento"), texto "Profissional responsável pelo atendimento na região de...".
- **Não tem:** busca, filtro por método, filtro por cidade, âncoras por estado, mapa interativo.
- Contagem manual: **69 profissionais** (feita por leitura da página; pode haver diferença de 1 ou 2 por cards duplicados/órfãos, confira).

Inventário completo na seção 7.1.

### 5.4 Médicos `/medicos`
- **Title:** Médicos | Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose
- **Meta description:** "Encontre os médicos cirurgiões, especialistas em patologias de coluna, membros da Associação Brasileira de Tratamento da Escoliose."
- **H2** "Médicos Membros da ABTE" + "Conheça nossa equipe de especialistas em tratamento da escoliose. Profissionais dedicados e qualificados prontos para ajudá-lo em sua jornada de reabilitação."
- **Card:** foto 160x160, nome (texto sem heading), CRM, Instagram, WhatsApp, local de atendimento (às vezes com link Google Maps), **minibiografia longa**.
- **Não tem:** agrupamento por estado (diferente da página de fisioterapeutas).
- Contagem: **23 médicos**. Inventário na seção 7.2.

### 5.5 Ortesistas `/ortesistas`
- **Title:** **Coletes** | Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose (title diferente do nome do menu)
- **Meta description:** "Encontre a relação de **profissonais** parceiros..." (erro de digitação)
- **H2** "Ortesistas"
- Entradas (nome em H1): Dra. Maria Cândida Luzo, Dra. Valéria M. C. Elui, Shopping Ortopedico, ORTOPEDIA REABILITAR, Ortopedia Atelier e Prothera Ortese e Prótese Service Ltda
- Tem um bloco de texto "História da Dra. Maria Cândida e Dra. Valéria" (formação em colete 3D Rigo-Chêneau)
- Cards com: foto retrato, texto de formação, telefones, e-mails, logo da clínica, endereço, Instagram/Facebook

### 5.6 Psicólogos `/psicologos`
- **Title:** Psicólogos | Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose
- **H2** "Psicólogos"
- 5 profissionais (nome em H1): Eline Posener (Aracaju/SE), Juliana Garrafoni (Campinas/SP), Valéria Bertoldi Peres (Campinas/SP), Rosana Fernandes dos Santos (Bauru/SP), Elizângela Eloi de Lima Coelho (Belo Horizonte/MG)
- Cards com: foto, CRP, formação, WhatsApp (texto, não link), endereço, Instagram
- Erros de digitação visíveis: "Whatdspp" (2x)

### 5.7 Outros `/outros`
- **Title:** **Parceiros** | Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose
- **H2** "Demais especializações"
- 1 profissional (H1): Dr. Marcus Vinicius Dassie Domingues (fisioterapia músculo-esquelética, dor crônica, Brasília/DF)

### 5.8 Nossa história `/nossa-historia`
- **Title:** Nossa história | Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose
- **Meta description:** cita "método **Schrot**" (erro, correto: Schroth)
- **H2** "Nossa história"
- **Linha do tempo** com H4 por ano (no HTML os H4 dos anos aparecem **separados do texto**, depois de todo o conteúdo, indicando layout absoluto do Wix):
  - **2018:** Bruna Pacheco, recém-certificada no Schroth ISST, reúne colegas. Nasce o projeto Tratando Escoliose. Conteúdos, lives, cartilhas gratuitas, traduções.
  - **2020:** entrada de fisioterapeutas de outras escolas reconhecidas pela SOSORT (BSPTS Conceito Rigo e SEAS). Expansão para a América do Sul.
  - **2021:** materiais para escolas, I Congresso Brasileiro de Escoliose. **Agosto de 2021: fundação da ABTE.**
  - **2022:** evento anual "Tratando Escoliose para Pais e Filhos". Criação do grupo de pais. Encontros clínicos e científicos mensais.
  - **2023:** Primeira Triagem Nacional de Escoliose gratuita.
  - **2024:** Mutirão de Fisioterapia Pré e Pós Cirúrgico em parceria com o Mutirão de Cirurgia. "Mais de 45 pacientes e quase 500 atendimentos".
  - **2025 (H4 "Um novo capítulo no nosso crescimento"):** diretoria ampliada, entrada oficial de médicos como associados, perfil @tratando.escoliose vira @abte.escoliose, lançamento da Lojinha ABTE (valor arrecadado vai para ações sociais, educativas e assistenciais).
  - H4 de fechamento: "Crescemos, evoluímos e seguimos lado a lado por cada curva desse caminho."
- **H2 "DIRETORIA 2025-2027"** (cards com foto, cargo, nome, cidade, método, WhatsApp, Instagram):
  - Presidente: Ft. Patrícia Baracat (Campos dos Goytacazes/RJ, Schroth ISST)
  - Vice-presidente: Ft. Aline Granato (Campinas e Indaiatuba/SP, Schroth ISST, BSPTS I e SEAS I)
  - Secretária geral: Ft. Jhulia Sales (Dourados/MS, Schroth ISST)
  - Diretora financeira: Ft. Núbia Santiago (Belo Horizonte e Pompéu/MG, Schroth ISST e SEAS I)
  - Diretora de ensino e pesquisa: Ft. Thaís Bojadsen (São Paulo/SP, BSPTS Conceito Rigo)
  - Diretora de comunicação e marketing: Ft. Tanara Ramlow (Florianópolis e Santo Amaro da Imperatriz/SC, Schroth ISST e SEAS)
- **H2 "Atuação Nacional e Internacional"** + o mesmo bloco de mapa da home

### 5.9 Blog (lista) `/blogtratandoescoliose`
- **Title:** Blog | Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose
- **Meta description:** cita "membros da **Sociedade Sul Americana de Fisioterapia Especializada em Escoliose**" (nome institucional desatualizado, deveria ser ABTE)
- Elementos: botão "Inscrever-se" (newsletter do blog), filtro "Todos posts", busca
- Card de post: imagem de capa, título, resumo (trecho do início), autor com foto, data, tempo de leitura
- Paginação/carregamento: a lista exibiu 20 posts na primeira carga (o total informado é 66)
- **Autor:** a maioria aparece como perfil genérico "Tratando Escoliose", mesmo quando o texto é assinado por um profissional no fim do post

### 5.10 Post individual `/post/{slug}`
Exemplo analisado: "Por que a escoliose pode continuar a piorar após o fim do crescimento?"
- **Title:** só o título do post (sem sufixo da marca)
- Meta com `article:author`, `published_time`, `modified_time`
- Estrutura: link "Todos posts" + busca, **H1 = título**, autor + data + tempo de leitura, corpo com subtítulos em **negrito (não em H2/H3)**, listas com "•" digitado, foto e nome do profissional autor no fim (assinatura manual), bloco "Referências"
- Rodapé do post: **H2 "Posts recentes"** (3 posts, cada link aparece duplicado no HTML) + "Ver tudo", **H2 "Comentários"** com campo "Escreva um comentário"

### 5.11 Artigos `/artigos`
- **Title:** ARTIGOS | Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose
- **Meta description:** lista de palavras-chave soltas ("Estudos científicos. Escoliose. Idiopática. Congênita...")
- H4 "Artigos Científicos sobre Escoliose" + "Clique o no Artigo para ver o CAT, ou no ícone do arquivo para ler o artigo na íntegra!" (erro: "Clique o no")
- **4 artigos**, cada um com: imagem (abre PDF do CAT) + ícone (abre outro PDF) + H6 "Leia o artigo na íntegra"
  - Tema Cobb (imagem "FOTO ARTIGO COBB")
  - Exercícios aeróbicos
  - Qualidade de vida
  - Gestante
- **Os artigos não têm título em texto**: o nome só aparece dentro da imagem. Ruim para SEO e acessibilidade.
- Tem um **ícone de Instagram órfão** no topo apontando para `instagram.com/alexandrejaccard`
- Botão "Inscrever-se" também aparece aqui
- Vazamento de CSS do Wix no texto dos links (`#comp-... svg [data-color="1"] {fill: #00A3C8;}`)

### 5.12 Loja `/category/loja`
- **Title:** Loja ABTE | Tratando Escoliose
- **OG description:** "Produtos educativos sobre escoliose em linguagem clara, acolhedora e embasados cientificamente."
- Breadcrumb: Página inicial > All Products (em inglês)
- **H2 "Buscar por"**: Todos os produtos / Produtos ABTE / Produtos parceiros
- **H2 "Filtrar"**: preço (R$9 a R$400)
- "9 produtos", ordenar: Recomendado
- Selo "MONTE SEU KIT" nos dois kits de cartilhas
- Inventário na seção 7.4

### 5.13 Produto `/product-page/{slug}`
Exemplo: Kit ABTE
- **Title:** Kit ABTE | ABTE
- Meta `og:type=product`, `product:price:amount`, `product:price:currency=BRL`, `og:availability`
- Galeria (imagem principal 1200x1600 + miniaturas)
- Descrição em bloco de texto
- **H1 = nome do produto**
- Preço normal riscado + preço promocional
- Quantidade + "Adicionar ao carrinho"
- Compartilhar: Facebook, Pinterest, WhatsApp, X/Twitter

### 5.14 Contato `/contato`
- **Title:** Contato | Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose
- **Meta description:** "Tire dúvidas e agende a sua consulta com fisioterapeutas especializados em métodos de tratamento específicos e conservadores para ESCOLIOSE."
- H2 "Entre em contato", H4 "Fale com a nossa equipe", "Atendimento em todo território brasileiro e no Paraguai."
- E-mail exibido: **tratandoesoliose@gmail.com** (erro: falta o "c", o correto é tratandoescoliose)
- Formulário Wix com botão "Send" (em inglês). Campos do formulário **[NÃO VERIFICADO]**
- Mensagem de sucesso: "Seus detalhes foram enviados com sucesso!"

### 5.15 Doação `/doação`
- **Title:** DOAÇÃO | ABTE (sem meta description)
- **Dois H1:** "Contribua com a ABTE" e "e fortaleça a causa da escoliose!"
- Texto: "Cada contribuição, grande ou pequena, ajuda a transformar vidas."
- Campos: Primeiro Nome*, Sobrenome*, Email*, Telefone WhatsApp* (com bandeira BR), Doação em nome de, Doação* (R$25 / R$50 / R$100)
- Botão: "Faça sua doação aqui!"
- Não explica: para onde vai o dinheiro, transparência, CNPJ, recorrência

### 5.16 Página 404
- Texto padrão Wix em inglês: "There's Nothing Here... We can't find the page you're looking for." + "Go Home"

---

## 6. Padrões de SEO atuais

| Item | Padrão atual | Observação |
|---|---|---|
| Title | `Página \| Associação Brasileira de Tratamento da Escoliose \| Tratando Escoliose` | Longo demais (passa de 60 caracteres). Loja, produto e doação usam padrões diferentes |
| Meta description | Uma por página, com erros de digitação em várias | Doação não tem |
| OG image | Uma imagem padrão 2500x1330 repetida na maioria das páginas | Home, blog, loja e posts têm imagem própria |
| H1 | Inconsistente | Home sem H1. Fisioterapeutas com dezenas de H1 (um por profissional). Doação com 2 H1 |
| Hierarquia | Saltos (H2 → H5, H4 → H6) | Headings usados como estilo visual, não como estrutura |
| URLs | Mistas | `/blogtratandoescoliose` (legado), `/doação` com acento, `/especialidades` para "Profissionais" |
| Alt text | Muitas imagens com nome de arquivo como alt (ex: "IMG_1140 - Thais Bojadsen.jpeg", "Gemini_Generated_Image_...") | Refazer alt descritivo |
| Dados estruturados | Não observados no HTML extraído **[NÃO VERIFICADO]** | Oportunidade: Organization, Physician/MedicalBusiness, Article, Product |

---

## 7. Inventário de dados

### 7.1 Fisioterapeutas (69, por estado)

Legenda de métodos: **ISST** = Schroth ISST, **BSPTS** = BSPTS Conceito Rigo, **SEAS**, **SSOL** = SSOL Schroth, **Lyon**.

> Onde dois profissionais aparecem lado a lado no Wix, a ordem dos textos no HTML fica embaralhada e a atribuição de métodos pode estar trocada. Esses casos estão marcados com **(?)**. Confirme na página ou com a ABTE.

**São Paulo** (subtítulo no site: Bauru, Campinas, Indaiatuba, Itu, Ribeirão Preto, Santos, São Paulo e Taubaté)

| Nome | Registro | Métodos | Cidade |
|---|---|---|---|
| Dra. Aline Granato Barbosa | Crefito 162558-F | ISST, BSPTS I, SEAS I | Campinas, Indaiatuba e telerreabilitação |
| Dra. Lucimar Latorre | Crefito 5450-F | ISST | Ribeirão Preto |
| Dra. Maria Cláudia de A. Monteiro | Crefito-3/7398-F | ISST e SEAS (?) | Bauru e telerreabilitação |
| Dra. Ana Flávia Lucena | Crefito 35194-F | ISST I e SEAS (?) | São Paulo e telerreabilitação |
| Dra. Débora Pinheiro | Crefito 3/22123-F | ISST, SEAS, BSPTS I | São Paulo e telerreabilitação |
| Dra. Bianca Buitoni | Crefito 215702-F | ISST I, SEAS I | São Paulo |
| Dra. Gisele Ribeiro | Crefito 125119-F | ISST | Itu |
| Dra. Thaís Bojadsen | Crefito 17411-F | BSPTS | São Paulo |
| Dra. Eleonora de Paula | Crefito 17592-F (?) | BSPTS | São Paulo |
| Dra. Vanessa de Sá Belinelli | Crefito/3/69255-F | BSPTS | São Paulo |
| Dra. Bianca R. Vicari de Oliveira | Crefito 86882-F (?) | BSPTS | Santos |
| Dra. Ana Marta Nunes Zanolli | Crefito 4462F | ISST | São Paulo |
| Dra. Geni Gandra | Crefito 3 57004-F | ISST | São Paulo |
| Dra. Aluane Dias | Crefito 161638-F | BSPTS | São Paulo |
| Dra. Natália Calcagno | Crefito 73676F | ISST | São Paulo |
| Dra. Vera Lucia Domene | Crefito 3/3378-F | ISST | Santana (SP) |
| Dra. Anna Amélia Oishi | Crefito 3/64352F | ISST | Presidente Prudente |
| Dra. Myrlla Moreira | Crefito 3-181683/F | SSOL e Lyon | Bragança Paulista |
| Dra. Aline Melchiori | Crefito 298301-F | BSPTS | São Paulo |
| Dra. Nívia Maria Callage Meliunas | Crefito 3/32075/F | ISST | São Paulo |
| Marilia Quintana | Crefito 3/150839/F | ISST e BSPTS | São Paulo |

**Minas Gerais** (subtítulo: Belo Horizonte, Governador Valadares, Itabira, Nova Lima, Pompeu e Uberlândia)

| Nome | Registro | Métodos | Cidade |
|---|---|---|---|
| Dra. Bruna Débora Pacheco | Crefito 4/241784-F | ISST | Belo Horizonte |
| Dra. Núbia Santiago Freitas | Crefito 192461-F | ISST, SEAS I | Belo Horizonte, Pompéu e telerreabilitação |
| Dr. Gledison Oliveira | Crefito-4 338960-F | BSPTS I (?) | Governador Valadares |
| Dra. Ângela Isotton | Crefito 4-131315F | SEAS e BSPTS (?) | Uberlândia |
| Dra. Rozilene Maria Cota Aroeira | Crefito 4 3874 F | ISST | Belo Horizonte e Itabira |
| Dra. Ana Cristina Sakamoto | 4/34.658-F | ISST e BSPTS | Nova Lima e Belo Horizonte |
| Dra. Isabella Campolina | Crefito 4/229273-F | SEAS I e SSOL (?) | Belo Horizonte |
| Dra. Betisa Pereira Lacerda | Crefito 4/74005-F | SSOL, BSPTS e Lyon (?) | Manhuaçu |
| Dra. Monica Bicalho | Crefito 4/9987-F | SSOL, BSPTS, SEAS e Lyon | Belo Horizonte |

**Mato Grosso** (subtítulo: Cuiabá)

| Nome | Registro | Métodos | Cidade |
|---|---|---|---|
| Dra. Eveline Jaudy | Crefito 9/109.044 | ISST, SEAS e Lyon | Cuiabá |
| Dra. Carolina Sossai | Crefito 9/107132 | ISST | Cuiabá |
| Dra. Vanessa Ghisleni | Crefito 9/176123-F | SEAS I | Primavera do Leste |

**Mato Grosso do Sul** (subtítulo: Campo Grande e Dourados)

| Nome | Registro | Métodos | Cidade |
|---|---|---|---|
| Dra. Paula Resende | Crefito 153037-F | ISST, BSPTS, SEAS | Campo Grande |
| Dra. Jhulia Sales | Crefito 304067-F | ISST | Dourados |
| Dra. Paola Duarte | Crefito 13/110.436-F | SSOL e SEAS | Campo Grande |

**Sergipe** (subtítulo: Aracaju e Lagarto)

| Nome | Registro | Métodos | Cidade |
|---|---|---|---|
| Dra. Priscilla Almeida | Crefito 17/57284 | ISST e SEAS | Aracaju |
| Dra. Daniela Maia | Crefito 36644F | BSPTS | Aracaju |
| Dra. Alana Lalucha | Crefito 101826-F | ISST | Aracaju e Lagarto |

**Piauí** (subtítulo: Teresina e Picos; o título "Estado do Piauí" aparece duplicado)

| Nome | Registro | Métodos | Cidade |
|---|---|---|---|
| Dra. Marina Pinheiro | Crefito 151047-F | ISST, BSPTS, SEAS I e Lyon (?) | Teresina |
| Dra. Marília Capucho | Crefito 169657-F | SEAS I e BSPTS I (?) | Teresina |
| Dra. Juçara Barroso | Crefito 143.648 | ISST e SEAS I | Picos |

**Pernambuco** (subtítulo: Recife)

| Nome | Registro | Métodos | Cidade |
|---|---|---|---|
| Dra. Grace Batista dos Santos | Crefito 191235-F | ISST | Recife |
| Dra. Vitória Lima | Crefito 1/112409-F | ISST | Recife |
| Dra. Fabiola Gomes | 14011 3-F | ISST | Recife |
| Dra. Andreza Rodrigues | 188582-F | ISST | Caruaru |

**Rio de Janeiro** (subtítulo: Campos dos Goytacazes, Niterói e Rio de Janeiro)

| Nome | Registro | Métodos | Cidade |
|---|---|---|---|
| Dra. Carla Santiago | Crefito 2: 62978-F | SEAS | Rio de Janeiro |
| Dra. Raquel Cerceau | Crefito 2 27423-F | SEAS, SSOL, Lyon e BSPTS | Niterói |
| Dra. Patrícia Baracat | Crefito 2-21685-F | ISST | Campos dos Goytacazes |
| Dra. Fernanda Velloso | Crefito 2/30.764-F | ISST | Niterói |
| Dra. Maria Alice Guina | Crefito-2 48763-F | ISST e BSPTS I | Rio de Janeiro |

**Santa Catarina** (subtítulo: Chapecó, Florianópolis e Santo Amaro da Imperatriz; o título aparece depois dos cards)

| Nome | Registro | Métodos | Cidade |
|---|---|---|---|
| Dra. Daniela Pramio Rossetto | Crefito 10/135367-F | ISST e SEAS | Chapecó |
| Dra. Jessica Magno Amarante | Crefito 10/193558-F | ISST | Balneário Camboriú |
| Dra. Tanara Ramlow | Crefito 10/75324-F | ISST e SEAS | Florianópolis e Santo Amaro da Imperatriz |
| Dra. Elisa Ferreira | Crefito 10/116854-F | ISST, SEAS e BSPTS | Joinville |

**Paraná** (subtítulo: Cascavel)

| Nome | Registro | Métodos | Cidade |
|---|---|---|---|
| Dra. Marines Toigo Gottlieb | Crefito 10411-F | ISST | Cascavel |

**Ceará** (subtítulo: Fortaleza)

| Nome | Registro | Métodos | Cidade |
|---|---|---|---|
| Dra. Aline Vasques | Crefito 44242 | ISST e BSPTS I (?) | Fortaleza |
| Dra. Mirian Mota | Crefito 44249-F | ISST (?) | Fortaleza |
| Dr. Roberto Enéas | Crefito 74610 | BSPTS | Fortaleza |

**Alagoas** (subtítulo: Arapiraca e Maceió)

| Nome | Registro | Métodos | Cidade |
|---|---|---|---|
| Dra. Maria Thereza Shibata | Crefito 28441-F | BSPTS | Maceió |
| Dra. Polly Barbosa | Crefito 57883 | SEAS I e BSPTS I | Maceió |
| Dra. Analita Fernanda | Crefito 269161-F | ISST | Arapiraca |

**Amazonas** (Manaus): Dra. Alessandra Backsmann, Crefito 152420-F, SEAS I

**Rio Grande do Sul** (Porto Alegre): Dra. Lúcia Teixeira Dimer, Crefito 5/9263-F, ISST

**Rio Grande do Norte e Paraíba** (subtítulo: Natal, Parnamirim e João Pessoa)

| Nome | Registro | Métodos | Cidade |
|---|---|---|---|
| Dr. Pablo Santiago | Crefito 213729-F | SEAS e BSPTS | Natal, Parnamirim (RN) e João Pessoa (PB) |
| "Dr." Roberta Paula (deveria ser Dra.) | Crefito 289425-F | SSOL | Campina Grande (PB) |

**Goiás** (Goiânia): Dra. Vânia Medeiros De Antonio, Crefito 19: 85436F, SEAS

**Paraguai** (Asunción): Claudia Bernaola, Licenciada, ISST, SEAS e BSPTS (card aparece **duplicado** no fim da página)

**Bolívia** (Santa Cruz): Marcelo Flores, F-47, ISST

### 7.2 Médicos (23)

| Nome | Registro | Local de atendimento |
|---|---|---|
| Prof. Dr. Robert Meves | CRM 77.448 | São Paulo/SP |
| Dra. Thereza Selma Soares Lins de Freitas | não informado | Recife/PE (endocrinologia pediátrica) |
| Dr. André Luís Fernandes Andújar | CRM/SC 6736 | Florianópolis/SC |
| Dr. Fernando Melo Filho | CRM 171961 | Campinas e Indaiatuba/SP |
| Dr. Murilo Daher | CRM 13836 | Goiânia/GO |
| Dr. Carlos Romeiro | CRM 14114 PE | Recife/PE |
| Prof. Dr. Alexandre Fogaça | CRM 90738 | São Paulo/SP |
| Dr. Christiano Andrade Lima | CRM 45951 | Belo Horizonte/MG |
| Dr. Fernando Façanha Filho | CRM 5011 | Fortaleza/CE |
| Dr. Pedro Remolli | CRM 13272/AM, 197773/SP | Barretos/SP e Manaus/AM |
| Dra. Gabriella Brito | CRM 17907 | Fortaleza/CE |
| Dr. Pedro Luz Alves | CRM 28001 | Florianópolis/SC |
| Dr. Jacks Tenório | CRM AL 4691/RQE 2376, CRM PE 14028 | Alagoas (Coruripe) |
| Dr. Túlio Albuquerque de Moura Rangel | CRM-PE 13.282 | Recife/PE |
| Dra. Andréa Maretti Mariottoni Meves | CRM 87538 SP | São Paulo (dermatologia) [local exato não informado] |
| Dr. André Castilho | CRM/MG 48775 | Belo Horizonte/MG |
| Dr. Luís Eduardo Parra | CRM 200772 | Campinas/SP |
| Dr. Denis Sakai | CRM 119954 | São Paulo/SP |
| Dr. Ricardo Dantas | CRM 3868 | Aracaju/SE |
| Dr. Alex Rossato | CRM 87478 | São Paulo/SP |
| Dr. Alex Araujo | CRM 23730 | Brasília/DF |
| Dr. Olavo Biraghi Letaif | CRM 116100 | São Paulo/SP |
| Dr. Frederico Araujo Leite | CRM 3718 - PI | Teresina/PI |

Cada médico tem uma minibiografia longa (formação, fellowships, sociedades). Copiar direto da página se for usar.

### 7.3 Parceiros

- **Ortesistas (5):** Dra. Maria Cândida Luzo (São Paulo/SP), Dra. Valéria M. C. Elui (Ribeirão Preto/SP), Shopping Ortopédico (telefones com DDD 31), Ortopedia Reabilitar / Dr. Gledison Oliveira (Governador Valadares/MG), Ortopedia Atelier e Prothera / Roberto Enéas (Fortaleza/CE)
- **Psicólogos (5):** listados na seção 5.6
- **Outros (1):** Dr. Marcus Vinicius Dassie Domingues (Brasília/DF)

### 7.4 Produtos da loja (9)

| Produto | Preço normal | Preço promocional | Status |
|---|---|---|---|
| 30 cartilhas (ABCD do Colete + Do pré ao pós cirúrgico) | R$ 450,00 | R$ 250,00 | Selo "Monte seu kit" |
| 50 cartilhas (ABCD do Colete + Do pré ao pós cirúrgico) | R$ 600,00 | R$ 400,00 | Selo "Monte seu kit" |
| Kit ABTE | R$ 300,00 | R$ 200,00 | Disponível |
| EBOOK - ABC da Escoliose | R$ 9,90 | | Disponível |
| Banner Triagem ABTE - DIGITAL | R$ 49,99 | R$ 39,99 | Disponível |
| Jogo das Posturas - DIGITAL | R$ 29,90 | | Disponível |
| Para Imprimir e Colorir | R$ 19,90 | | Disponível |
| Boneca Gaby (biscuit) | | | Esgotado |
| Jogo de tabuleiro Brace Yourself: A Jornada da Escoliose | | | Esgotado |

> Preços capturados em 26/09/2026. Podem mudar. Confirme antes de publicar.

Descrição do Kit ABTE (exemplo de copy de produto): 25 desenhos para colorir (A5), Jogo das Posturas, 5 cartilhas Pré e Pós-Cirúrgico (lançamento nov/2025), 5 cartilhas ABCD do Colete (lançamento 2025), brinde de 5 cartilhas ABC da Escoliose.

### 7.5 Posts do blog visíveis na primeira carga (20 de 66)

Cadência: **quinzenal**. Do mais recente ao mais antigo:

1. Por que a escoliose pode continuar a piorar após o fim do crescimento? (21/09/2026)
2. Se o risco de progressão norteia a conduta, por que usamos tão pouco a Classificação de Sanders? (8 set)
3. Reabilitação pós-artrodese na escoliose idiopática do adolescente: Schroth combinado ao core supera o treino isolado? (24 ago)
4. Entendendo a fisiologia do tratamento postural (10 ago)
5. Indicações da técnica Vertebral Body Tethering (VBT) (27 jul)
6. Reabilitação motora e cognitiva reduz incapacidade em adultos com escoliose idiopática (13 jul)
7. Diagnóstico Precoce da Escoliose: por que identificar a curva na fase inicial faz toda a diferença (29 jun)
8. Uma Nova Forma de Ver a Escoliose: Agora em 3D (15 jun)
9. A cirurgia corrige a coluna. A reabilitação devolve a função. (1 jun)
10. O papel do controle motor no tratamento da escoliose (19 mai)
11. Fisioterapia específica ajuda na escoliose? O que as melhores evidências mostram (4 mai)
12. Combinar técnicas pode melhorar a resposta ao tratamento? O uso da plataforma vibratória associada aos PSEE na melhora da postura (20 abr)
13. Um Olhar Inovador sobre a Fadiga Muscular Paravertebral: Ganhador do SOSORT AWARD 2025! (6 abr)
14. Plasticidade neuromuscular e reaprendizado postural: como o cérebro participa da correção da postura (23 mar)
15. Eu trato, tu tratas, nós tratamos! (9 mar)
16. Qualidade de vida em adolescentes com escoliose que não fizeram cirurgia: o que a pesquisa mostra (19 fev)
17. Controle da dor após cirurgia de escoliose em crianças e adolescentes: o que a ciência mostra (24/12/2025, Ft. Aline Granato)
18. Colete 3D tipo Rigo Chêneau para escoliose idiopática do adolescente: maior correção no colete e menores taxas de progressão da curva (10/12/2025, Ft. Patrícia Baracat)
19. O fisioterapeuta como educador: muito além dos exercícios (05/11/2025, Ft. Gisele Ribeiro)
20. O que sabemos hoje sobre as diferentes características da dor nas costas em adultos com e sem escoliose (27/10/2025, Ft. Ana Cristina Sakamoto)

(Datas sem ano = 2026, conforme exibido pelo Wix.)

---

## 8. Integrações e links externos

| Integração | Onde | Destino |
|---|---|---|
| Grupo de WhatsApp | Banners da home | chat.whatsapp.com (link de convite) |
| Formulário de associação | Home, "Quero ser associado (a)" | Google Forms (forms.gle) |
| WhatsApp individual | Cards de profissionais | Mistura de `wa.me`, `api.whatsapp.com` e encurtador `whats.link` |
| Instagram/Facebook | Top bar e cards | Vários formatos, alguns com parâmetros de rastreamento (`igsh=`, `utm_source=qr`) |
| Google Maps | Alguns médicos | `maps.app.goo.gl` |
| Linktree / Beacons | Alguns médicos e parceiros | Links externos de perfil |
| Parceria de projeto | Home | Projeto Mude a Curva (sem link) |

---

## 9. Problemas encontrados (corrigir no redesign)

### Links quebrados ou errados
- Botão "Compre agora" (home) → **404** (`/category/all-products`)
- Menu LOJA aponta para o **domínio antigo** tratandoescoliose.com.br
- E-mail errado na página Contato: **tratandoesoliose@gmail.com**
- Redes sociais com `instagram.com.br` / `facebook.com.br` e `http://`
- Dra. Bianca Buitoni: botão de e-mail aponta para o e-mail da **Dra. Débora Pinheiro**
- Dra. Priscilla Almeida: botão de e-mail aponta para o e-mail da **Dra. Aline Granato**
- Dra. Aluane Dias: Instagram aponta para o perfil da **Dra. Geni Gandra**
- Dra. Grace Batista e Dra. Vitória Lima: Facebook aponta para a página da **própria ABTE**
- Dra. Juçara Barroso e Dra. Marília Capucho: mesmo número de WhatsApp (possível erro)
- Mapa da home: todos os estados levam para a mesma página, sem âncora
- Ícone de Instagram órfão na página Artigos (perfil alexandrejaccard)

### Conteúdo inconsistente
- Home diz "+500 atendimentos"; página de história diz "quase 500 atendimentos"
- Subtítulo de SP cita Taubaté (sem profissional listado) e omite Presidente Prudente, Bragança Paulista e Santana
- Subtítulos de MG e PE não citam Manhuaçu e Caruaru
- Mapa da home não inclui RS nem Bolívia
- Card da Claudia Bernaola duplicado
- "Dr." Roberta Paula (gênero errado)
- "Método Método BSPTS" duplicado (Vanessa Belinelli)
- "Whatdspp" (2x em Psicólogos), "Clique o no Artigo" (Artigos)
- Meta descriptions com "conversador", "Schrot", "profissonais"
- Blog cita "Sociedade Sul Americana de Fisioterapia Especializada em Escoliose" em vez de ABTE
- Autoria do blog genérica ("Tratando Escoliose") com assinatura manual do profissional no fim do texto
- Mistura de marcas: "Tratando Escoliose" e "ABTE" convivendo em title, logo, e-mail e Facebook
- Textos do sistema em inglês: "More", "Send", "All Products", página 404

### Estrutura e UX
- "Nossa história" e "Diretoria" não estão no menu (só na home)
- Página de fisioterapeutas muito longa, sem busca nem filtro (69 cards)
- Médicos sem agrupamento por estado (inconsistente com fisioterapeutas)
- Artigos com título só dentro de imagem
- Footer praticamente vazio
- Doação sem prestação de contas, CNPJ ou explicação de uso do dinheiro
- Home sem H1, fisioterapeutas com dezenas de H1

---

## 10. O que NÃO foi possível extrair

- **[RESOLVIDO em 26/09/2026: ver tokens.css e design-system.md v3.1]** **Design tokens** (paleta completa, fontes, tamanhos, espaçamentos): o CSS do Wix não vem no conteúdo extraído. A única cor identificada foi **#00A3C8** (azul dos ícones de PDF). Para o redesign, peça ao usuário prints das páginas ou os arquivos da marca.
- **Logo em alta resolução / vetor**: só a versão PNG recortada do site.
- **Itens escondidos no "More"** do menu.
- **Páginas de categoria** `/category/abte` e `/category/produtos-parceiros` (não abertas).
- **Demais páginas de produto e posts** (só 1 de cada foi analisado como template).
- **Campos do formulário de Contato**, fluxo de checkout e gateway de pagamento da doação (não afeta o sistema novo: pagamento desativado, futuro Stripe).
- **Área de membros** (login, perfis) e conteúdo restrito.
- **Sitemap.xml** e robots.txt.
- **[RESOLVIDO: decisão da designer, ver design-system.md seção 4 e 9]** **Comportamento mobile** (layout responsivo do Wix). O mobile novo é o mesmo design do desktop, readaptado.

---

## 11. Decisões tomadas

| Decisão | Status |
|---|---|
| Plataforma | **Sair 100% do Wix.** O site será reconstruído em código próprio |
| Stack | **Next.js (App Router, TypeScript) + Firebase** (Cloud Firestore, Firebase Authentication, Cloud Storage for Firebase). Sem CMS: painel sob medida |
| Banco de dados | **Cloud Firestore.** Conteúdo e imagens fora do Wix |
| Arquivos (imagens e PDFs) | **Cloud Storage for Firebase.** Exige o plano Blaze (pagamento por uso, com cartão vinculado) desde fevereiro de 2026; o uso gratuito continua valendo dentro das cotas. Só entra na etapa 4 |
| Login | **Firebase Authentication**, e-mail e senha, sem cadastro público |
| Painel administrativo | **Obrigatório**, com login e senha, construído sob medida em `/admin` |
| Quem acessa o painel | **Bianca (administradora) + membros da diretoria ABTE (editores)** |
| Conteúdo gerenciado pelo painel | **Produtos da loja, posts do blog, artigos científicos, profissionais (todas as categorias), diretoria e configurações do site (dados do Pix)** |
| Contas definitivas | **Em nome da ABTE**: projeto Firebase de produção, hospedagem, domínio e, no futuro, Stripe |
| Ambiente de desenvolvimento | Projeto Firebase `abte-dev` na conta Google da Bianca, plano gratuito, Firestore em `southamerica-east1`. Repositório privado no GitHub da Bianca, transferível para a ABTE |
| Pagamento online | **DESATIVADO.** Nenhum gateway, SDK, chave de API, carrinho, checkout ou webhook é criado agora |
| Gateway futuro | **Stripe**, quando o pagamento for ativado |
| Loja | **Vitrine sem compra**: lista e página de produto com preço e aviso "Em breve" no lugar do botão de compra |
| Doação | **Pix estático** (chave e QR code da ABTE, sem gateway), com valores sugeridos (R$25, R$50, R$100) e valor livre. **[CONFIRMAR COM A BIANCA antes da etapa 2]** |
| Design | Design system v3.1 (tokens.css, tokens.json, design-system.md), aprovado pela designer |
| Responsivo | Mesmo design em todas as telas, só mudam tamanhos, colunas e altura mínima de controles. Breakpoints 767 / 1023 px |

> Qualquer item que não esteja nesta tabela ainda é decisão em aberto (seção 14). Não assuma.

---

## 12. Requisitos do sistema novo

### 12.1 Site público
- Recriar todas as páginas da seção 5, corrigindo os problemas da seção 9
- Hierarquia de headings correta (um H1 por página)
- SEO por página: title, meta description, OG image, canonical, sitemap.xml, robots.txt
- Dados estruturados (schema.org): Organization na home, Article nos posts, Product nos produtos (sem oferta de compra enquanto o pagamento estiver desativado)
- **Redirects 301** de todas as URLs antigas (ver 12.6)
- Responsivo (mesmo design do desktop, readaptado; público inclui pais e adolescentes, acesso majoritário provavelmente pelo celular [INFERÊNCIA])
- Acessibilidade: alt text real nas imagens, contraste, navegação por teclado
- Textos do sistema em português (nada de "Send", "More", "All Products")
- **Loja:** vitrine e página de produto sem compra, com aviso "Em breve". O botão "Compre agora" da home vira "Ver produtos"
- **Doação:** página `/doe` com Pix estático (ver 12.5)

### 12.2 Painel administrativo
- **Login com e-mail e senha** (Firebase Authentication), recuperação de senha por e-mail com modelos em português, **sem cadastro público**
- Rota protegida `/admin`, fora do sitemap e com `noindex`
- **Sessão no servidor:** cookie de sessão do Firebase, httpOnly e sameSite strict, validado no servidor em toda rota do painel, com checagem de sessão revogada
- **Papéis por custom claim** no Firebase Authentication:
  - **Administrador** (Bianca): acesso total, cria e desativa usuários, configurações do site (inclusive dados do Pix)
  - **Editor** (diretoria): cadastra e edita conteúdo (posts, artigos, profissionais, diretoria, produtos). Não acessa configurações nem usuários
  - Usuário sem papel não acessa nada do painel
- **Registro de alterações:** quem criou, editou, excluiu ou restaurou o quê e quando (gravado só pelo servidor, ninguém edita)
- **Lixeira:** exclusão com confirmação, item vai para a lixeira e pode ser restaurado
- **CRUD de Produtos:** nome, slug automático, descrição, preço normal, preço promocional, categoria (Produtos ABTE / Produtos parceiros), tipo (físico / digital), status (disponível / esgotado), selo opcional (ex: "Monte seu kit"), galeria de imagens com ordem, publicado/rascunho. Sem estoque, carrinho ou pedido enquanto o pagamento estiver desativado
- **CRUD de Posts do blog:** título, slug, resumo, capa, editor de texto rico (subtítulos H2/H3 de verdade, listas, negrito, imagens, links), autor selecionável (vinculado ao cadastro de profissionais), referências, data de publicação, status (rascunho / publicado / agendado), campos de SEO, tempo de leitura calculado automaticamente
- **CRUD de Artigos científicos:** título em texto (não só na imagem), descrição curta, imagem, upload do **PDF do artigo** e do **PDF do CAT**, tags/temas, ordem, publicado
- **CRUD de Profissionais:** tipo (fisioterapeuta, médico, ortesista, psicólogo, outro), grupo (Membro ABTE / Parceiro), tratamento (Dr. / Dra. / Ft. / Licenciada), nome, registro (Crefito, CRM, CRP ou outro), métodos (seleção múltipla: Schroth ISST, BSPTS Conceito Rigo, SEAS, SSOL Schroth, Lyon, outros), país, UF, cidades de atendimento, telerreabilitação (sim/não), endereço, WhatsApp, Instagram, Facebook, e-mail, site, foto, minibiografia, ativo/inativo, ordem. Validação de links (evita os erros de contato trocado da seção 9)
- **CRUD de Diretoria:** mandato (ex: 2025-2027), cargo, profissional vinculado (reaproveita foto e contatos do cadastro de profissionais), ordem
- **Configurações do site** (só administrador): dados do Pix (chave, tipo de chave, nome do titular, cidade), exibição do CNPJ, e-mail de contato e redes sociais. Toda alteração vai para o registro de alterações
- **Biblioteca de mídia:** upload de imagens e PDFs, compressão e redimensionamento automáticos, geração de WebP/AVIF, alt text obrigatório
- **Usuários** (só administrador): convidar, definir papel, desativar
- Interface simples, pensada para quem **não é desenvolvedor**
- **DESATIVADOS enquanto o pagamento estiver desativado:** pedidos, doações registradas, cupons de desconto

### 12.3 Banco de dados: modelo inicial no Firestore (validar na etapa 3)

**Padrão de acesso (diretriz técnica):** o navegador não lê nem grava no Firestore diretamente. Páginas públicas e painel acessam os dados **pelo servidor**, com o Admin SDK. Toda ação do painel verifica sessão e papel antes de ler ou gravar. As regras do Firestore negam todo acesso direto do navegador, e os testes automáticos confirmam isso. Qualquer exceção precisa de regra específica e teste.

**Arquivos:** imagens públicas no Storage em um caminho público só de leitura; PDFs e originais conforme regra definida na etapa 4. Uploads sempre passam pelo servidor ou por URL assinada gerada pelo servidor.

**Custo de leitura:** páginas públicas com cache e revalidação quando um conteúdo é publicado, para não gastar leituras do Firestore a cada visita.

```
configuracoes/site                (documento único)
  pix { chave, tipoChave, titular, cidade }, exibirCnpj, cnpj,
  emailContato, instagram, facebook, atualizadoPor, atualizadoEm

usuarios/{uid}
  nome, email, papel (administrador | editor), ativo, criadoEm
  (o papel também fica na custom claim do Authentication; a claim decide o acesso)

midias/{id}
  caminhoStorage, url, tipo (imagem | pdf), alt, largura, altura, tamanho,
  variantes (webp, avif, tamanhos), enviadoPor, criadoEm, excluidoEm

profissionais/{id}
  tipo (fisioterapeuta | medico | ortesista | psicologo | outro), grupo (membro | parceiro),
  tratamento, nome, nomeBusca (normalizado, sem acento), registro, metodos[],
  pais, uf, cidades[], telerreabilitacao, endereco, whatsapp, instagram, facebook,
  email, site, fotoMidiaId, bio, ativo, ordem, criadoEm, atualizadoEm, excluidoEm

diretoria/{id}
  mandato, cargo, profissionalId, ordem, criadoEm, atualizadoEm, excluidoEm

posts/{id}
  slug, titulo, resumo, conteudo (JSON do editor), capaMidiaId,
  autorProfissionalId (ou autorInstitucional: true para "ABTE"), referencias,
  status (rascunho | publicado | agendado), publicadoEm, tempoLeitura,
  seo { title, description, ogMidiaId }, criadoEm, atualizadoEm, excluidoEm

artigos/{id}
  titulo, descricao, imagemMidiaId, pdfArtigoMidiaId, pdfCatMidiaId,
  tags[], ordem, publicado, criadoEm, atualizadoEm, excluidoEm

produtos/{id}
  slug, nome, descricao, preco, precoPromocional, categoria, tipo (fisico | digital),
  status (disponivel | esgotado), selo, imagens [{ midiaId, ordem }], ordem, publicado,
  seo { title, description }, criadoEm, atualizadoEm, excluidoEm

logAlteracoes/{id}
  usuarioId, usuarioNome, colecao, documentoId,
  acao (criar | editar | excluir | restaurar), resumo, criadoEm
```

Observações:
- `excluidoEm` preenchido = item na lixeira. Restaurar limpa o campo
- Slugs de posts e produtos são únicos: o servidor verifica antes de salvar
- A autoria genérica "Tratando Escoliose" do blog passa a ser o profissional real (`autorProfissionalId`)
- Filtros do diretório (estado, cidade, método, telerreabilitação, busca por nome) cabem no volume da ABTE (cerca de 100 profissionais)

**Coleções que NÃO são criadas agora:** `pedidos`, `pedidoItens`, `doacoes`, `cupons` (pagamento desativado). Quando a Stripe for ativada, elas serão desenhadas junto com o gateway.

Coleções que ainda dependem das decisões da seção 14: `contatos`, `assinantesNewsletter`, `associados`.

### 12.4 Migração de conteúdo do Wix
- **66 posts** (texto, capa, imagens internas, autor, data original de publicação)
- **9 produtos** (textos, preços, imagens)
- **4 artigos** (8 PDFs em `/_files/ugd/`)
- Todas as imagens hoje em `static.wixstatic.com` precisam ser **baixadas e reenviadas** para o Cloud Storage. Não linkar o CDN do Wix: as imagens somem quando a conta Wix for encerrada
- Profissionais (69 fisioterapeutas, 23 médicos, 11 parceiros) e diretoria: fotos e contatos, importados para a coleção `profissionais`. Revisar os campos marcados com (?) na seção 7.1 e os links trocados da seção 9 **antes** de importar
- Lista de e-mail (2 mil+), cupons e histórico de doações: **exportar do Wix antes de desligar a conta**, para guardar o registro, mesmo que não entrem no sistema novo agora
- Conferir contagens após a migração (posts, produtos, imagens) contra o site original
- A migração roda por script no servidor (Admin SDK), com relatório do que foi importado, do que falhou e do que precisa de revisão

### 12.5 Pagamentos: DESATIVADOS

**Agora**
- Nada de pagamento é criado: nenhum gateway, SDK, chave de API, carrinho, checkout, webhook, coleção de pedidos ou de doações
- **Loja:** vitrine sem compra, com aviso "Em breve"
- **Doação por Pix estático** [CONFIRMAR COM A BIANCA antes da etapa 2]:
  - QR code e código "copia e cola" gerados pelo servidor a partir dos dados de `configuracoes/site`, sem gateway e sem custo
  - Valores sugeridos (R$25, R$50, R$100), cada um gerando seu QR code com o valor preenchido, e opção de valor livre
  - Botão "Copiar código Pix" (é o mais usado no celular)
  - O site **não registra** as doações e não envia e-mail de agradecimento. A conferência é pelo extrato bancário da ABTE
  - O campo "Doação em nome de" deixa de existir
  - Dados do Pix editáveis só pelo administrador, com registro de alterações (trocar a chave é trocar para onde o dinheiro vai)
  - Antes do lançamento: testar o QR code em pelo menos dois apps de banco com valor pequeno
  - Até a ABTE enviar os dados do Pix, a página usa placeholder claramente marcado

**Quando for ativado (futuro, via Stripe)** requisitos de referência, a revisar na época:
- Loja: carrinho, checkout, cupons, frete para produtos físicos, entrega automática por link seguro para produtos digitais, e-mails de pedido, controle de estoque
- Doação: valores sugeridos e livre, "Doação em nome de", e-mail de agradecimento, recorrência [a decidir]
- Confirmação de pagamento **só por webhook**, dados de cartão nunca passam pelo servidor da ABTE (checkout ou componentes da própria Stripe)
- Conta da Stripe em nome da ABTE (CNPJ)
- Verificar na época se a conta Stripe Brasil aceita Pix e doação recorrente nas condições atuais

### 12.6 Redirects 301 obrigatórios (mínimo)

| URL antiga | Sugestão de URL nova (validar) |
|---|---|
| `/blogtratandoescoliose` | `/blog` |
| `/post/{slug}` | `/blog/{slug}` |
| `/especialidades` | `/profissionais` |
| `/fisioterapeutas`, `/medicos`, `/ortesistas`, `/psicologos`, `/outros` | `/profissionais/...` |
| `/category/loja`, `/category/abte`, `/category/produtos-parceiros`, `/category/all-products` | `/loja` (com filtro) |
| `/product-page/{slug}` | `/loja/{slug}` |
| `/doação` (`/doa%C3%A7%C3%A3o`) | `/doe` |
| `/nossa-historia` | `/sobre` |
| `/artigos`, `/contato` | manter |
| Domínio `tratandoescoliose.com.br/*` | `abteescoliose.com.br/*` |

Manter os **mesmos slugs** dos posts e produtos para não perder posicionamento no Google.

### 12.7 Requisitos não funcionais
- **LGPD:** aviso de cookies, política de privacidade, consentimento nos formulários (contato, associação, newsletter)
- **Backup** automático do Firestore e do Storage (verificar as opções atuais do Firebase e do Google Cloud na etapa 9)
- **Segurança:** senhas gerenciadas pelo Firebase Authentication, proteção nativa contra excesso de tentativas, variáveis sensíveis só no ambiente (nunca no código), Admin SDK só no servidor, regras do Firestore e do Storage negando por padrão e com testes automáticos
- **Custos:** alerta de orçamento no Google Cloud do projeto de produção (o alerta avisa por e-mail, não bloqueia gastos)
- **Performance:** imagens otimizadas e lazy loading (a página de fisioterapeutas tem ~69 fotos), páginas públicas com cache

---

## 13. Stack decidida

> Versões, limites de plano gratuito e preços mudam com frequência: verifique nos sites oficiais antes de cada etapa.

**Aplicação:** Next.js (App Router, TypeScript), CSS puro com CSS Modules e os tokens do design system. Sem Tailwind, Bootstrap ou kits de UI.

**Firebase:**
- **Cloud Firestore:** banco de dados
- **Firebase Authentication:** login do painel, recuperação de senha, papéis por custom claim
- **Cloud Storage for Firebase:** imagens e PDFs (exige plano Blaze; entra na etapa 4). As cotas gratuitas de armazenamento valem só para buckets em regiões dos EUA (verificar na época)
- **Emulator Suite:** testes automáticos das regras de segurança (exige Java instalado)
- **Admin SDK:** todo acesso aos dados pelo servidor

**Ambientes:**
- Desenvolvimento: projeto `abte-dev`, conta Google da Bianca
- Produção: projeto próprio, conta da ABTE, criado na etapa 9

**Hospedagem:** em aberto. Firebase App Hosting é a candidata natural (roda Next.js e fica no mesmo console), mas ainda não foi decidida. Algumas integrações dela exigem conta de faturamento.

**Pagamentos:** desativados. Futuro: Stripe.

**E-mail transacional:** recuperação de senha pelo próprio Firebase Authentication. Para o formulário de contato, o serviço ainda está em aberto (seção 14).

**Descartadas nesta conversa:** Supabase (opção A original) e Payload CMS (opção B original, incompatível com Firestore até onde se sabe). Firebase Studio não é usado: foi descontinuado para novos projetos.

---

## 14. Decisões ainda em aberto (perguntar antes de codar)

1. **Doação por Pix:** confirmar se o Pix estático entra enquanto a Stripe não é ativada, ou se a página Doe fica só com aviso "em breve" (antes da etapa 2)
2. **Dados do Pix da ABTE:** chave (de preferência CNPJ), nome do titular como aparece no banco, cidade, se o CNPJ será exibido (antes do lançamento)
3. **Hospedagem:** Firebase App Hosting ou outra (antes da etapa 9)
4. **Região do projeto de produção** do Firestore e do Storage (antes da etapa 9)
5. **Domínio:** onde `abteescoliose.com.br` está registrado e quem tem acesso (antes da etapa 9)
6. **Serviço de e-mail do formulário de contato** e onde as mensagens ficam guardadas (antes do envio real do formulário)
7. **Papéis no painel:** a divisão Administrador (Bianca) x Editor (diretoria) está correta? Algum membro precisa de acesso restrito a uma área? (antes da etapa 3)
8. **Associação:** continua no Google Forms ou vira formulário no site com cadastro no banco?
9. **Newsletter:** a lista de 2 mil+ e-mails vai para qual ferramenta?
10. **Área de membros** (hoje 33 cadastrados no Wix): continua existindo? Para quê?
11. **Comentários no blog:** manter ou remover?
12. **Marca:** "Tratando Escoliose" continua visível ou fica só como legado na página Sobre?
13. **Conteúdo:** logo em vetor, fotos próprias, números oficiais, depoimentos autorizados, logos de parceiros autorizados
14. **Quando o pagamento for ativado (futuro):** frete (quem despacha, de onde, qual serviço), doação recorrente, recibo, nota fiscal das vendas (tema fiscal: confirmar com a contabilidade da ABTE)

### Sugestão de arquitetura de informação (ponto de partida, validar)
- Início
- Sobre (Nossa história, Diretoria, Missão, Ações sociais: triagem, mutirões, evento Pais e Filhos)
- Encontre um profissional (Fisioterapeutas, Médicos, Parceiros: ortesistas, psicólogos, outros)
- Conteúdo (Blog, Artigos científicos)
- Loja
- Seja associado
- Doe
- Contato

---

*Fim do documento.*
