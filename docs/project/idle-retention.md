# Retenção de longo prazo em idle games — estudo

Pesquisa online (ago/2026) sobre o que faz jogadores de idle/incremental games
ficarem por meses. Registra fundamentos do gênero, não números — números de
tuning vivem em `balance.md`.

## Os cinco fundamentos

### 1. Dois loops, e o meta loop é o que retém

O core loop (recurso entra, número sobe) prende nos primeiros minutos; o que
sustenta meses é o **meta loop** — camadas de mecânicas que interagem e são
introduzidas aos poucos. O core pode ser simples para sempre; o meta é onde a
complexidade mora. Jogos que só têm o core viram "número subindo" e morrem no
mid-game.

### 2. Progresso perceptível contra a baseline atual

O crescimento precisa ser **exponencial em tudo** (produção e custo) porque a
percepção humana é relativa: +10 só emociona enquanto a base é 100. O
equilíbrio clássico: custo cresce mais rápido que produção, então toda run
desacelera — e a desaceleração deve ser gradual, nunca uma parede. Progresso
que *para* é o motivo nº 1 de churn citado em toda fonte.

### 3. Prestige: reset voluntário com ganho permanente

Quando a run atual rende pouco, o jogador zera em troca de um bônus
permanente — e o early game, antes lento, voa. Dois papéis: (a) sensação de
"escada" — cada ciclo recomeça mais forte; (b) controla a explosão dos
números. É O mecanismo canônico de retenção mensal do gênero: transforma o
fim de jogo em recomeço.

### 4. Recompensar a ausência

O jogador deve ser recompensado **pelo tempo que não joga** tanto quanto pelo
que joga: progresso offline, algo acumulado esperando na volta. O anti-padrão
é voltar e encontrar "parede de números estáticos ou ganhos escondidos" — a
volta precisa ter um momento visível de colheita/novidade. Vários "relógios"
com períodos diferentes atendem perfis diferentes (quem abre a cada 15 min e
quem abre por semana, ambos sentindo progresso).

### 5. Unfolding: o jogo revela sistemas novos

Os idles mais amados (Universal Paperclips, Kittens Game) são "unfolding
games": mecânicas inteiras aparecem com o progresso, e mecânicas antigas
ganham torções. A surpresa estrutural — "o jogo virou outra coisa" — é o que
substitui conteúdo infinito. O oposto: exigir a mesma atividade da primeira
sessão para sempre é tédio garantido.

## Por que jogadores saem (espelho dos cinco)

- Progresso estagnou de verdade (parede, não rampa).
- Nada novo no mid-game: sem unlock, sem mecânica, sem meta visível à frente.
- Voltou e não viu o que ganhou.
- Sem metas de curto E longo prazo simultâneas — o esforço perde âncora.
- Monetização agressiva (não se aplica aqui, mas as fontes são unânimes:
  retenção > monetização até no faturamento).

## Leitura para o rogulidle — contra o inferno e o highscore (U11)

A comparação certa não é contra o jogo construído, é contra o jogo
DESENHADO: U11 em `candidates.md` (inferno, seed diário compartilhado,
scoreboard de profundidade, moeda infernal, unlocks por chefe). Lido contra
os cinco fundamentos, U11 já responde a maioria — por caminhos próprios:

- **Meta loop — U11 É o meta loop, escolhido e nomeado como tal.** Farmar
  1–10, converter ouro em moeda infernal, apostar a descida, destravar
  itens situacionais, competir no seed do dia: camadas que interagem em
  cima de um core intocado. A lacuna não é de design, é que nada disso
  existe em código.
- **Progresso perceptível — resolvido com o sinal invertido.** O gênero
  mede progresso em números que sobem; U11 mede em *perder mais fundo*. O
  Balrog inalcançável é o "sumidouro infinito de poder": todo ganho move a
  profundidade máxima e nada termina o jogo — exatamente a rampa sem teto
  que o fundamento pede. A tensão documentável: o gênero diz que PAREDE
  causa churn, e o inferno é feito de paredes (chefes-barreira). A defesa
  já está escrita — cada parede PAGA um unlock — mas é a aposta do design,
  não um fato: se o intervalo entre chefes render "nada novo à vista", é o
  churn de mid-game clássico.
- **Prestige — recusado de propósito, com substituto desenhado.** O estudo
  anterior chamou isso de lacuna; os docs mostram que é decisão: "perder
  mil vezes nunca pode somar uma vitória" proíbe o canal de acumulação que
  prestige é. O substituto: unlocks permanentes de poder SITUACIONAL
  (chefe → item, highscore diário → item especial) — permanência sem
  multiplicador. Estruturalmente cobre o papel do prestige (ciclos que
  recomeçam mais fortes *em opções*, não em números). O risco a nomear:
  prestige retém porque o early game *acelera* visivelmente a cada ciclo;
  poder situacional é mais sutil, e se o jogador não SENTIR a diferença na
  descida seguinte, o ciclo não fecha.
- **Recompensar a ausência — o princípio já é regra do dono.** A moeda
  não expira JUSTAMENTE porque "ausência longa volta para uma RECOMPENSA,
  não para menos" (a razão de cap-não-relógio). O que falta é o momento de
  colheita: hoje fechar a aba para o jogo; nada espera na volta. O seed
  diário dá o motivo de voltar amanhã, mas a volta em si ainda não paga
  nada visível.
- **Unfolding — é a forma exata do gate de U11.** "O jogo base não tem
  inferno": a entidade aparece depois do `bottom`, a loja se transforma
  (preços em moeda infernal, itens novos por achievement), o roster abre
  depois do `butcher`. Isso é Universal Paperclips em estrutura — o jogo
  vira outra coisa diante de quem progrediu. Primeiro degrau já construído;
  o resto é o que dá ao mid-game a surpresa estrutural que o gênero diz
  ser insubstituível.

O highscore diário cobre ainda o item "metas de curto E longo prazo": a
descida de hoje (curto), o item especial do dia (médio), o Balrog (o longo
que nunca acaba). E o formato — comparar CONFIGURAÇÕES, não habilidade — é
a tradução correta do gênero para um jogo que se joga sozinho.

**Síntese**: U11 responde 4 dos 5 fundamentos no papel; nenhum no código. A
pesquisa não pede design novo — ela diz que o design escolhido está alinhado
com o que retém, e que as duas pontas soltas são (a) o intervalo entre
chefes-barreira (parede sem novidade = churn) e (b) o momento de colheita na
volta de uma ausência, que nenhum doc desenhou ainda.

## Fontes

- Machinations — [How to design idle games](https://machinations.io/articles/idle-games-and-how-to-design-them)
- Anthony Pecorella (Kongregate) — [The Math of Idle Games I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i) e [III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)
- Eric Guan — [Idle Game Design Principles](https://ericguan.substack.com/p/idle-game-design-principles)
- Adjust — [How to make an idle game](https://www.adjust.com/blog/how-to-make-an-idle-game/)
- GameAnalytics — [10 Reasons Why Players Quit](https://www.gameanalytics.com/blog/ten-reasons-why-players-quit)
- Wikipedia — [Incremental game](https://en.wikipedia.org/wiki/Incremental_game), [Universal Paperclips](https://en.wikipedia.org/wiki/Universal_Paperclips)
