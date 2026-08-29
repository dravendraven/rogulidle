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

## Leitura para o rogulidle

O jogo já tem o core (run do bot) e um meta parcial (loja entre runs, §9 de
`rules.md` — a corrente de sessão). Contra os fundamentos:

- **Prestige não existe.** Não há ganho permanente que atravesse a morte; a
  morte zera a carteira. É a lacuna mais alinhada ao gênero — mas qualquer
  desenho passa por `decisions.md` e pelo dono antes.
- **Ausência não é recompensada.** Fechar a aba não acumula nada; não há
  "momento de colheita" na volta. Relevante se o objetivo for jogadores que
  voltam por dias, não só sessões longas.
- **Unfolding é fraco.** As mecânicas visíveis na primeira run são as mesmas
  da centésima; profundidade nova (andares, itens) existe, sistema novo não.
- **Progresso perceptível entre runs** depende hoje da pilha de itens da
  corrente — que só aparece em streaks raras (o motivo do `&hold=`).

Nenhum desses é tarefa; são as perguntas que o dono ordena no backlog.

## Fontes

- Machinations — [How to design idle games](https://machinations.io/articles/idle-games-and-how-to-design-them)
- Anthony Pecorella (Kongregate) — [The Math of Idle Games I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i) e [III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)
- Eric Guan — [Idle Game Design Principles](https://ericguan.substack.com/p/idle-game-design-principles)
- Adjust — [How to make an idle game](https://www.adjust.com/blog/how-to-make-an-idle-game/)
- GameAnalytics — [10 Reasons Why Players Quit](https://www.gameanalytics.com/blog/ten-reasons-why-players-quit)
- Wikipedia — [Incremental game](https://en.wikipedia.org/wiki/Incremental_game), [Universal Paperclips](https://en.wikipedia.org/wiki/Universal_Paperclips)
