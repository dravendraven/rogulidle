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
| ganância | quanto de risco opcional eu aceito? | nas barras, no valor e **no escuro** |
| **cautela** | quanto custa um turno exposto? | no preço de cada tile |

Só o de baixo é novo. **A curiosidade foi cortada** — a seção 5 explica por
quê, e o motivo é a melhor coisa que esta proposta descobriu sobre si mesma.

## 1. O preço do tile

```
preço(tile) = stepCost + cautela × exposição(tile)
```

`exposição` = quantas criaturas-turno aquele tile custa. `cautela` = hp por
criatura-turno. O produto é hp, que é a moeda de todo o resto.

**Não `cautela × (1 + exposição)`, que foi a primeira forma escrita.** Ela
achata o perigo: hoje um tile colado numa criatura xp 4 custa `0,1 + 1,25`
contra `0,1` de um tile limpo, contraste de 13:1; naquela forma o contraste
vira 2:1 e a cautela não conserta, porque multiplica os dois lados igual.

Na forma acima a cautela é **a taxa de câmbio entre perigo e passo**, e ganha
um centro calibrado de graça: `cautela = mordida média do bestiário`
reproduz o jogo de hoje EXATAMENTE. É o ponto neutro que a seção 2 procurava.

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

**E o escuro JÁ é o terreno mais barato do jogo, hoje, sem dial nenhum.**
`believedWalkable` trata tile nunca visto como passável e o campo de perigo
não conhece criatura lá — então o escuro não é neutro, é *seguro por
construção*. Isso é uma mentira, não uma escolha.

### 5.1 — a correção: o escuro tem perigo esperado

O bot já tem o número, calculado na própria função:

```js
const unseenMonsters = settings.monsterCount - belief.monsters.size;
```

Quantas criaturas o andar tem é concedido (`rules.md` §7). O escuro passa a
custar o que essas criaturas custariam.

**A coragem entra aqui SOZINHA, sem fiação nova.** Precificar uma criatura
imaginada usa `expectedHpFor` como qualquer outra, e a coragem já desconta
`expectedHpFor`. Ela não ganha função nova nem precisa ser ligada em lugar
nenhum — continua significando uma coisa só, e passa a significá-la também
sobre o que ainda não foi visto.

### 5.2 — por que a curiosidade foi cortada

A proposta original tinha um quarto dial (`custo do escuro = stepCost ×
(2 − curiosidade)`). Ele morreu de uma pergunta do dono: **o escuro é aposta
cega de DOIS lados** — pode ser uma sala com baú, pode ser um ogro acordado.

Isso mata duas candidatas de uma vez:

- **A coragem é de um lado só.** Ela desconta perigo e não sabe falar de
  recompensa; sobre uma aposta ela só ficaria otimista sobre metade da conta.
- **A curiosidade não tem pergunta.** Ela só teria trabalho se o escuro
  tivesse um VALOR próprio para ela preferir. Não tem — só preço. Então ela
  seria um desconto no passo sem contraparte.

E a resposta certa já estava no bot: **a ganância é o único dial de dois
lados**, e ela **já governa a fronteira hoje** —

```js
const frontierOk = (pos) => dangerOnTheWay(pos) <= sideBar;
```

`sideAppetite` é literalmente "apetite pelo opcional". O escuro é a aposta
lateral com a recompensa ainda mais escondida. Não precisa de dono novo,
precisa que o dono existente receba um preço honesto.

**Risco a declarar:** a ganância já puxa luta lateral, item, baú, hora do
livro, hora da seringa e fronteira. Somar o escuro é mais do mesmo, e o
preço disso é que fica difícil dizer qual metade moveu uma medição.

**Se um dia o escuro ganhar valor esperado** (dá: `chestCount − vistos` ×
valor médio do baú), a curiosidade volta a ter uma pergunta de verdade —
"gosto do desconhecido mais do que de um baú de mesmo valor". Antes disso,
não.

**Costura a declarar:** a cautela é cega à força para criaturas *conhecidas*;
a estimativa do escuro é consciente da força para as *desconhecidas*. São
populações diferentes, não exceção à regra da seção 1.

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

**A primeira vem sozinha e antes de tudo**: ela muda o que "perigo"
significa, então qualquer medição das outras feita antes dela não vale mais.
Depois disso o grafo é solto — 2, 7 e 8 não dependem de ninguém, e 4 destrava
5 e 6.

| # | tarefa | como você vê que funcionou |
|---|---|---|
| 1 | `bite = 1` e a cautela como taxa de câmbio, centrada no valor que reproduz hoje | cautela alta: desvia de rato. No centro: nada muda |
| 2 | Calibrar — varrer e escrever "N turnos de exposição = uma briga justa" | a tabela de seis faixas |
| 3 | Perseguidor paga metade do caminho | ele para de dar a volta para encontrar quem já vem |
| 4 | Fronteira entra na pool, sai o portão do V5 | explorar e brigar se misturam em vez de alternar em blocos |
| 5 | Perigo esperado do escuro (a ganância paga, a coragem desconta por dentro) | ele para de entrar em sala escura como se fosse corredor vazio |
| 6 | Refúgio | dá para ver o herói recuar de propósito |
| 7 | Previsão de 2 turnos dentro da exposição | ele passa por trás da criatura em vez de por diante |
| 8 | B27 — a seringa (fora desta proposta, mesma família) | a fúria deixa de ser gasta numa luta recusada em seguida |

Cada dial novo precisa de linha em `src/ui/dials.js`, faixa de seis entalhes
e passagem pelo `dial-overrides.json` — sem isso não dá para mexer nele
rodando, que é o único jeito de julgar qualquer uma destas.

**O maior risco é a tarefa 4.** O V5 existe porque isso já deu errado de um
jeito medido: o herói entrava na sala com o bicho e depois fugia da luta que
a própria ganância não deixava terminar. Trocar o portão pelo preço é certo
*se* o preço for honesto — o B26 arrumou metade (criatura não é chão) e a
tarefa 5 arruma a outra (o escuro não é seguro). Fazer a 4 sem a 5 é
reintroduzir o defeito com outro nome.

**A tarefa 7 é a única que pode não pagar.** O que ela compra é assimetria:
tiles atrás do herói ficam mais seguros que tiles além da criatura, coisa que
um flood simétrico não sabe dizer. Se não der para ver rodando, joga fora.
