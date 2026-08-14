# Cautela: a rota como decisão

**Estado: proposta fechada, nada implementado.** Escrita numa sessão de
desenho com o dono, para ser construída em pedaços separados e medidos um a
um. O que JÁ entrou está na última seção — ler primeiro, porque três das
peças abaixo mudaram de forma por causa disso.

## O problema

O bot tem três dials e todos os três respondem à mesma pergunta: *o que vale
a pena pegar*. Nenhum responde *por onde ir*. A rota é decidida por um único
número (`stepCost`) que foi varrido em 18 configurações a n=150 e mede plano
de 0,08 a 0,9 — virou constante por isso.

O resultado é um herói cuja personalidade só aparece na escolha de alvo.
Ele nunca *parece* cauteloso, porque cautela não é uma coisa que ele tem.

E isto é um jogo de assistir. "O herói parece cauteloso" é resultado
legítimo mesmo com profundidade idêntica — a medição certa não é o andar
médio, é se um espectador consegue dizer qual dial está alto só olhando.

## A divisão de trabalho

Quatro dials, quatro perguntas, nenhum pisando no outro:

| dial | pergunta | onde entra |
|---|---|---|
| coragem | quanto essa criatura aguenta? | dentro do duelo |
| ganância | vale a pena o que é opcional? | nas barras e no valor |
| **cautela** | quanto custa um turno exposto? | no preço de cada tile |
| **curiosidade** | quanto vale o desconhecido? | no preço do tile escuro |

Os dois de baixo não existem ainda.

## 1. O preço do tile

```
preço(tile) = cautela × (1 + exposição(tile))
```

`exposição` = quantas criaturas-turno aquele tile custa. `cautela` = hp por
turno exposto. O produto é hp, que é a moeda de todo o resto.

**A cautela é CEGA À FORÇA, de propósito.** Ela não lê `xp`, não lê vida,
não distingue rato de dragão. Quem julga força é a coragem, dentro do duelo.
Na prática é uma linha no campo de perigo:

```
bite(m) = expectedDamage(m.xp, 0)      →      bite(m) = 1
```

O decaimento com a distância, a aglomeração e o `activation` continuam
iguais — as três coisas que pareciam precisar de termos novos já estão lá.

**O `activation` fica.** Não é sobre força, é sobre geometria: criatura fora
do próprio raio é provadamente imóvel (`rules.md` §3), e é a única certeza
dura que o bot tem sobre o mapa. Tirar isso faz ele contornar estátuas.

**Custo aceito e declarado:** cautela alta desvia até de rato. É o
trade-off, não um defeito.

## 2. Calibrar contra um duelo justo

A cautela não é escolhida como número, é escolhida como frase: **quantos
turnos de exposição valem uma briga justa.** É isso que se varre e se olha.

Sem essa âncora, "cautela 1,4" não quer dizer nada; com ela, quer dizer
"esse herói anda quatro tiles a mais para não trocar um golpe".

## 3. Perseguidor custa metade do caminho

Uma criatura que persegue anda um passo enquanto o herói anda um passo, então
a distância `d` fecha em `d/2` turnos. Como a cautela é hp por turno, o
caminho até um perseguidor custa **metade**. Baú e item, parados, pagam
inteiro.

Não é parâmetro novo — é aritmética que o bot erra hoje.

## 4. Previsão de dois turnos

A previsão **é fiel e não é chute**: criaturas só perseguem, usam `findPath`,
pulam 10% dos turnos e bloqueiam umas às outras (`src/sim/monsters.js`). Dá
para reproduzir o motor, não para adivinhá-lo.

Onde ela entra: **substituindo o `persistence ^ dist` dentro da exposição.**
Hoje esse termo é um chute decaindo — "quanto mais longe, menos provável que
chegue". Nos tiles perto, a previsão vira a verdade.

**O que NÃO fazer, e o motivo é do próprio dono:** trocar o Dijkstra por
"escolha o vizinho que maximiza a distância da criatura mais próxima em 2
turnos". Duas coisas quebram:

- Sem termo de progresso a rota para de ir ao objetivo, e o herói circula no
  canto mais seguro para sempre.
- Maximizar passo a passo é escalada local — é exatamente o zigue-zague que
  a proposta queria evitar. O Dijkstra não zigue-zagueia porque decide o
  caminho inteiro antes do primeiro passo.

E a rota **não pode** trocar de moeda depois que o objetivo é traçado: o
Dijkstra precisa de um escalar só, e duas moedas exigem um peso, que é um
parâmetro novo comprando um problema que a moeda única não tinha.

## 5. Fronteira como quarto candidato

Hoje a fronteira **não é candidato, é plano B**: `if (pool.length) {…} else
{ fronteira }`. Isso é ordem de prioridade, não comparação de preço.

Ela passa a entrar na pool com preço em hp, como todo o resto. Duas coisas
caem junto:

**Sai o portão do V5** (`perigoNoCaminho ≤ sideBar`). Ele foi remendo para a
exploração não ter preço — ela escolhia a fronteira com menos passos, cega a
perigo, e nenhuma barra podia recusá-la. Com o preço honesto, **o preço já é
o portão**.

**Entra a curiosidade**, e ela se justifica por uma razão só: nenhum
parâmetro existente sabe distinguir terreno conhecido de terreno escuro.

```
custo do tile escuro = stepCost × (2 − curiosidade)
```

Mesmo espelho que o `assumedHp` já usa para a coragem, mesma máquina de seis
faixas, e um entalhe significa uma coisa só. Curiosidade 0,2 = escuro custa
1,8×; 1 = igual ao conhecido; 1,8 = custa 0,2×.

**E o escuro JÁ é o terreno mais barato do jogo, hoje, sem dial nenhum.**
`believedWalkable` trata tile nunca visto como passável e o campo de perigo
não conhece criatura lá — então o escuro não é neutro, é *seguro por
construção*. A curiosidade não cria um viés; ela dá controle sobre um viés
que já existe e ninguém escolheu.

### 5.2 — a coragem entra no custo de explorar?

**Sim, mas não como o dono formulou, e o alvo é outro.**

Não como desconto no passo. Como **estimativa de risco do desconhecido** — e
o bot já tem o número, calculado na própria função:

```js
const unseenMonsters = settings.monsterCount - belief.monsters.size;
```

Quantas criaturas o andar tem é concedido (`rules.md` §7). Então o escuro
tem perigo *esperado*, e a coragem desconta essa estimativa exatamente como
desconta a vida de uma criatura — `× (2 − bravery)`. Não é a coragem
ganhando uma segunda função: é a mesma função ("acho que é menos perigoso do
que parece") aplicada onde faltava.

Isso separa duas coisas que não devem cair no mesmo número:

- **Correção** — o escuro tem risco e a coragem o desconta. Conserta uma
  mentira. Não precisa de dial novo.
- **Gosto** — quanto este herói gosta do desconhecido. É traço de
  personagem, e é aí que a curiosidade vive.

Fazer a correção primeiro. É bem possível que a curiosidade fique com o
trabalho certo — ser sabor, não segurança — em vez de carregar as duas e
tornar a medição ilegível.

**Costura a declarar:** a cautela é cega à força para criaturas *conhecidas*;
a estimativa do escuro é consciente da força para as *desconhecidas*. São
populações diferentes, não uma exceção à regra da seção 1.

## 6. Refúgio

Um tile conhecido de exposição zero. Como criatura fora do raio é
provadamente imóvel, exposição zero é **garantia, não palpite**.

### O que decide entre explorar e se refugiar

**Não é a curiosidade** — e essa é a resposta que a sessão levou mais tempo
para achar. A curiosidade já falou, no preço da fronteira. Deixá-la falar de
novo no desempate é dois puxões na mesma decisão, que é a confusão que o M47
desfez.

O que separa "explorar" de "se esconder" não é gosto, é **se o herói
sobrevive à viagem**. Isso é pergunta de sobrevivência, e sobrevivência tem
uma barra que já existe:

```
melhor fronteira custa mais que fightMargin × hp efetivo   →   refúgio
```

Mesma barra de todo o resto, nenhum sensor novo, e lê como frase: *"chegar
lá me custa mais do que eu aceito pagar"*.

### Por que o refúgio não é um quinto candidato

Porque ele não produz nada. Se competisse por preço ele seria barato
*sempre* — é um tile seguro logo ali — e o herói se esconderia para sempre.

O lugar dele é substituir o galho onde o bot hoje **vai para a fronteira que
ele mesmo recusou**, porque ficar parado é morte garantida.

```
candidatos, todos em hp:   criatura · item · baú · fronteira
                            → pega o mais barato

lista vazia:
   buraco conhecido?        → buraco
   fronteira cara demais?   → refúgio
   senão                    → rest
```

## O que já entrou nesta sessão

Três mudanças que mudam o chão desta proposta:

**Memória de golpes.** A vida de uma criatura não atravessa mais em distância
nenhuma; o herói percebe o próprio golpe e o Belief soma por criatura. O
palpite decai durante o duelo, e um palpite esgotado é refeito do zero.

**`meleeCost`.** A seringa passou a somar só criaturas adjacentes. O contador
da fúria cai a cada turno que passa, então injetar à distância gasta o item
na caminhada — 40% das injeções eram contra o vazio.

**B26 — o tile de uma criatura viva custa o duelo dela.** E a consequência
que não estava no plano: **um perseguidor adjacente passa a custar zero**, a
rota até ele *é* o duelo e o duelo de quem já persegue não é cobrado. Ele
vira a coisa mais barata do tabuleiro e o bot termina a briga em vez de sair
de perto. Recuos caíram de 71 para 17 duelos em 120 runs, profundidade e
mortes iguais.

Isso muda o item 6: **a maior parte do que parecia recuo era o bot largando
briga que ganharia.** Só o refúgio separa "fugir" de "desistir", e é por isso
que ele continua valendo — mas o número a bater não é mais 71.

## Ordem de construção

Cada uma verificável olhando o jogo rodar, e nenhuma depende da seguinte:

1. **`bite = 1`** atrás de um dial. Uma linha. Dá para ver na hora se o herói
   passa a desviar de rato.
2. **Metade do caminho para perseguidor.** Correção de aritmética, isolada.
3. **Previsão de 2 turnos dentro da exposição**, substituindo o decaimento.
4. **Perigo esperado do escuro**, com a coragem descontando. Correção.
5. **Fronteira na pool + curiosidade.** A mudança estrutural; aqui a
   profundidade pode mexer de verdade.
6. **Refúgio.** É o recuo virando comportamento visível.
