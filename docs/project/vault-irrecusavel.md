# O vault deixou de ser uma escolha

Medido em 2026-08-15, herói `base`, mãos vazias, dials no centro, mesmas
seeds em toda célula (`test/baseline.md`).

**O bot entra na sala do porco em 86% dos andares que a têm.** Nenhuma
combinação razoável de dials a traz para o meio: ou fica em ~85%, ou a
Ganância desce ao fundo e leva quase um andar de profundidade junto. A sala
foi construída para ser "uma sala que a maioria recusa" — hoje é pedágio.

Este arquivo é o mecanismo, medido termo a termo, e duas tentativas de
consertá-lo que falharam de maneiras informativas. O §11 de
`rota-e-valor.md` é leitura obrigatória antes: ele descreve o rateio do
guardião e conserta a metade que faltava (a caminhada). Aqui está a
consequência do outro lado, que aquele documento não afirma.

**A conclusão, para quem só vai ler isto:** nenhum termo do portão está
apertado, então mexer em qualquer um deles isoladamente consome toda a
margem antes de mudar a decisão. Foi assim com o hp do porco e com a
quantidade de baús, cada um do seu lado. A folga é o problema, não o número.

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

## A alavanca que sobrava, medida e insuficiente

A conta acima apontava **a quantidade de baús do vault**: menos baús, maior o
quinhão do duelo em cada um, e o guardião voltaria a pesar. Medido, n=250
pareado contra os 8 que shipam:

```
baús no vault      entra   mata   morre   prof         vs 8 baús
8 (shipado)          86%    12%    50%   4,09±0,10     —
6                    86%    10%    52%   4,06±0,10     1 par discordante (0,0σ)
4                    86%    11%    51%   4,03±0,10     1 par discordante (0,0σ)
2                    80%     9%    48%   4,02±0,09     12 a menos (3,1σ)
```

**Cortar o tesouro pela metade duas vezes não muda uma única run.** A
hipótese como ALAVANCA está descartada, e o mecanismo está confirmado — as
duas coisas ao mesmo tempo, que é o resultado mais útil possível.

O mecanismo é real e a aritmética prevê o ponto exato: o guardião amortizado
é 0,51 hp no centro com 8 baús, dobra para ~1,0 com 4 — ainda sob a barra de
1,50 — e só passa dela com 2. É onde a entrada se move, e move pouco: 80%.

**A conclusão é sobre a folga, não sobre o número.** Nenhum termo do portão
está apertado: o guardião passa por três vezes, e a caminhada agora também é
rateada (§11 de `rota-e-valor.md`). A sala não entra porque algum termo
convence — entra porque nenhum termo resiste. Mexer em um deles isoladamente
consome toda a margem antes de mudar a decisão, e foi isso que o hp 14 e a
contagem de baús mostraram, cada um do seu lado.

Quem for tentar de novo: a próxima coisa a olhar não é um termo do portão, é
a BARRA — `CHEST_VALUE_HP × sideAppetite` — ou a decisão de o andar do vault
não ter baú nenhum fora dele (`spawn.js` zera `chestCount`), que remove a
alternativa contra a qual a sala deveria competir. Recusar a sala hoje não é
escolher outro tesouro, é escolher nenhum.

## Addendum — medido pelo outro lado, e é pior que 86%

Instrumento da cadeia (`src/analysis/chain.js`), herói `base`, dials
enviados, 200 runs em cada cenário. A definição aqui não é "pisou dentro":
o bot decide ANTES da luta se sobrevive e **não tem verbo para sair de uma
que começou** (`items.md`), então quem encara o porco resolve — mata ou
morre. Enfrentou = matou + morreu para ele. O que sobra é quem nunca
encostou nele.

**Passou reto e sobreviveu: 1 run em 134 com a loja desligada, 2 em 162 com
ela ligada.** Entre quem chega ao andar e sai vivo, a sala é obrigatória em
~99%. Os 86% deste documento contam quem entra sobre quem chega, e a
diferença é quase toda gente que morre no andar antes de resolver qualquer
coisa. As duas leituras concordam sobre o mecanismo e discordam sobre o
tamanho da folga: não há folga.

**E o poder do herói não a torna recusável — torna-a mais atraente.** Com a
loja ligada a taxa de vitória no duelo quase dobra (23% → 42% dos que
enfrentam), e a fração dos que chegam e enfrentam SOBE (84% → 92%). Um herói
mais forte não passa reto com mais frequência; ele entra mais.

**O que isso fecha:** qualquer conserto pelo lado do PREÇO da sala está
descartado por este documento (hp e baús, cada um do seu lado) e agora
também pelo lado do poder do herói. O que resta é o que o parágrafo acima
já apontava — a barra, ou a ausência de alternativa no andar.

**Uma discrepância de rótulo para quem escreveu o backlog conferir.** O item
V6 cita "43,5% das runs que chegam entram"; nesta leitura 43,5% é a fração
de TODAS as runs que o porco mata, e a entrada sobre quem chega é 84%. Pode
ser coincidência de número. O "22% das lutas travadas são vencidas" do mesmo
item reproduz aqui em cheio (23,0%).

## Addendum 2 — o custo da Ganância baixa, medido no primeiro objetivo do jogador

O documento acima mede a ENTRADA na sala. Isto mede o que a entrada custa em
tempo de jogo, usando o alvo que o jogador realmente persegue primeiro: a
conquista `butcher`, que é a única chave de progressão que existe hoje.

O experimento: uma sessão começa do zero e roda até o primeiro porco morto;
a espera é em quantas RUNS isso aconteceu. Pareado por seed de sessão, os
dois braços vendo os mesmos dungeons na mesma ordem.

**Ganância na banda mínima contra o centro, 120 cadeias pareadas:**
espera 12,79 contra 5,94 runs, **delta pareado +6,85 ± 0,92 (7,4σ)**, e 12
das 120 sessões NUNCA mataram o porco dentro do teto de 30 runs, contra zero
no centro. É o mecanismo deste documento aparecendo no relógio do jogador:
Ganância baixa não entra na sala, e quem não entra não destrava nada.

**E as outras cinco bandas são indistinguíveis entre si.** Num A/B com os
três dials SORTEADOS a cada cadeia contra o centro, o delta pareado é
+0,88 ± 0,62 (1,4σ) — não passa a barra de 2σ. A aritmética fecha: 6,85
diluído por seis bandas dá 1,14, dentro do erro do que foi medido. O efeito
inteiro da escolha aleatória é aquela uma banda.

**A consequência de desenho, que é o que vale guardar.** O dial não oferece
opções com fraquezas diferentes, que é o que `objectives.md` pede de uma
escolha ("toda opção precisa de uma fraqueza real, e uma que apareça na
tela"). Oferece **cinco bandas equivalentes e uma armadilha**. Quem mexe nele
ou não muda nada, ou se sabota — e não tem como distinguir os dois casos
olhando.

**Uma varredura um-a-um confirma tudo por outro caminho** (50 sessões por
célula, teto 30, mesmas seeds; ~1 h de CPU). Ganância mínima lê +6,62 (5,1σ)
com 5 sessões censuradas, contra o +6,85 (7,4σ) do A/B pareado — dois
desenhos, uma conclusão. E ela separa melhor o que os outros dois fazem:

- **Coragem é inerte, e não apenas "não separada do ruído".** As SEIS bandas
  caem entre 6,24 e 6,60 runs, nenhuma passando de 0,4σ do centro. Uma linha
  reta, num dial que o painel apresenta como escolha.
- **Cautela tem forma de U** — as duas pontas piores que o meio (7,36 e 7,26
  contra 5,96–6,68), ambas lendo +1,1σ. Coerente com um dial que tem ótimo
  interior, e NÃO estabelecido: nada passa 2σ com esta amostra.

Ambos consistentes com o sweep de profundidade em `test/baseline.md`, que
também não achou nada fora do centro nos três.

Ressalva: o alvo aqui é a primeira rung, que cai em 5 runs medianas. Um alvo
mais alto — limpar a run — pode separar configurações que este não separa, e
trocar a condição de parada é a única mudança necessária para medir isso.
