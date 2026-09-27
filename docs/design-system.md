# ABTE · Design system · versão 3.1

Fonte de verdade visual para a reconstrução do site da ABTE em código próprio. Arquivos irmãos: `tokens.css` e `tokens.json`, com os mesmos valores. As versões anteriores (v1, v2, v3) ficaram no Claude Design e não fazem parte deste projeto.

**Etiquetas de origem**
- **RASCUNHO:** medido na home adaptada.
- **TEMPLATE:** página interna do template, aprovada pela ABTE.
- **PAINEL:** painel do Wix.
- **AJUSTE APROVADO PELA DESIGNER.**
- **PROPOSTA:** não extraído e ainda não aprovado.
- **NÃO VERIFICADO:** sem material para medir, com o motivo.

## Registro de alterações

### Revisão de escopo da v3.1 (26/09/2026, sem mudança de tokens)
Nenhum valor visual mudou. Os tokens continuam na versão 3.1. Só o escopo de componentes foi ajustado às decisões do projeto:
| # | Mudança | Origem |
|---|---|---|
| 1 | Pagamento online desativado (futuro: Stripe). Carrinho e checkout não são construídos agora | Decisão do projeto |
| 2 | Ícone da sacola do carrinho não é usado enquanto o pagamento estiver desativado | Decisão do projeto |
| 3 | Página de produto sem compra: aviso "Em breve" no lugar de quantidade e "Adicionar ao carrinho" | Decisão do projeto |
| 4 | Doação por Pix estático: valores em botões, QR code e "Copiar código Pix" (a confirmar com a Bianca) | Decisão do projeto |

### v3 para v3.1
| # | Mudança | Origem |
|---|---|---|
| 1 | Card [A]: rótulo e frase passam a `--font-size-text-lg` (24px) | AJUSTE APROVADO PELA DESIGNER |
| 2 | Estatísticas: legendas passam a `--font-size-text-lg` (24px) | AJUSTE APROVADO PELA DESIGNER |
| 3 | Depoimento "Patient's Voice": card passa a #ADD8E6 | AJUSTE APROVADO PELA DESIGNER |
| 4 | Hover com a opção B; novo token `--color-primary-hover: #00337A` | AJUSTE APROVADO PELA DESIGNER |
| 5 | Responsividade: mesmo design em todas as telas, só muda tamanho, colunas e altura mínima de controles | AJUSTE APROVADO PELA DESIGNER |
| 6 | Breakpoints: celular até 767px, tablet de 768 a 1023px, desktop a partir de 1024px | AJUSTE APROVADO PELA DESIGNER |
| 7 | Menu hambúrguer com menu em tela cheia abaixo de 1024px | AJUSTE APROVADO PELA DESIGNER |
| 8 | Mínimos dos `clamp()` deixam de ser PROPOSTA | AJUSTE APROVADO PELA DESIGNER |
| 9 | NÃO VERIFICADO de mobile e breakpoints removidos. Blog e movimento seguem NÃO VERIFICADOS | |

Com os 3 ajustes acima (itens 1 a 3), nenhum texto abaixo de 24px fica sobre #76ACF5. Os conflitos da v3 estão resolvidos.

### v2 para v3 (resumo)
1. Contato em #ADD8E6.
2. Números em #00449F.
3. Placeholder #4073B7.
4. Foco com anel duplo.
5. Erro #9F1D35 e sucesso #0F6B5C em caixa branca.
6. Tipografia em `clamp()`.
7. Valores arredondados para inteiros.
8. Peso 600.
9. Pilha de fallback.
10. Espaço entre seções e largura máxima propostos.

### v1 para v2 (resumo)
1. Cores ajustadas ao painel (#00449F, #E0F2F7).
2. #004AAD fundida com a primária.
3. #6B7280 adicionada.
4. Densidade 2x confirmada.
5. Public Sans confirmada e medida.
6. Largura fixa do botão do hero removida.
7. Alvo de toque de 44px no mobile.
8. Páginas internas confirmadas como aprovadas.

## Método

- 7 capturas de página inteira com 3420px de largura (home do rascunho e 6 páginas internas), feitas em Mac Retina com zoom de 100%. 1px CSS = 2px de imagem, com janela de 1710px.
- Cores lidas pixel a pixel e confirmadas no painel do Wix.
- Tipografia medida comparando a tinta de textos conhecidos com os mesmos textos renderizados em Public Sans (precisão de ±0,5px). Os valores foram arredondados na v3.

## 1. Visão geral e princípios visuais

- **Monocromia azul:** todo texto, título, rótulo e botão primário usa #00449F. A hierarquia vem de tamanho e de fundo.
- **Blocos chapados:** painéis #FFFFFF, #76ACF5 e #ADD8E6 sobre fundo #E0F2F7, sem sombra, com raio 0.
- **Títulos leves e fechados:** Public Sans regular, caixa de frase, espaçamento de -0.04em em H1 do hero e H2.
- **Rótulos entre colchetes:** [A], [B], [01] como motivo tipográfico.
- **Calhas curtas e constantes:** 16px entre painéis, com o fundo aparecendo como linha.
- **Foto sangrada com cartão:** hero e CTA final com foto de largura total e cartão branco sobreposto no canto.
- **Um design só:** celular e tablet repetem o desktop, só em outra escala.

## 2. Cores

| Token | HEX | Papel | Onde aparece | Origem |
|---|---|---|---|---|
| `--color-primary` | #00449F | Cor principal | Botão primário, faixa de citação, anel de foco | PAINEL |
| `--color-primary-hover` | #00337A | Hover | Fundo do botão primário e cor do link no hover | AJUSTE APROVADO |
| `--color-text` | #00449F | Texto | Todos os níveis | PAINEL |
| `--color-on-primary` | #FFFFFF | Texto sobre primária | Botões primários | RASCUNHO |
| `--color-bg` | #FFFFFF | Fundo claro | Header interno, cartões, campos, menu em tela cheia | RASCUNHO |
| `--color-bg-alt` | #E0F2F7 | Fundo da página | Abaixo do hero, calhas, caixas internas | PAINEL |
| `--color-surface-strong` | #76ACF5 | Destaque | Card [A] e estatísticas alternadas. Só com texto de 24px ou mais | PAINEL, AJUSTE APROVADO |
| `--color-surface-soft` | #ADD8E6 | Painel suave | Card [B], os 2 depoimentos, botão secundário | RASCUNHO, AJUSTE APROVADO |
| `--color-footer-bg` | #ADD8E6 | Rodapé | Rodapé | RASCUNHO |
| `--color-contact-bg` | #ADD8E6 | Contato | Painel do formulário | AJUSTE APROVADO |
| `--color-number` | #00449F | Números | Estatísticas | AJUSTE APROVADO |
| `--color-placeholder` | #4073B7 | Placeholder | Campos | AJUSTE APROVADO |
| `--color-error` | #9F1D35 | Erro | Mensagem e contorno do campo | AJUSTE APROVADO |
| `--color-success` | #0F6B5C | Sucesso | Mensagem | AJUSTE APROVADO |
| `--color-feedback-bg` | #FFFFFF | Caixa de mensagem | Erro e sucesso | AJUSTE APROVADO |
| `--color-neutral` | #6B7280 | Neutra do tema | Sem uso observado | PAINEL |
| `--color-icon-social` | #000000 | Ícones sociais | Rodapé | RASCUNHO |
| (fora dos tokens) | #A3D0F5 | Cor do tema | Não é mais o placeholder | PAINEL |
| `--color-border` | NÃO VERIFICADO | Linhas finas | Linha sob o H1 display, contorno de card de produto | Linhas finas perdem a cor na captura |

### Contraste (WCAG 2.x AA, cores finais)
| Texto / fundo | Razão | Resultado | Uso |
|---|---|---|---|
| #00449F / #FFFFFF | 9,02:1 | AA | Texto em branco, números, secundário no hover |
| #00449F / #E0F2F7 | 7,83:1 | AA | Texto sobre o fundo |
| #00449F / #ADD8E6 | 5,90:1 | AA | Card [B], depoimentos, contato, rodapé |
| #00449F / #76ACF5 | 3,86:1 | AA para 24px ou mais | Card [A] e estatísticas (todo texto com 24px ou mais) |
| #FFFFFF / #00449F | 9,02:1 | AA | Botão primário |
| #FFFFFF / #00337A | 11,97:1 | AA | Botão primário no hover |
| #00337A / #FFFFFF | 11,97:1 | AA | Link no hover sobre branco |
| #00337A / #E0F2F7 | 10,38:1 | AA | Link no hover sobre o fundo |
| #00337A / #ADD8E6 | 7,83:1 | AA | Link no hover no rodapé |
| #4073B7 / #FFFFFF | 4,82:1 | AA | Placeholder |
| #9F1D35 / #FFFFFF | 7,77:1 | AA | Erro |
| #0F6B5C / #FFFFFF | 6,41:1 | AA | Sucesso |
| #6B7280 / #FFFFFF | 4,83:1 | AA | Sem uso |
| #000000 / #ADD8E6 | 13,74:1 | AA | Ícones sociais |
| Anel #00449F / #E0F2F7, #ADD8E6, #76ACF5 | 7,83 · 5,90 · 3,86 | Passa 3:1 | Foco |
| Anel interno #FFFFFF / #00449F | 9,02:1 | Passa 3:1 | Foco no botão primário |

## 3. Tipografia

- **Família:** Public Sans (PAINEL). Google Fonts, nome exato "Public Sans".
- **Importação:** `https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600&display=swap`
- **Pilha:** `"Public Sans", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. A pilha de fallback é PROPOSTA.
- **Pesos:** 400 regular (estimado nos prints). 600 negrito (PROPOSTA: prints do post do blog não recebidos).
- **Caixa:** frase em todos os níveis. **Cor:** `--color-text`.
- O valor em vw é o máximo ÷ 17,1: o máximo é atingido em 1710px e o mínimo vale no celular. Os mínimos são AJUSTE APROVADO PELA DESIGNER.

| Nível | Token | Valor | Entrelinha | Espaçamento | Onde |
|---|---|---|---|---|---|
| Display | `--font-size-display` | clamp(56px, 11.58vw, 198px) | NÃO VERIFICADO | 0 | H1 de página interna (TEMPLATE) |
| H1 | `--font-size-h1` | clamp(40px, 5.44vw, 93px) | 0.9 (hero) | -0.04em (hero), 0 (página) | Hero, título de página, números |
| H2 | `--font-size-h2` | clamp(32px, 2.81vw, 48px) | 1.05 | -0.04em | Títulos de seção |
| H3 | `--font-size-h3` | clamp(24px, 2.11vw, 36px) | NÃO VERIFICADO | -0.025em | Título de card, links do menu em tela cheia |
| Texto extra grande | `--font-size-text-xl` | clamp(24px, 1.75vw, 30px) | 1.05 | 0 | Texto dos cards [A]/[B], citação |
| Texto grande | `--font-size-text-lg` | clamp(18px, 1.40vw, 24px) | 1.4 | 0 | Cartão do hero; rótulo e frase do card [A] e legendas de estatística (fixos em 24px, ver 8.3 e 8.4) |
| Texto | `--font-size-text` | clamp(16px, 1.17vw, 20px) | 1.4 | 0 | Parágrafo, menu, botão, legenda, rodapé |
| Pequeno | `--font-size-small` | clamp(14px, 0.94vw, 16px) | NÃO VERIFICADO | 0 | Rótulo de campo, botão de envio |

**Regra do #76ACF5:** todo texto sobre essa cor precisa ter pelo menos 24px em qualquer tela. Por isso o rótulo e a frase do card [A] e as legendas das estatísticas usam **24px fixos**, e não o clamp de `--font-size-text-lg`, que desce a 18px. O texto do card usa `--font-size-text-xl`, cujo mínimo já é 24px. Números e H3 já têm 24px ou mais.

### 3.2 Medido x token final
| Item | Medido (1710px) | Final |
|---|---|---|
| Display · H1 | 198 · 93 | 198 · 93 |
| H2 · H3 | 47.5 · 36.5 | 48 · 36 |
| Texto extra grande · grande · texto · pequeno | 29.5 · 23.5 · 20 · 14.9 a 15.7 | 30 · 24 · 20 · 16 |
| Espaçamento H1/H2 · H3 | -0.044em · -0.026em | -0.04em · -0.025em |
| Entrelinhas | 0.9 · 1.03 a 1.06 · 1.4 a 1.43 | 0.9 · 1.05 · 1.4 |
| Calha de logos · padding do cartão · espaço entre botões | 10.5 · 20.5 · 19.5 | 8 · 20 · 20 |
| Padding x do botão · altura do botão · CTA do header | 26 · 55.5 · 54.5 | 24 · 56 · 56 |
| Botão de envio · campo · área de texto | 41 · 33 · 70.5 | 40 · 32 · 72 |

## 4. Espaçamento, grid e breakpoints

### Tokens
| Token | Valor | Origem |
|---|---|---|
| `--space-8` a `--space-32` | 8, 16, 20, 24, 32px | Medido e arredondado |
| `--space-64`, `--space-96` | 64, 96px | PROPOSTA |
| `--page-margin` | clamp(16px, 1.87vw, 32px) | Máximo medido, mínimo AJUSTE APROVADO |
| `--gutter` | 16px | Medido |
| `--card-padding` | 20px | Medido |
| `--panel-padding` | 24px | Medido |
| `--section-space` | clamp(64px, 5.61vw, 96px) | Valores PROPOSTA, escala fluida aprovada |
| `--content-max` | 1648px | PROPOSTA |

### Breakpoints (AJUSTE APROVADO PELA DESIGNER)
| Faixa | Largura | Media query |
|---|---|---|
| Celular | até 767px | `@media (max-width: 767px)` |
| Tablet | 768px a 1023px | `@media (min-width: 768px) and (max-width: 1023px)` |
| Desktop | 1024px ou mais | `@media (min-width: 1024px)` |

Propriedades CSS customizadas não funcionam dentro de `@media`. Por isso os breakpoints ficam como comentário no `tokens.css` e em `_meta.breakpoints` no `tokens.json`.

### O que muda entre telas (AJUSTE APROVADO PELA DESIGNER)
É o mesmo design em todas as telas: mesma ordem de seções, mesmas cores, mesmo estilo, nenhum conteúdo escondido. Só três coisas mudam:
1. **Tamanhos:** tipografia, margem lateral e espaço entre seções, pelos `clamp()`.
2. **Colunas das grades:** conforme a tabela da seção 9.
3. **Controles no celular:** `min-height: var(--control-min-height-mobile)` (44px) em botões, campos e itens de menu.

## 5. Forma e profundidade

- `--radius: 0`, medido no cartão do hero. Painéis, cards e botões com cantos retos.
- Raio de fotos de equipe e de produto: NÃO VERIFICADO (parecem levemente arredondados).
- `--shadow: none`: nenhuma sombra observada. Nenhum véu de cor sobre as fotos.
- Bordas: linha fina sob o H1 display e contorno de card de produto. Cor e espessura: NÃO VERIFICADO.

## 6. Iconografia

- Ícones sociais preenchidos em #000000. Tamanho e biblioteca: NÃO VERIFICADO. Trocar pelas redes reais da ABTE.
- Sacola do carrinho em contorno, com contador, em #00449F. **Não usar enquanto o pagamento estiver desativado.**
- Ícone de hambúrguer abaixo de 1024px, em #00449F, com área de toque de 44x44px no mínimo. O desenho do ícone não foi medido no template.
- As setas de rolagem do menu são comportamento do Wix e não viram componente.

## 7. Imagens

| Uso | Proporção | Tratamento |
|---|---|---|
| Hero | ~1,18:1 em 1710px, largura total | Sangrada, sem cantos, sem véu |
| Foto da seção de números | ~1:1 | Ao lado da grade 2x2 no desktop, acima dela no tablet e no celular |
| Card de logo | ~1,04:1 | Fundo branco, logo centralizado |
| Colagem de depoimentos | Mista | Alterna foto e citação |
| Foto de equipe | Retrato | Fundo cinza de estúdio, botão sobreposto no canto inferior esquerdo |
| Produto | Retrato (vitrine), paisagem (grade) | Imagem no topo do card |

Estilo fotográfico: luz natural e difusa, paleta quente e neutra que contrasta com os azuis, ambientes domésticos e clínicos reais, pessoas em ação cotidiana. As fotos do template não fazem parte do sistema. Alt text descritivo em português em todas as imagens.

## 8. Componentes

### 8.1 Header
- **Desktop (1024px ou mais):** logo à esquerda, menu em `--font-size-text` alinhado à direita, CTA primário na ponta. Home: transparente sobre o hero. Internas: `--color-bg`.
- **Abaixo de 1024px (AJUSTE APROVADO):** logo à esquerda, ícone de hambúrguer à direita (44x44px no mínimo).
- **Menu em tela cheia (AJUSTE APROVADO):** usa os mesmos tokens. Fundo `--color-bg`, margem `--page-margin`, links em `--font-size-h3` com 44px de altura mínima, CTA primário no fim e botão de fechar no mesmo lugar do hambúrguer. Com o menu aberto, o foco fica preso nele, e a tecla Esc fecha.
- **Header ao rolar a página:** o comportamento do Wix não foi medido. O código novo mantém o header visível no topo (PROPOSTA).

### 8.2 Botões
| Variante | Padrão | Hover (AJUSTE APROVADO) | Foco (AJUSTE APROVADO) |
|---|---|---|---|
| Primário | Fundo `--color-primary`, texto `--color-on-primary` | Fundo `--color-primary-hover` (11,97:1) | `box-shadow: var(--focus-ring)` |
| Secundário | Fundo `--color-surface-soft`, texto `--color-text` | Fundo `--color-bg`, texto `--color-text` (9,02:1) | `--focus-ring` |
| Link | `--color-text` | Sublinhado e cor `--color-primary-hover` | `--focus-ring` |
| Envio | Como o primário, `--button-submit-height`, largura total | Como o primário | `--focus-ring` |

- **Medidas:** altura `--button-height` (56px), padding horizontal `--button-padding-x` (24px), texto `--font-size-text`, raio 0. Largura pelo conteúdo.
- **Celular:** altura mínima de 44px.
- **Estados sem definição:** ativo e desabilitado não foram medidos nem aprovados.

### 8.3 Cards de público [A] [B]
- **[A]:** fundo #76ACF5. Rótulo e frase com 24px fixos (AJUSTE APROVADO), título `--font-size-h3`, texto `--font-size-text-xl`. Nenhum texto do card fica abaixo de 24px.
- **[B]:** fundo #ADD8E6, com a mesma estrutura.
- **Estrutura:** rótulo à esquerda e frase à direita no topo; título e texto no meio; botão primário no pé. Padding `--card-padding`, calha `--gutter`.
- **Cards numerados [01] a [04]:** as páginas que os usam não foram capturadas.

### 8.4 Estatísticas
- 4 cards em xadrez, alternando #76ACF5 e #FFFFFF. Número em `--font-size-h1`, cor `--color-number`. Legendas com 24px fixos (AJUSTE APROVADO), no pé.

### 8.5 Depoimentos
- Os dois cards em #ADD8E6 (AJUSTE APROVADO para "Patient's Voice").
- Etiqueta de categoria em caixa branca no topo, citação em `--font-size-text-xl` no meio, nome e função em `--font-size-text` no pé.

### 8.6 Faixa de logos
- H2 e 6 cards brancos, calha `--space-8`. Só com logos reais e autorizados.

### 8.7 Hero e CTA final
- **Hero:** H1 com `--leading-tight` e `--tracking-heading` sobre a foto, no topo à esquerda. Cartão branco com `--card-padding` no canto inferior esquerdo: texto `--font-size-text-lg` e 2 botões separados por `--space-20`.
- **CTA final:** cartão no canto superior esquerdo.
- **Celular:** o cartão ocupa a largura total menos `--page-margin`, ainda sobre a foto.

### 8.8 Formulário de contato
- **Painel:** `--color-contact-bg`, padding `--panel-padding`.
- **Campos:** rótulo `--font-size-small` em #00449F (5,90:1). Campo branco sem borda, com `--input-height` no desktop e 44px no celular. Placeholder `--color-placeholder`. Área de texto `--textarea-height`.
- **Foco:** `--focus-ring`.
- **Erro (AJUSTE APROVADO):** mensagem em `--color-error`, em caixa `--color-feedback-bg`, abaixo do campo. Campo com contorno em `--color-error`, com espessura PROPOSTA de 2px.
- **Sucesso (AJUSTE APROVADO):** mensagem em `--color-success`, em caixa `--color-feedback-bg`, no lugar do botão.
- **LGPD:** caixa de consentimento com 44px de área de toque no celular.

### 8.9 Rodapé
- Painel `--color-footer-bg`. Colunas de links (`--font-size-text`) no topo, contato e ícones no meio, logo e copyright no pé.
- Títulos de coluna em `--font-weight-bold` (PROPOSTA).

### 8.10 Componentes de páginas internas (TEMPLATE, aprovadas)
- **Card de texto chapado:** fundo #E0F2F7, com título, texto e botão (vagas).
- **Card de equipe:** nome e cargo acima da foto, botão sobreposto na foto.
- **Coluna com linha superior:** certificações.
- **Faixa de citação escura:** fundo #00449F, texto branco, rótulo com marcador circular.
- **Lista de itens:** linhas #E0F2F7, com título e data à esquerda e texto à direita.

### 8.11 Blog
NÃO VERIFICADO: os prints da lista e do post não chegaram. Pela estrutura já levantada: lista em coluna única com título, resumo, autor, data e tempo de leitura; post com H1, autor, data, corpo com H2/H3 reais, referências, posts recentes e comentários. Ficam pendentes a largura da coluna de texto e a hierarquia visual do corpo.

## 9. Padrões de seção

Mesma ordem, cores e conteúdo em todas as telas (AJUSTE APROVADO PELA DESIGNER). O número de colunas por faixa abaixo é PROPOSTA de aplicação da decisão; confirmar com a designer.

| Padrão | Desktop (1024px ou mais) | Tablet (768 a 1023) | Celular (até 767) |
|---|---|---|---|
| Hero | Foto sangrada, H1 sobre a foto, cartão no canto | Igual | Igual, cartão na largura total |
| Faixa de logos | 6 colunas | 3 colunas | 2 colunas |
| Afirmação (H2 e parágrafo) | 2 colunas | 2 colunas | 1 coluna |
| Cards de público [A] [B] | 2 colunas | 2 colunas | 1 coluna |
| Números | Foto e grade 2x2 lado a lado | Foto acima, grade 2x2 | Foto acima, grade 2x2 |
| Depoimentos | 3 colunas | 2 colunas | 1 coluna |
| Quem somos | 2 colunas | 2 colunas | 1 coluna |
| CTA final | Foto e cartão | Igual | Igual, cartão na largura total |
| Contato e rodapé | 2 colunas | 2 colunas | 1 coluna (contato acima) |
| Cabeçalho de página interna | H1 em caixa #E0F2F7, ou display com linha | Igual | Igual |
| Cards de 2 colunas (vagas) | 2 | 2 | 1 |
| Cards de 3 colunas (equipe, certificações, produtos) | 3 | 2 | 1 |
| Vitrine da loja | 4 visíveis, rolável | 2 visíveis, rolável | 1 visível e parte do seguinte, rolável |
| Lista de itens (About) | Título à esquerda, texto à direita | Igual | Empilhado |

Entre seções: `--section-space`. Margem lateral: `--page-margin`. Calha: `--gutter` em todas as telas.

### Mapa de páginas
| Página | Seções, na ordem |
|---|---|
| Início | Hero, público, números, quem somos, blog (3 posts), loja, encontre um profissional, depoimentos (se houver), CTA, contato, rodapé |
| Sobre | Cabeçalho, história e missão, linha do tempo, ações sociais, diretoria, CTA |
| Profissionais | Cabeçalho, categorias (membros e parceiros), filtros, grade de cards |
| Blog, artigos, loja | Cabeçalho, filtros, grade |
| Seja associado, contato | Cabeçalho, conteúdo, formulário |
| Doe | Cabeçalho, conteúdo, doação por Pix (valores, QR code, copiar código) |

## 10. Movimento

NÃO VERIFICADO: os prints são estáticos. Recomendação para o código: respeitar `prefers-reduced-motion`.

## 11. Componentes derivados (PROPOSTA, NÃO EXTRAÍDO DO DESIGN APROVADO)

Montados só com os tokens. Todos usam `--focus-ring`, têm 44px de altura mínima no celular e mostram erro e sucesso em caixa branca.

- **Filtros do diretório:** campos brancos (nome, estado, cidade, método) e caixa "Telerreabilitação" sobre #E0F2F7. No celular, 1 coluna.
- **Seletor de estado:** lista de botões, com o selecionado em #00449F e os demais em #ADD8E6. Inclui Paraguai e Bolívia. Mapa interativo opcional por cima.
- **Card de profissional:** fundo branco, foto 1:1, rótulo de categoria, nome em `--font-size-text-xl`, registro, etiquetas de método em #ADD8E6, cidade/UF, WhatsApp (primário) e e-mail (secundário).
- **Card de artigo:** fundo #E0F2F7, rótulo [01], título em texto, descrição, botões "Artigo completo (PDF)" e "Resumo (CAT)".
- **Card de post:** capa ~1,8:1, título, resumo, autor, data e tempo de leitura.
- **Produto:** card com imagem 3:4, selo em #00449F e preço riscado. Página com H1 e preço. Enquanto o pagamento estiver desativado, no lugar de quantidade e "Adicionar ao carrinho" fica um aviso "Em breve" em caixa #E0F2F7 com texto `--font-size-text`.
- **Carrinho e checkout:** DESATIVADO. Quando o pagamento for ativado (Stripe): resumo em #ADD8E6, cupom, frete, total.
- **Doação por Pix:** valores de R$25, R$50, R$100 e "Outro valor", em botões de 56px (selecionado em #00449F, demais em #ADD8E6, como o seletor de estado). Abaixo, painel branco com o QR code do valor escolhido, nome do titular, botão primário "Copiar código Pix" e mensagem de sucesso "Código copiado" em caixa branca. Sem campo "Doação em nome de" e sem dados do doador.
- **Estados vazio e carregando:** não definidos.

## 12. Tokens

Ver `tokens.css` e `tokens.json`, versão 3.1. Tamanhos de fonte só em `clamp()`. Todos os valores em px são inteiros. Os coeficientes em vw têm 2 casas porque são proporções.

## 13. Itens NÃO VERIFICADOS

| Item | O que falta |
|---|---|
| Blog (lista e post) e peso real do negrito | Prints da lista e do post |
| Movimento | Script `extrair-tokens.js` ou vídeo de tela |
| Cor e espessura de bordas | Script |
| Raio de fotos de equipe e de produto | Script |
| Entrelinha de display, H3 e pequeno | Script |
| Ícones (biblioteca e tamanho) | DevTools |
| Cards numerados, linha do tempo, For Providers | Prints dessas páginas |
| Ativo e desabilitado dos botões | Prints ou decisão da designer |

Ainda em PROPOSTA:
- Pilha de fallback.
- Peso 600.
- `--space-64` e `--space-96`.
- `--content-max`.
- Valores de `--section-space`.
- Colunas por faixa (seção 9).
- Header visível no topo ao rolar a página.
- Contorno de 2px no campo com erro.
- Componentes derivados (seção 11).
