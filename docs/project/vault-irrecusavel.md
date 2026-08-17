# O vault deixou de ser uma escolha

Medido em 2026-08-15, herói `base`, mãos vazias, dials no centro, mesmas
seeds em toda célula (`test/baseline.md`).

**O bot entra na sala do porco em 86% dos andares que a têm.** Nenhuma
combinação razoável de dials a traz para o meio: ou fica em ~85%, ou a
Ganância desce ao fundo e leva quase um andar de profundidade junto. A sala
foi construída para ser "uma sala que a maioria recusa" — hoje é pedágio.

Este arquivo é o mecanismo, medido termo a termo, e a alavanca que sobra.
O §11 de `rota-e-valor.md` é leitura obrigatória antes: ele descreve o rateio
do guardião e conserta a metade que faltava (a caminhada). Aqui está a
consequência do outro lado, que aquele documento não afirma.

## O que cada dial faz com a entrada

n=250 por célula, pareado contra o centro, entrada medida sobre os andares
que TÊM vault (68% das runs chegam lá).

| dial | faixa que muda algo | efeito |
|---|---|---|
| **Coragem** (`bravery`) | nenhuma | 83–88%, nada passa de 1,0σ |
| **Ganância** (`sideAppetite`) | só as duas de baixo | 0,52 → 73% (4,2σ); 0,2 → 38% (6,5σ) |
| **Cautela** (`caution`) | só as duas de cima | 14,2 → 80%; 17,3 → 79% (2,2 e 2,4σ) |

**Só a Ganância decide, e só descendo.** Do centro para cima é platô morto
nos três. A Cautela tem efeito real mas fraco — 6-7 pontos contra os 48 da
Ganância — e é coerente com o mecanismo: ela encarece o CAMINHO dentro da
sala, não o duelo.

E a Ganância `muito baixo` custa 3,22 andares contra 4,09 do centro, então a
única faixa que recusa a sala é também a que arruína a descida. Não é uma
troca; é um botão de desligar.

## Por que a Coragem não move nada, que é o achado

Parece impossível: a Coragem É quanto de vida o bot acha que o porco tem, e
ela varia dez vezes entre as pontas. Medido na porta, 40 vaults, herói típico
do andar 4:

```
faixa         bravery   duelo bruto   − machado   = líquido   ÷ baús = guarda
muito baixo     0.2      10,16 hp      6,01 hp      4,15 hp           0,99 hp
baixo          0.52       8,09 hp      4,94 hp      3,15 hp           0,75 hp
médio-baixo    0.84       6,02 hp      3,85 hp      2,16 hp           0,51 hp
médio-alto     1.16       3,94 hp      2,69 hp      1,25 hp           0,30 hp
alto           1.48       1,87 hp      1,52 hp      0,35 hp           0,09 hp
muito alto      1.8       0,00 hp      0,00 hp      0,00 hp           0,00 hp
                                                          barra:      1,50 hp
```

**Todas as seis faixas passam com folga.** O portão já estava satisfeito
antes de alguém tocar no dial — e a barra que ele compara
(`CHEST_VALUE_HP × sideAppetite`) não contém Coragem nenhuma. É por isso que
o dial mais dramático do painel é inerte nesta decisão.

Duas divisões em sequência esvaziam o custo:

**1. O machado é descontado antes (M49).** O porco é a única criatura que
mostra o que carrega, então matá-lo paga, e `dropValue` desconta o prêmio do
duelo. O prêmio escala JUNTO com o medo — 6,01 hp para quem acha que o porco
tem 16, zero para quem acha que tem 1,8 — porque as duas metades saem do
mesmo `duelCost` entortado. Medo infla o custo e o prêmio ao mesmo tempo e
eles se cancelam em boa parte.

**2. O que sobra é dividido pelos baús que o guardião cobre (B22).** Oito
baús atrás de um porco custam a cada baú um oitavo do duelo.

## A consequência que não estava escrita

**O número de baús é um desconto no perigo.** `guardCost` faz
`total += net / share`, onde `share` é quanto aquele guardião cobre — então
quanto mais tesouro a sala tem, mais barato fica o quinhão de risco de cada
peça.

Isto inverte o que uma sala de tesouro deveria ser. Aumentar a recompensa
não a torna mais tentadora-porém-arriscada: torna-a **mais segura** na
aritmética do bot. Risco e recompensa deixam de ser dois eixos e viram um só,
apontando para o mesmo lado.

O §11 de `rota-e-valor.md` estendeu o rateio à caminhada, o que está certo
pelo argumento dele (uma viagem cobrada `n` vezes é um erro), e ao mesmo
tempo barateia a sala mais uma vez. Vale notar que o tripwire "a aposta está
morta" foi de 0,845 para 0,908 naquela mudança, e aquele documento já manda
vigiá-lo. Este arquivo é a leitura de por que ele anda sempre para o mesmo
lado.

## O que foi tentado e medido, e recusado

**hp do porco 12 → 14.** n=400 pareado.

```
                        hp 12        hp 14      pareado
entra no vault          86,1%        86,1%      0 discordantes — 0,0σ
mata o porco (vault)    13,1%         8,5%      12 a menos — 3,5σ
morre pro porco (run)   47,0%        50,0%
profundidade           4,12±0,09    4,00±0,08   −0,115 ± 0,034 — 3,3σ
baús por run             19,3         18,5
```

**Recusado.** A entrada não se moveu em UMA run — o bot não recebe hp
(`src/sim/observe.js` não carrega o campo), então +2 de hp é invisível para a
decisão. Todo mundo continua entrando e menos gente sai vivo: matar cai 35%,
a profundidade cai 3,3σ e a recompensa cai junto. Endurecer o porco num
regime de 86% de entrada não oferece uma aposta mais difícil, cobra um
pedágio maior de quem já ia passar.

O achado útil dessa medição é o zero: é a confirmação mais limpa de que
**hp e speed alteram o que a luta custa sem alterar o que ela é
precificada** — as duas únicas propriedades assim, e o truque de que a sala
depende (`docs/balance.md`, e o comentário do `duelCost`).

## A alavanca que sobra

Pela conta acima, a única não testada é **a quantidade de baús do vault**:
menos baús, maior o quinhão do duelo em cada um, e o guardião volta a pesar.
É a alavanca que a amortização deixou em aberto, e é o inverso do reflexo
natural — para a sala ficar mais assustadora, tira-se tesouro dela.

Não medida. Leitura de código, e é a próxima coisa a rodar antes de mexer no
porco de novo.
