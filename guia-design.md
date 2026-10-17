# Instruções de Frontend — Money Marques (Cyber Finance)

> Este arquivo orienta o Claude Code na criação de telas e componentes de frontend. Siga o Design System v1 abaixo como fonte única de verdade. Em caso de conflito entre uma preferência pessoal e este documento, este documento prevalece.

---

## 1. Regras gerais

- Tema escuro é o padrão. Não criar tema claro, salvo pedido explícito.
- Estética futurista (cyberpunk/cripto) com acentos neon **controlados**. A legibilidade de valores, gráficos e movimentações financeiras vem antes do efeito visual.
- Nunca usar cores, tamanhos ou espaçamentos fora dos tokens definidos aqui. Se faltar um token, propor a adição em vez de inventar um valor solto.
- Todo valor visual deve vir de variáveis CSS / tokens do tema (nunca hex ou px "soltos" nos componentes).
- Mobile-first: construir primeiro a versão mobile e expandir para telas maiores.

---

## 2. Tokens de cor

Definir como variáveis CSS em `:root` (ou no tema do framework utilizado).

| Token | Valor | Uso |
|---|---|---|
| `--color-primary` | `#7C3AED` | Ações principais (violeta elétrico) |
| `--color-primary-hover` | `#6D28D9` | Hover do primário |
| `--color-bg` | `#0A0A12` | Fundo da aplicação |
| `--color-surface` | `#121826` | Superfície padrão (cards, painéis) |
| `--color-surface-secondary` | `#1A2235` | Superfície elevada / aninhada |
| `--color-text-primary` | `#F5F7FF` | Texto principal |
| `--color-text-secondary` | `#A7B0C5` | Texto secundário/auxiliar |
| `--color-positive` | `#00E6A8` | Valores positivos, sucesso |
| `--color-warning` | `#FFB020` | Atenção, pendências |
| `--color-negative` | `#FF5A7A` | Valores negativos, erro, vencidos |
| `--color-info` | `#3BA7FF` | Informação |
| `--color-secondary-neon` | `#22D3EE` | Ciano — destaques secundários |
| `--color-accent` | `#FF2DA6` | Magenta — acento pontual |
| `--color-accent-violet` | `#6D5DF6` | Acento violeta complementar |
| `--color-border` | `#29334A` | Bordas |
| `--color-focus-ring` | `#22D3EE` | Anel de foco |

**Regras de uso**
- Camadas de superfície: `bg` → `surface` → `surface-secondary` (mais elevado = mais claro).
- Acentos neon (ciano, magenta) usar com parcimônia: detalhes, ícones, estados de foco, gráficos. Nunca em grandes áreas.
- Positivo/Atenção/Negativo são **semânticos**: não usar para decoração.
- **Não comunicar estado apenas por cor**: sempre combinar com ícone, sinal (+/−) ou texto.

---

## 3. Tipografia

- **Interface:** Inter (dashboards, formulários, tabelas, texto corrido).
- **Marca e títulos especiais:** Space Grotesk.

| Elemento | Desktop | Mobile |
|---|---|---|
| Título de página | 28 px | 24 px |
| Título de seção | 20 px | 18 px |
| Título de card | 16 px | 16 px |
| Valor principal de KPI | 28 px | 24 px |
| Texto padrão | 14–16 px | 14–16 px |
| Texto auxiliar | 12–13 px | 12–13 px |

**Valores monetários**
- Usar numerais tabulares: `font-variant-numeric: tabular-nums;`
- Formato brasileiro obrigatório: `R$ 1.250,00` (usar `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`).
- Alinhar valores à direita em tabelas e listas.

---

## 4. Espaçamento (escala de 4 px)

| Token | Valor | Aplicação |
|---|---|---|
| `--space-1` | 4 px | Ícones e textos próximos |
| `--space-2` | 8 px | Elementos internos |
| `--space-3` | 12 px | Campos e pequenas separações |
| `--space-4` | 16 px | Espaçamento padrão |
| `--space-6` | 24 px | Padding de cards |
| `--space-8` | 32 px | Separação entre seções |

Usar apenas múltiplos de 4 px.

---

## 5. Bordas, raios e efeitos

| Elemento | Raio |
|---|---|
| Inputs e botões | 8 px |
| Cards | 12 px |
| Modais | 16 px |

- Bordas: 1 px, cor `--color-border` (azulada sutil).
- Glow moderado em ações principais e estados de foco (ex.: `box-shadow` com `--color-focus-ring` em baixa opacidade). Evitar glow forte ou em excesso, que prejudica a leitura.
- Foco visível sempre: anel em `--color-focus-ring`.

---

## 6. Componentes fundamentais

A biblioteca deve conter, e as telas devem reutilizar (nunca recriar inline):

- Botões (primário, secundário, destrutivo, ghost; estados: hover, focus, disabled, loading)
- Campos de formulário (com label, ajuda e mensagem de erro)
- Seletores de data
- Cards
- Tabelas
- Gráficos
- Modais
- Notificações (toasts)
- Estados vazios
- Indicadores de carregamento (skeletons e spinners)

**Regra:** antes de criar um componente novo, verificar se já existe um equivalente e reutilizá-lo. Novos componentes devem seguir os tokens deste documento e cobrir todos os estados (padrão, hover, foco, desabilitado, carregando, erro, vazio).

---

## 7. Responsividade e navegação

| Dispositivo | Largura | Navegação |
|---|---|---|
| Mobile | até 639 px | Barra inferior |
| Tablet | 640–1023 px | Menu compacto |
| Desktop | 1024–1439 px | Sidebar |
| Desktop amplo | ≥ 1440 px | Sidebar + conteúdo expandido |

**Mobile**
- Formulários ocupam praticamente toda a largura disponível.
- Cards em coluna única.
- Tabelas viram listas de movimentações.
- Áreas de toque mínimas de **44 × 44 px** nas ações principais.

---

## 8. Padrões específicos de aplicação financeira

- **Privacidade:** botão para ocultar/exibir valores financeiros. Quando ocultos, mascarar todos os valores da tela (ex.: `R$ ••••`), inclusive em gráficos e totais.
- **Visão familiar:** seletor claro e sempre visível indicando se a consulta é de finanças **pessoais** ou **compartilhadas**.
- **Datas:** formato `DD/MM/AAAA`. Sempre indicar o período de referência em gráficos e KPIs.
- **Valores:** diferenciar visualmente **realizado**, **previsto**, **pendente** e **vencido** (cor semântica + rótulo/ícone).
- **Confirmações:** exigir confirmação explícita antes de excluir lançamentos ou remover integrantes (modal com descrição do que será afetado).
- **Feedback:** criar, editar e pagar uma conta devem ter estados de **carregamento, sucesso e erro**.

---

## 9. Acessibilidade (WCAG 2.2 AA)

- Navegação completa por teclado, com ordem de foco lógica.
- Indicador de foco sempre visível.
- Mensagens de erro descritivas (dizer o que houve e como corrigir), associadas ao campo via `aria-describedby`.
- Contraste mínimo AA (4.5:1 para texto comum, 3:1 para texto grande e componentes de UI). Verificar especialmente texto secundário e acentos neon sobre superfícies escuras.
- Não depender só de cor para transmitir significado.
- Semântica HTML correta (`button`, `nav`, `main`, `label`, `table` etc.), e `aria-*` apenas quando necessário.
- Respeitar `prefers-reduced-motion` em animações e glows animados.

---

## 10. Checklist antes de entregar qualquer tela

- [ ] Usa apenas tokens de cor, espaçamento, raio e tipografia deste documento
- [ ] Funciona em mobile, tablet e desktop, com a navegação correta para cada breakpoint
- [ ] Áreas de toque ≥ 44 × 44 px
- [ ] Valores em `R$ 0.000,00`, numerais tabulares, datas `DD/MM/AAAA`
- [ ] Período de referência exibido em gráficos e KPIs
- [ ] Botão de ocultar valores e seletor pessoal/compartilhado presentes quando aplicável
- [ ] Estados de carregamento, vazio, sucesso e erro implementados
- [ ] Confirmação em ações destrutivas
- [ ] Foco visível, navegação por teclado e contraste AA validados
- [ ] Nenhum componente duplicado: reutilizou a biblioteca existente
