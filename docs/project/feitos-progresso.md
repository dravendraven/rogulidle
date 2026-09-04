# Feitos com barra de progresso

Estudo escrito antes do código (2026-09-04), a partir da observação do dono:

> Os objetivos são alcançados quando estou dormindo ou não estou olhando.
> Vira uma surpresa de acordar e já ter conquistado — sem senso de
> conquista nem de progresso, e eu sequer sei quando foi.

A ideia: cada feito ainda não conquistado mostra **o melhor que alguma run já
chegou perto dele**. Conquistado, a barra some e a linha volta ao que é hoje.

| feito | o que a barra mostra | a run "recorde" é |
|---|---|---|
| 🐷 Açougue fechado | o menor hp em que o Butcher já ficou | a que mais o machucou |
| 🪓 Lenhador | o máximo de moedas que uma run já bancou, contra o preço do machado | a que mais pagou |
| 🕳️ Fundo do poço | o andar mais fundo já alcançado, de dez | a que foi mais longe |

## 1. A ideia contra os documentos

**`objectives.md` pede exatamente isto.** Três frases dele descrevem a barra
sem a nomear:

- *"A sitting is judged on the distribution of how far attempts get"* — a
  faixa de histórico mostra a distribuição dos últimos doze; a barra mostra a
  ponta dela, a que não cai do fim da faixa.
- *"Medium objectives — completed, they pay in NEW WAYS to reach the long
  one, making it nearer and more tangible"* — o porco a 10% de vida é o
  objetivo médio ficando tangível antes de ser completado.
- *"Hope can be low, but it has to exist"* — uma run que deixou o porco com
  duas vidas é a prova, guardada, de que ele cai.

**O que a barra NÃO resolve, e é bom dizer:** o dono acorda e o feito já
está lá. Isso é o jogo funcionando como foi desenhado — *"the player is
absent; the game runs alone"*. A barra não devolve o momento perdido; ela
faz o que veio antes dele ser visível, para que a conquista tenha uma
história em vez de aparecer do nada.

**Onde a ideia roça nos princípios, e como não roçar:**

1. *"A threshold is not a scoreboard."* Uma barra é a forma visual de uma
   quantidade a empurrar. A defesa: cada barra mede a distância a um limiar
   FIXO que já existe (o porco morto, doze moedas, o andar dez) e **desaparece
   quando o limiar é cruzado**. Não é um número aberto. O que não pode
   acontecer é criar um feito novo porque "daria uma barra bonita" — o
   cabeçalho de `achievements.js` já recusa a lista que cresce sozinha.
2. **O número da run na conquista foi apagado de propósito**
   (`decisions.md`, "The achievement that looked like a lie"): `runNumber`
   recomeçava a cada reload e o feito dizia "run 3" apontando para a run 3 de
   outra sessão. **A premissa mudou**: a sessão agora persiste (`rules.md`
   §9 — número da run, histórico e cadeia de seeds voltam como estavam) e o
   único botão que zera a contagem apaga os feitos junto. Reintroduzir o
   número é possível hoje, mas é um passo à parte, com a entrada de
   `decisions.md` atualizada dizendo por que a objeção caiu — e é decisão do
   dono, não desta sessão.
3. **A regra do canal do bot** (`CLAUDE.md`): tudo aqui lê o RESULTADO de uma
   run terminada, na página. Nada chega ao bot; nada muda o que uma run faz.
4. **O dono acabou de tirar a linha da data** dos cartões porque uma terceira
   linha era um quinto da altura de uma fila que fica em cima do tabuleiro
   (commit e8c533c). A barra **não pode ser uma terceira linha**: ela é o
   preenchimento do fundo do cartão, e o número vai no lugar da frase
   `locked`, que hoje é estática ("o porco ainda está de pé").

## 2. O que já existe e o que falta

- **Profundidade e moedas já estão guardadas.** `highscores.js` mantém, por
  herói, `bestDepth` e `maxCoins` — este último é a mesma soma que
  `coinsBanked` em `achievements.js` verifica para o Lenhador. As duas barras
  se **derivam** do máximo entre os heróis; nenhum estado novo.
- **O hp do Butcher não sobrevive à run.** A linha de roster que
  `dungeon.js` grava no resultado carrega `hp: m.hpMax` — a vida CHEIA, para
  ler xp e tamanho sem regenerar o andar. A vida que sobrou não está em
  lugar nenhum. Falta UM campo (`hpLeft`) nessa linha: um registro, não uma
  regra — sem rng, sem decisão, o hash da run não muda.
- **Progresso não precisa de recibo.** Os feitos guardam `{seed, config}` e
  reverificam no load porque **destravam um herói**; um recorde de hp não
  destrava nada, então é um número guardado como os highscores são. Quem
  forjar um porco a 1 hp no console ganha um desenho.
- **O reset já cobre.** O botão que apaga os feitos apaga os highscores; o
  recorde do porco vai na mesma fatia dos feitos e cai com ela. A
  sincronização (`save-worker.js`) leva o documento inteiro — nada a fazer
  no servidor.

## 3. Plano — quatro tarefas pequenas, cada uma verificável

**T1 · O resultado da run passa a dizer com quanta vida o porco ficou.**
`src/sim/dungeon.js`: a linha de roster ganha `hpLeft: m.hp`. Um teste em
`test/tests.js`: numa run que lutou com o Butcher e não o matou, a linha
`vault` do andar 4 tem `0 < hpLeft < hp`; numa que o matou, `hpLeft === 0`.
*Verificar:* `node tools/measure.mjs test/tests.js runAll` passa.

**T2 · O recorde do porco fica guardado.** Em `achievements.js`,
`recordProgress(runResult)`: se a run passou pelo andar do cofre, guarda o
menor `hpLeft` do Butcher já visto (com `hpMax`, para a fração) sob uma
chave reservada da fatia `achievements`, nunca subindo. `spectator.js` chama
depois de `earnedBy`, no mesmo ponto em que chama `recordRun`. Teste: uma
run pior não sobrescreve uma melhor; um porco morto não vira recorde (o
feito já cobre). *Verificar:* devtools mostra o recorde após uma run que
chegou ao andar 4.

**T3 · A barra aparece.** `renderAchievements` recebe o progresso e, no
cartão trancado, pinta o fundo até a fração e troca a frase `locked` pelo
estado: "porco a 2 ♥ de 12", "melhor run: 9 moedas de 12", "andar 7 de 10".
Sem progresso nenhum (nunca chegou ao andar 4, nunca bancou moeda), a frase
`locked` de hoje fica. CSS em `style.css`: um `::before` com `width` em
porcentagem, altura do cartão inalterada. As frações de Lenhador e Fundo do
poço vêm de `getHighscores()` (máximo entre heróis, `AXE_PRICE` e `LEVELS`
como denominador). *Verificar:* screenshot dos três cartões trancados com
barra, e dos conquistados idênticos aos de hoje.

**T4 · O documento acompanha.** `rules.md` §9, onde diz que os feitos
persistem: uma frase dizendo que o melhor aproximação a cada um persiste
junto e é só mostrador. Vai no mesmo commit de T2/T3, como manda o
`CLAUDE.md`.

**T5 (decisão do dono) · "conquistado na run N".** Guardar `run:
session.runNumber` no recibo de novo e mostrá-lo no cartão conquistado, com
a entrada de `decisions.md` ganhando um parágrafo: a objeção era o contador
por reload, e ele não existe mais. Risco específico: uma sessão aberta com
`?seed=` não grava (`rules.md` §9) e carrega uma contagem que não é a do
jogador — o cartão precisa omitir o número quando `session.persist` é
falso.

## 4. O que fica em aberto para quem assistir

- **A barra pode ficar parada por dias.** Ela só anda quando uma run fez
  melhor que todas as anteriores, e no começo isso é frequente; depois de
  um porco a 2 hp, pode não andar mais até ele cair. Isso é honesto — é o
  que "raro o bastante para importar" parece de perto — mas é o oposto da
  barra de jogo idle que enche sozinha, e o dono pode achar que ela
  "quebrou". Se incomodar, a resposta não é fazer a barra mentir.
- **Quatro cartões por herói não cabem.** As frações são o melhor ENTRE
  heróis, de propósito: o feito é do jogador, não do herói. Quem quiser
  saber qual herói chegou mais fundo tem o painel de highscores.
