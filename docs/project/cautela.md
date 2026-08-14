# Cautela e apetite ao risco: a rota como decisão

**Estado: proposta fechada, nada implementado.** Sete peças desenhadas numa
sessão com o dono, para serem construídas e medidas uma a uma. A numeração
das seções é a dele, para que a conversa mape no documento; a ordem de
construção é outra e está no fim.

Três coisas JÁ entraram nesta sessão e mudam o chão desta proposta — a seção
"O que já mudou" no fim. Ler antes de construir qualquer peça.

E a última seção lista **o que foi descartado e por quê**. Ler antes de
reintroduzir qualquer coisa que pareça uma boa ideia.

## O problema

O bot tem três dials e todos respondem à mesma pergunta: *o que vale a pena
pegar*. Nenhum responde *por onde ir*. A rota é decidida por um único número
(`stepCost`) varrido em 18 configurações a n=150, plano de 0,08 a 0,9 — virou
constante por isso.

O resultado é um herói cuja personalidade só aparece na escolha de alvo. Ele
nunca *parece* cauteloso, porque cautela não é uma coisa que ele tem.

E isto é um jogo de assistir. "O herói parece cauteloso" é resultado legítimo
mesmo com profundidade idêntica — a medição certa não é o andar médio, é se
um espectador consegue dizer qual dial está alto só olhando.

## Os quatro dials

| dial | pergunta | população |
|---|---|---|
| coragem | quanto essa criatura aguenta? | o que ele **vê** |
| apetite ao risco | quanta incerteza eu aceito? | o que ele **não vê** |
| ganância | quanto isso vale para mim? | recompensa |
| **cautela** | quanto custa um turno exposto? | o caminho |

Só a cautela é dial novo. O apetite ao risco sai de dentro da ganância
(seção 7) e a coragem já existe.

**Coragem e apetite ao risco são a mesma família e populações diferentes**, e
isso precisa ficar escrito ou daqui a três sessões alguém funde os dois. A
coragem é a atitude perante a incerteza sobre uma criatura que está à vista;
o apetite ao risco é a atitude perante o que ainda não foi visto.

---

## 1. A fórmula do preço do tile

```
preço(tile) = stepCost + cautela × exposição(tile)
```

`exposição` = quantas criaturas-turno aquele tile custa. `cautela` = hp por
criatura-turno. O produto é hp, que é a moeda de todo o resto do bot.

**A cautela é CEGA À FORÇA, de propósito.** Ela não lê `xp`, não lê vida, não
distingue rato de dragão. Quem julga força é a coragem, dentro do duelo. Na
prática é uma linha no campo de perigo:

```
bite(m) = expectedDamage(m.xp, 0)      →      bite(m) = 1
```

O decaimento com a distância, a aglomeração e o `activation` continuam
iguais — as três coisas que pareciam precisar de termos novos já estão lá.

**O `activation` fica.** Não é sobre força, é sobre geometria: criatura fora
do próprio raio é provadamente imóvel (`rules.md` §3), e é a única certeza
dura que o bot tem sobre o mapa. Tirar isso faz ele contornar estátuas.

**Custo aceito e declarado:** cautela alta desvia até de rato. É o trade-off,
não um defeito.

### Por que NÃO `cautela × (1 + exposição)`

Foi a primeira forma escrita e ela achata o perigo. Hoje um tile colado numa
criatura xp 4 custa `0,1 + 1,25` contra `0,1` de um tile limpo — contraste de
**13:1**. Naquela forma o contraste vira **2:1**, e a cautela não conserta
porque multiplica os dois lados igual. O bot atravessaria zona de criatura
quase de graça.

Na forma adotada a cautela é **a taxa de câmbio entre perigo e passo**, e
ganha um centro calibrado de graça: `cautela = mordida média do bestiário`
reproduz o jogo de hoje EXATAMENTE. É o ponto neutro que a seção 2 procurava.

---

## 2. Calibrar a cautela contra um duelo justo

A cautela não é escolhida como número, é escolhida como frase: **quantos
turnos de exposição valem uma briga justa.** É isso que se varre e se olha.

Sem essa âncora, "cautela 1,4" não quer dizer nada; com ela, quer dizer "esse
herói anda quatro tiles a mais para não trocar um golpe".

O ponto neutro da seção 1 dá o começo da varredura de graça: a faixa central
tem que reproduzir o jogo atual, e as outras cinco se leem contra ela.

---

## 3. Perseguidor paga metade do caminho

Uma criatura que persegue anda um passo enquanto o herói anda um passo, então
a distância `d` fecha em `d/2` turnos. Como a cautela é hp por turno, o
caminho até um perseguidor custa **metade**. Baú e item, parados, pagam
inteiro.

Não é parâmetro novo — é aritmética que o bot erra hoje. Some o `approach`
pela metade quando `chasing`, no mesmo lugar onde o duelo já é dispensado
pelo mesmo motivo ("vai acontecer de qualquer jeito").

---

## 4. Previsão de dois turnos

A previsão **é fiel e não é chute**: criaturas só perseguem, usam `findPath`,
pulam 10% dos turnos e bloqueiam umas às outras (`src/sim/monsters.js`). Dá
para reproduzir o motor, não para adivinhá-lo.

Onde ela entra: **substituindo o `persistence ^ dist` dentro da exposição.**
Hoje esse termo é um chute decaindo — "quanto mais longe, menos provável que
chegue". Nos tiles perto, a previsão vira a verdade.

**O que ela compra de verdade é assimetria.** Um flood simétrico saído da
criatura não sabe dizer que os tiles *atrás* do herói são mais seguros que os
tiles *além* da criatura. A previsão sabe, porque a criatura anda na direção
dele. É a única coisa aqui que o campo atual não consegue expressar de jeito
nenhum — e é por isso que vale tentar, apesar de ser a peça mais cara.

**É também a única que pode não pagar.** Se não der para ver a diferença
rodando, joga fora.

### O que NÃO fazer, e o motivo veio do próprio dono

Trocar o Dijkstra por "escolha o vizinho que maximiza a distância da criatura
mais próxima em 2 turnos". Duas coisas quebram:

- Sem termo de progresso a rota para de ir ao objetivo, e o herói circula no
  canto mais seguro para sempre.
- Maximizar passo a passo é escalada local — é exatamente o zigue-zague que a
  proposta queria evitar. O Dijkstra não zigue-zagueia porque decide o
  caminho inteiro antes do primeiro passo.

E a rota **não pode trocar de moeda** depois que o objetivo é traçado: o
Dijkstra precisa de um escalar só, e duas moedas exigem um peso, que é um
parâmetro novo comprando um problema que a moeda única não tinha.

---

## 5. Fronteira como quarto candidato

Hoje a fronteira **não é candidato, é plano B**: `if (pool.length) {…} else
{ fronteira }`. Isso é ordem de prioridade, não comparação de preço — "só
explora quando nada visível vale a pena".

Ela passa a entrar na pool com preço em hp, como criatura, item e baú.

**Sai o portão do V5** (`perigoNoCaminho ≤ sideBar`). Ele foi remendo para a
exploração não ter preço: ela escolhia a fronteira com menos passos, cega a
perigo, e nenhuma barra podia recusá-la. Com o preço honesto, **o preço já é
o portão**.

**A objeção que quase matou isto, e a resposta:** "a fronteira com preço = 
`walk` ganha de tudo e o bot nunca briga". Não — ela ganha *enquanto estiver
perto*. Conforme o andar é varrido as fronteiras ficam longe e as criaturas
continuam perto, e a briga volta a ganhar sozinha. Isso se auto-equilibra, e
é exatamente aí que a personalidade vira comportamento visível: varrer o
andar antes contra encarar o que está na frente.

### 5.1 O escuro tem perigo esperado

**Hoje o escuro é o terreno mais barato do jogo, sem dial nenhum.**
`believedWalkable` trata tile nunca visto como passável e o campo de perigo
não conhece criatura lá — então o escuro não é neutro, é *seguro por
construção*. Isso é uma mentira, não uma escolha.

O bot já tem o número para consertar, calculado na própria função:

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

**Quem paga é o apetite ao risco**, pela seção 7: o escuro é incerteza, e
incerteza aceita é a pergunta dele.

**Costura a declarar:** a cautela é cega à força para criaturas *conhecidas*;
a estimativa do escuro é consciente da força para as *desconhecidas*. São
populações diferentes, não exceção à regra da seção 1.

---

## 6. Refúgio: o tile seguro mais próximo

Um tile conhecido de **exposição zero**. Como criatura fora do raio é
provadamente imóvel, exposição zero é **garantia, não palpite** — o refúgio é
o único lugar do bot onde "seguro" é uma prova e não uma estimativa.

### Por que ele é necessário

O bot não tem nenhum objetivo que signifique **"para longe daqui"**. Toda a
lista dele é coisa para *pegar*. É por isso que "fugir" e "desistir" são a
mesma coisa hoje, e o B26 acabou de mostrar que a maior parte do que parecia
fuga era desistência.

### Por que ele NÃO é um quinto candidato

Porque não produz nada. Se competisse por preço ele seria barato *sempre* — é
um tile seguro logo ali — e o herói se esconderia para sempre.

O lugar dele é substituir o galho onde o bot hoje **vai para a fronteira que
ele mesmo recusou**, porque ficar parado é morte garantida.

### O que decide entre explorar e se refugiar

**Não é gosto, é sobrevivência** — e essa é a resposta que a sessão levou mais
tempo para achar. A barra já existe:

```
melhor fronteira custa mais que fightMargin × hp efetivo   →   refúgio
```

Mesma barra de todo o resto, nenhum sensor novo, e lê como frase: *"chegar lá
me custa mais do que eu aceito pagar"*.

O desenho final da escolha:

```
candidatos, todos em hp:   criatura · item · baú · fronteira
                            → pega o mais barato

lista vazia:
   buraco conhecido?        → buraco
   fronteira cara demais?   → refúgio
   senão                    → rest
```

---

## 7. Decompor `sideAppetite` em apetite ao risco × ganância

**Isto não é adicionar um dial, é separar um que já está sobrecarregado** — e
essa distinção importa, porque a regra do `CLAUDE.md` proíbe compensar um
parâmetro com outro, não proíbe desfazer uma fusão errada.

O próprio código já admite a fusão. Comentário em `src/bot/bot.js`:

> `sideAppetite` deixa de ser uma fração do hp do herói e vira um
> multiplicador sobre VALOR

E o `bot.md` registra a consequência: dois efeitos que "se somam na mesma
leitura e não dá para separá-las".

### Onde ela está hoje, e o corte

| uso | o que realmente é | vai para |
|---|---|---|
| `sideBar = sideAppetite × fightBar` — item, baú, fronteira | incerteza aceita | **apetite ao risco** |
| o escuro (5.1) | incerteza aceita | **apetite ao risco** |
| `chestValueHp × sideAppetite` — preço de reserva do baú | valor | ganância |
| `READ_AT × sideAppetite` — segurar o livro | valor | ganância |
| `RAGE_AT × sideAppetite` — segurar a seringa | valor | ganância |

**As barras são risco, os preços são ganância.** O corte cai sozinho.

### Por que isto é obrigatório e não cosmético

Sem ele, a peça 5 piora um problema que já existe: com a fronteira na pool, a
`sideBar` passaria a governar luta lateral, item, fronteira **e** o escuro —
quatro decisões numa barra só. Um sweep de ganância moveria tudo e não diria
nada sobre nada.

### A propriedade que torna isto seguro

**Os dois nascem em 1, então o corte entra sem mudar comportamento nenhum.** É
refatoração de significado com medição idêntica: dá para landar, confirmar
que nada moveu, e só depois varrer cada metade. É raro conseguir isso num
corte deste tamanho, e é por isso que ele vem primeiro.

---

## Ordem de construção

| ordem | peça | como você vê que funcionou |
|---|---|---|
| 1 | **§7** o corte da `sideAppetite` | nada muda — e é isso que se confirma |
| 2 | **§1** `bite = 1` e a cautela como taxa de câmbio | cautela alta: desvia de rato. No centro: nada muda |
| 3 | **§2** calibrar contra um duelo justo | a tabela de seis faixas |
| 4 | **§3** perseguidor paga metade | ele para de dar a volta para encontrar quem já vem |
| 5 | **§5.1** perigo esperado do escuro | ele para de entrar em sala escura como se fosse corredor vazio |
| 6 | **§5** fronteira na pool, sai o portão do V5 | explorar e brigar se misturam em vez de alternar em blocos |
| 7 | **§6** refúgio | dá para ver o herói recuar de propósito |
| 8 | **§4** previsão de dois turnos | ele passa por trás da criatura em vez de por diante |

**§7 primeiro porque entra provadamente sem mexer em nada.** §1 em seguida e
sozinha: ela muda o que "perigo" significa, então qualquer medição feita antes
dela não vale mais.

**§5.1 ANTES de §5, e isso é o risco maior do plano.** O V5 existe porque
isso já deu errado de um jeito medido: o herói entrava na sala com o bicho e
depois fugia da luta que a própria ganância não deixava terminar. Trocar o
portão pelo preço é certo *se* o preço for honesto — o B26 arrumou metade
(criatura não é chão) e §5.1 arruma a outra (o escuro não é seguro). Fazer §5
sem §5.1 é reintroduzir o defeito com outro nome.

Cada dial novo precisa de linha em `src/ui/dials.js`, faixa de seis entalhes
e passagem pelo `dial-overrides.json`. Sem isso não dá para mexer nele
rodando, que é o único jeito de julgar qualquer uma destas.

---

## O que já mudou nesta sessão

**Memória de golpes.** A vida de uma criatura não atravessa mais em distância
nenhuma; o herói percebe o próprio golpe e o Belief soma por criatura. O
palpite decai durante o duelo, e um palpite esgotado é refeito do zero.

**`meleeCost`.** A seringa passou a somar só criaturas adjacentes. O contador
da fúria cai a cada turno que passa, então injetar à distância gasta o item na
caminhada — 40% das injeções eram contra o vazio.

**`side` saiu do Belief.** O bot não sabe mais o que é sala lateral e o que é
espinha. Medido antes de tirar: a aposta sobrevive em todas as faixas de
ganância, porque a opcionalidade já estava precificada pela caminhada e pelo
guardião. Consequência para a peça 7: a `sideBar` perdeu o portão de luta
(que era inerte no centro do dial de qualquer jeito) e guarda item, baú e
fronteira — o corte continua valendo, com alcance menor.

**B26 — o tile de uma criatura viva custa o duelo dela.** E a consequência que
não estava no plano: **um perseguidor adjacente passa a custar zero**, porque
a rota até ele *é* o duelo e o duelo de quem já persegue não é cobrado. Ele
vira a coisa mais barata do tabuleiro e o bot termina a briga em vez de sair
de perto. Recuos caíram de 71 para 17 duelos em 120 runs, profundidade e
mortes iguais.

Isso muda a peça 6: **a maior parte do que parecia recuo era o bot largando
briga que ganharia.** O refúgio continua valendo, mas o número a bater não é
mais 71.

---

## Descartado, e por quê

Ler antes de reintroduzir.

**Curiosidade como quarto dial** (`custo do escuro = stepCost × (2 −
curiosidade)`). Morreu de uma pergunta do dono: o escuro é aposta cega de
**dois lados** — pode ser uma sala com baú, pode ser um ogro acordado. Isso
mata duas candidatas de uma vez. A coragem é de um lado só: desconta perigo e
não sabe falar de recompensa, então sobre uma aposta ficaria otimista sobre
metade da conta. E a curiosidade não tem pergunta — ela só teria trabalho se o
escuro tivesse um VALOR próprio para preferir, e ele só tem preço. **Se um dia
o escuro ganhar valor esperado** (dá: `chestCount − vistos` × valor médio do
baú), a curiosidade volta a ter uma pergunta de verdade: "gosto do
desconhecido mais do que de um baú de mesmo valor". Antes disso, não.

**Bloquear o tile da criatura em vez de precificá-lo** (sumidouro, como o
santuário). Foi implementado e medido: recuo sobe 44%, profundidade e mortes
iguais. Mas quebra o V5 — uma fronteira atrás de um guardião em corredor vira
*inalcançável* em vez de cara, e o bot para de explorar em vez de pagar. Uma
criatura que ele não consegue matar continua bloqueando pelo preço infinito,
e isso não é caso especial: é o preço sendo verdade.

**Rota gulosa de dois turnos** substituindo o Dijkstra. Ver §4.

**`awakeCost` como gatilho do refúgio.** Foi a primeira resposta para "o que
decide fugir" e está errada por dois motivos. Ele não desconta a distância —
uma criatura a oito tiles pesa igual a uma colada — e usa distância em L, não
em passos, então erra sempre para o lado de "está acordada". Um herói fugiria
por causa de três bichos distantes atrás de uma parede.

**Um interruptor de modo** (`pool vazia e aguento o que vem → explora; não
aguento → refugia`). Só fazia sentido porque a fronteira não tinha preço; com
ela na pool, o interruptor some. A pergunta do dono que derrubou isto: "se eu
aguento, por que eu exploraria?"
