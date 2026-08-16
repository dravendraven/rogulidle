# A sala trancada e a chave

**Status: desenho, nada construído.** Registro de uma conversa inteira com o
dono, escrito antes de qualquer código — inclusive uma recomendação minha que
estava errada e um arquivo do projeto que já dizia por quê.

Leitura relacionada: `dcss-layouts.md` (o que o DCSS faz, e a fechadura que
ele usa uma vez), `rota-e-valor.md` (a curiosidade e por que ela morreu),
`line-of-sight.md` (o E2, que isto NÃO precisa).

---

## O que é

Uma sala com **uma porta trancada**. A chave sai de um **baú vazio** — hoje
metade dos baús não paga nada — sorteada em algum andar **antes** do andar da
porta, e viaja no inventário como qualquer item.

## Por que existe, e não é "mais uma sala"

O sorteio puro que a sala oferece **já existe**: salas laterais tiram dois
números independentes, um para o tier das criaturas e outro para a qualidade
do baú (`SIDE_ROOM_DEPTH_BONUS`, `map-design.md`). Um ninho de ogros
guardando um punhal já é possível hoje.

O que a tranca acrescenta é outra coisa, e é a que falta. O `map-design.md`
registra que a sala lateral é **recusável em teoria e nunca recusada na
prática** — "a aposta é um almoço grátis", porque recusar não custa nada.

**A tranca move a decisão para trás.** Deixa de ser "entro nesta sala?", que
não é escolha, e passa a ser "abro aquele baú lá atrás?", que é escolha, já
custa hp e desvio, e já é precificada. O dono decidiu que **poder passar reto
pela chave é o desenho, não o defeito**: quem arrisca mais acha mais chaves e
morre mais.

## A sala é um vault

Decidido. O `vault.js` já carimba um retângulo, garante **uma porta só**, cava
o túnel e registra se a porta cai na rota obrigatória — que é o que garante
que a porta seja **vista** antes de a decisão existir. O que falta a ele é ser
*um tipo de sala autoral* em vez de "a sala do Butcher no andar 4".

A sala trancada é a segunda receita: mesma máquina, outro conteúdo, mais uma
tranca. O conteúdo é autoral e dialável, como `VAULT_CHEST_ITEMS` e
`VAULT_BOSS` já são. Isto é a regra "**a hero is a configuration, not a
branch**" aplicada a sala.

**Onde aparece:** piso no andar 5, uma ou duas por run, os andares sorteados
do seed da run. O piso não é ritmo — é o que garante que houve **pelo menos
quatro andares de baús** onde a chave pôde cair. Uma porta no andar 2 ficaria
impossível com frequência por sorte, não por escolha.

## Selada, e isso NÃO é o E2

Hoje a visão é só distância e **atravessa parede**, então o herói veria o
interior da sala antes de gastar a chave — e sem incerteza não há aposta.

A solução **não** é linha de visada. O `line-of-sight.md` avisa que ver
através de parede é *load-bearing*: é o que deixa o `guardCost` precificar um
desvio, e sem isso a Ganância fica inerte. Trocar a visão do jogo inteiro para
consertar uma sala é o rabo abanando o cachorro.

**Basta uma sala SELADA**: uma marca na sala, respeitada em `observe.js`, que
exclui seus tiles e suas entidades da observação enquanto a porta estiver
trancada. O resto do mapa continua exatamente como hoje. É local, é pequeno, e
não encosta em nada que o E2 quebraria.

## Quem decide abrir — e a correção

**Recomendei a Coragem. Estava errado, e o projeto já tinha escrito por quê.**

`rota-e-valor.md`, na lista "ler antes de reintroduzir":

> o escuro é aposta cega de **dois lados** — pode ser uma sala com baú, pode
> ser um ogro acordado. […] A coragem é de um lado só: desconta perigo e não
> sabe falar de recompensa, então sobre uma aposta ficaria **otimista sobre
> metade da conta**.

O dono chegou ao mesmo argumento sozinho, nesta conversa, sem ter o arquivo à
mão. **A recomendação da Coragem está morta e fica registrada como morta**,
porque a tentação de repeti-la mora num arquivo diferente do argumento contra
ela.

E as outras duas também não servem sozinhas: a **Ganância** precifica baú
visto e não há baú visto; a **Cautela** precifica o que seria revelado ao
andar, e uma sala selada não revela nada ao você chegar na porta.

### A curiosidade volta, e o registro já dizia quando

O mesmo verbete diz por que a curiosidade morreu e o que a traria de volta:

> A curiosidade **não tem pergunta** — ela só teria trabalho se o escuro
> tivesse um **VALOR** próprio para preferir, e ele só tem preço. […] **Se um
> dia o escuro ganhar valor esperado, a curiosidade volta a ter uma pergunta
> de verdade.**

Ela não foi rejeitada por ser má ideia: foi **arquivada esperando uma
condição**. Uma sala selada e autoral é o primeiro escuro do jogo que
certamente tem algo dentro e cujo tamanho se vê de fora — escuro com valor
esperado, não escuro genérico.

### A Cautela se parte em duas, e não é dial nova

O preço de um tile hoje é uma dial multiplicando **duas** coisas:

```
preço(tile) = stepCost × (1 + caution × (exposição + incerteza))
```

O próprio comentário em `config.js` admite a fusão: *"uma frase cobre as duas
— por isso dividem um multiplicador"*.

A proposta é separá-las de volta:

| dial | o que precifica | o que decide na prática |
|---|---|---|
| **Cautela** | exposição | pressa: contornar criaturas ou passar curto pelo alcance delas |
| **Curiosidade** | incerteza | explorar o desconhecido ou seguir a rota conhecida |

Isto **não é acrescentar parâmetro**: é um multiplicador que faz dois
trabalhos, o mesmo defeito que `ROOM_BIAS` e `CHEST_MIX` corrigiram em outras
partes do jogo. E responde à queixa do dono de que a Cautela hoje tem pouco
impacto — ela não é fraca, ela é duas coisas dividindo um slider, e por isso
nenhuma das duas se lê.

## A ordem de construção, e ela importa

1. **O escuro ganha valor esperado.** `rota-e-valor.md` até sugere a conta:
   `(baús do andar − vistos) × valor médio do baú`. Sem isso a curiosidade
   volta a não ter pergunta, que é exatamente por que morreu da primeira vez.
2. **A curiosidade nasce** de partir a Cautela, com a incerteza do lado dela.
3. **A sala trancada** entra como o caso extremo: o escuro de valor mais alto
   e preço mais alto do jogo.

Construir a sala primeiro põe uma porta na frente de um bot que não tem com o
que decidir abri-la.

## O que fica em aberto

- **Qual o centro da curiosidade.** Medido, não escolhido. O `fightMargin` é
  0.7 para uma luta que se **enxerga**; uma sala cega deveria pedir mais
  folga, mas quanto é pergunta para o instrumento.
- **Quantas salas por run de verdade.** "Uma ou duas" é o alvo do dono. O
  DCSS gasta o mecanismo equivalente **uma vez por partida** — e
  `dcss-layouts.md` registra o porquê: um portão que abre uma vez é um evento,
  uma porta trancada por andar é mobília.
- **O bot nunca vai PROCURAR a chave.** Ele abre o baú sem saber o que tem
  dentro e depois descobre que consegue abrir uma porta. Fazer com que ele
  planeje isso é mudança no bot, e o dono deixou para depois de ver funcionar
  sem.
