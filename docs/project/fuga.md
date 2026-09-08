# A fuga

**Status: desenho, nada construído.** Escrito antes de qualquer código, no
fim de uma sessão que mediu escudo contra poção na loja e concluiu que
nenhum preço e nenhum valor de cura os torna uma escolha. Este é o item que
sobrou da conversa, com o que o dono decidiu e o que ainda está aberto.

Leitura relacionada: `items.md` (🌀 e 🔮 são "os únicos itens que respondem
a um objetivo primário diretamente"), `vault-irrecusavel.md` (a sala é um
pedágio, e por quê), `decisions.md` "The wallet kept the receipt" (as quatro
medições que levaram aqui), `docs/bot.md` "Como um turno é decidido" (o
portão da luta, que é onde a fuga se encaixa).

---

## De onde veio

A pergunta era: como fazer escudo e poção serem uma escolha na loja, em vez
da ordem fixa machado → adaga → escudo → poção. Medido no chain (24 chains ×
30 runs, seeds pareadas), em quatro rodadas:

- Nos preços de hoje, poção-primeiro empata em profundidade e moedas e
  perde o porco por 2 sigma. A poção compra a abertura (mortes até o andar 3
  caem de 14% para 10%) e isso não converte em nada.
- Sem a adaga na ordem, as duas pilhas perdem para a adaga em tudo.
- Com `heal` 5 ou 6 a 2 moedas, o escudo vence por mais de 2 sigma em tudo,
  e `heal` nem é um dial da loja: é o valor da única poção da tabela, então
  muda todo baú e o vault. O jogo vira bola de neve antes de a poção comprada
  valer alguma coisa.

A razão é estrutural, não numérica: **o gargalo do jogo é dano, não hp**
(U6h). Toda decisão passa pelo duelo do porco, e nele armadura sem custo de
turno vence uma cura que custa um turno (dois golpes do speed 2) e só entra
com o herói já ferido. Qualquer par de itens que são os dois "hp em outra
forma" é decidido ali, e sempre pelo mesmo lado.

**Conclusão do dono:** a poção precisa fazer algo que não seja hp. Três
candidatas foram consideradas:

| candidata | o que cobre | por que caiu |
|---|---|---|
| estamina (bebida pelo motor quando o orçamento acaba) | morte por tempo | Ganância baixa mal pega poção e não morre de tempo; Ganância alta anda mais, morre de tempo e acha poção de graça. Provavelmente inerte. Testável por uma leitura barata (timeouts por banda), parada |
| renda (dobra as moedas da travessia) | o objetivo de farmar | valoriza ainda mais a Ganância alta, que já vence a baixa; e o bot não persegue moeda por regra |
| **fuga** | **a luta que ele já entrou e está perdendo** | **é a que sobra** |

## O que é

Um item de uso único. Usado, **tira o herói do combate**: ele reaparece num
tile já revelado, andável, fora do raio de perseguição de toda criatura
acordada, escolhido pelo rng da run (determinismo intacto: mesma seed, mesma
fuga). O turno é gasto. O item some.

**Não é a escada.** Aparecer no buraco seria pular o andar, e um item que
pula andares é outro item, mais forte, com outra pergunta.

## Por que existe

O `items.md` já dizia: o bot "decide antes de uma luta se ela é
sobrevivível e não tem verbo para sair de uma que já entrou. Cercado, não há
movimento nenhum — a esperança ali é zero por falta de opções, não por
probabilidade." A fuga é esse verbo.

Ela responde exatamente ao que hp não responde. Hp devolve o herói **à luta
que ele perde**; a fuga o tira dela, com as moedas dos andares anteriores no
bolso. É a métrica de reversão do `objectives.md` num item: uma run que ia
acabar continua, com o resultado ainda aberto.

E é o único contra-golpe ao speed 2. Hoje o vault é binário (U6h: em 1.741
engajamentos, zero runs trocaram golpes com o porco e chegaram vivas ao andar
5 sem matá-lo) porque recuar de um perseguidor mais rápido não devolve
distância. Com a fuga, entrar no vault deixa de ser "mata ou morre" e vira
"entra, tenta, sai".

## Decisões já tomadas com o dono

- **Uma fonte só, primeiro.** Raridade em baú e desbloqueio fixo são dials
  a mais; entram depois, se o item provar que vale.
- **A fonte primeira é a loja, a preço alto.** Responde à pergunta original
  (uma alternativa real ao escudo, no slot caro em vez do troco) e custa um
  valor só. Um item raro em baú o herói acha sem ter escolhido, o que dilui a
  aposta.
- **Quem decide é o bot, lendo só Belief.** Nada no motor dispara sozinho.

## O que ainda está aberto

1. **O gatilho.** A forma proposta é a da seringa (B34, `bot.md`): a luta em
   curso foi recusada pelo portão (`duelCost` acima da barra, lido com os
   golpes já dados descontados) **e** o perseguidor é inescapável — adjacente
   ou mais rápido que o herói. Um passo antes de morrer, não no último hp:
   B29 e B33 mostraram que a média engana na hora em que qualquer golpe mata.
   A questão em aberto é se `velocidade` pode entrar nessa regra. Hoje
   `duelCost` não a lê de propósito (M44), e é isso que faz o bot entrar no
   vault; a fuga leria a velocidade **só para sair**, nunca para precificar a
   entrada. Isso preserva o truque da sala ou o desmonta? Decidir antes de
   codar, com o M44 aberto ao lado.
2. **Para onde.** "Tile revelado fora de todo raio de perseguição" pode não
   existir num andar cheio. O que fazer então: o tile mais longe de toda
   criatura acordada, ou a fuga falhar (some e nada acontece)? Falhar é mais
   honesto e mais barato de construir; o bot precifica a fuga por Belief e
   pode errar, que é o que uma aposta é.
3. **O que o traço da run registra**, para a medição ler: fugas por run,
   de que criatura, com quanto hp, e o que aconteceu depois (morreu no
   mesmo andar, desceu, voltou e matou).
4. **O preço.** Sem régua ainda. A régua de hp (`shop.js`) não serve: o item
   não vale hp, vale a diferença entre morrer e não morrer, e isso depende da
   banda. É o primeiro item cujo preço precisa sair da medição por banda,
   não de um valor por unidade.

## O risco que muda a régua do E2

O porco fica mais barato de tentar e mais barato de abandonar. As mortes no
andar 4 (45% das runs) eram o custo do vault; com a fuga, o custo vira "gastou
os turnos e não pegou nada". A faixa-alvo do E1 (~1–2% de porco morto por run
encadeada, "horas de idle") tem que ser re-lida com o item na prateleira. Se
a fuga transformar o vault em treino grátis, o preço sobe até deixar de ser
grátis — ou o item volta para a gaveta.

## Como medir

O critério é do dono, e é diferente de tudo que foi medido até aqui:
**mudança de comportamento por banda, complementar, com a média geral
parada.** Um item que só desloca a média é buff; um que só move uma banda é o
que se quer.

**Protocolo:** com e sem o item na prateleira, seeds pareadas, 24 chains ×
30 runs por célula, nas pontas e no centro de cada dial (Coragem, Ganância,
Pressa: 7 configurações). `tools/e2-sweep.mjs` já põe um item extra na
prateleira a um preço (`rung`); a instrumentação está pronta, o que falta é o
motor e o bot.

**Aceita se, e só se, os três valem:**

- (a) **os wires compartilhados não se movem na média geral** acima de 2
  sigma: porco, clear, profundidade, moedas, mortes na abertura, shamble;
- (b) **por banda os deltas têm sinais opostos** em algum par: favorece uma
  configuração, desfavorece outra, cada lado com 2 sigma;
- (c) **o comportamento muda de forma visível:** taxa de entrada no vault,
  fugas por run, mortes por causa (dano / tempo / porco), andar da morte,
  e a taxa de uso do item (comprado e nunca usado é troco, não escolha).

**O que NÃO aceita:** o item vencer em toda banda (é buff, e o preço está
baixo), ou empatar em toda banda (é inerte, como o par escudo/poção).

Chain é uma amostra; delta pareado por chain; nada explicado abaixo de 2
sigma. E o item tem que ser **visto** — uma fuga do vault com `?dev=1&hold=`
é o que diz se aquilo parece uma reversão ou um bug.

## Ordem de construção

1. O motor: a ação `flee`, o tile de destino, o traço. Teste: mesma seed,
   mesmo destino; nenhum tile dentro de um raio de perseguição; falha quando
   não há tile.
2. O bot: o gatilho, com a decisão do ponto 1 acima tomada. Teste: no vault,
   com o porco adjacente e a barra estourada, ele foge; com o duelo ainda
   pagável, não.
3. A prateleira: o item a um preço provisório, só para medir.
4. O protocolo acima. O preço final sai dele.
5. Só então: `rules.md` §5 e §9, `bot.md`, a linha em `balance.md`, e a
   decisão sobre baú/desbloqueio.
