# Trade-offs — o framework de toda escolha

**Diretriz do dono, 2026-10-04.** Toda ação ou escolha do jogo tem um
trade-off. Este documento diz o que isso significa com precisão suficiente
para TESTAR uma escolha — antes de construí-la e depois de vê-la jogar.

Ele não substitui `objectives.md` ("What a choice has to be": visível, errada
às vezes, atribuível, informada) nem `dials.md` (faixas equivalentes sozinhas,
a combinação é que importa). Ele dá a esses dois a forma e o teste.

## O exemplo de onde ele saiu: andar e correr no CS2

Ao se mover, o jogador tem duas opções e nenhuma outra. **Correr** é rápido e
barulhento — quem estiver ouvindo sabe onde ele está. **Andar** é lento e
silencioso. A escolha é boa por três razões, e cada uma é um pilar abaixo.

1. **Não se sabe se há alguém ouvindo.** A informação que decide a escolha
   existe, mas está escondida. O raciocínio normal é pessimista — "se um
   inimigo PODE estar ali, ele está" — e por isso correr é sempre uma aposta
   consciente contra o pior caso, nunca um descuido.
2. **Os dois lados valem muito, e quase o mesmo.** Velocidade vale muito no
   jogo (tamanho do mapa, tempo de rodada, chegar antes na posição, ser alvo
   mais difícil); a posição de quem corre vale muito para o inimigo. Correr é
   apostar: "entrego uma vantagem a ele porque vou usar melhor a que ganhei".
3. **Não existe opção neutra.** É um botão: apertado ou solto, com o mesmo
   saldo esperado. Não há o meio-termo que nunca erra feio.

## A forma

Duas opções gastam **o mesmo orçamento em eixos opostos**. Com `v` o que se
ganha e `b` o que se paga, e `c` a intensidade:

```
opção A:  v × c,   b × c
opção B:  v ÷ c,   b ÷ c
```

As duas mantêm `v / b` — nenhuma tem "mais" no total. Quem escolhe entre elas
é o **contexto**: o valor de uma opção numa situação é `peso_v × v − peso_b × b`,
e os pesos mudam com o que está acontecendo (há alguém ouvindo? quanto tempo
resta?).

**`c` é o peso da decisão.** Perto de 1, as duas opções quase se confundem e
escolher não importa. Grande, cada uma é extrema, e errar custa caro. Uma
escolha que ninguém sente tem `c` pequeno demais; uma que decide sozinha o
destino da run tem `c` grande demais.

## Os três pilares

### 1. Incerteza sobre o contexto, lida de forma pessimista

O que decide a escolha tem de estar **parcialmente legível** antes dela:
- informação certa → a escolha é óbvia, vira resposta;
- nenhuma pista → a escolha é cara ou coroa, vira loteria;
- o bom fica no meio: dá para inferir, não para saber.

É o "Informed" de `objectives.md` com o outro lado escrito: informada, mas
**nunca completamente**.

### 2. O ganho vale quase o mesmo que a perda

Os dois eixos têm peso ALTO e quase proporcional. Se valem pouco, a escolha é
irrelevante; se valem muito diferente, ela é óbvia. E porque valem muito, o
resultado da aposta é atribuível — quem ganhou sabe por quê, quem perdeu
também.

### 3. Binário, sem neutro

Toda decisão é tomar partido. Uma terceira opção "do meio" que protege dos
dois erros mata a escolha, porque vira o padrão de quem não quer pensar. Para
evitá-la: ou as opções são discretas, ou o meio da curva rende MENOS que a
média das pontas.

## A diferença deste jogo: a aposta é feita antes

No CS2 o jogador aperta o botão a cada segundo, lendo o momento. Aqui quem
aperta a cada turno é o **bot** — e ele já raciocina como o pilar 1 descreve:
pessimista sob neblina (chuta a vida das criaturas pela média, supõe o pior no
escuro, precifica o perigo dos tiles). O jogador aposta **antes da run**, na
configuração.

Então o contexto incerto do jogador não é "tem alguém ouvindo?", é **"o que
esta run — ou este dia — vai trazer?"**. Três consequências:

- **O pilar 1 pede variação entre runs que o jogador consiga meio prever.**
  Uma seed diária, um debuff do dia, um andar temático anunciado: algo que
  mude a resposta certa de um dia para o outro sem a entregar. Sem isso, toda
  escolha tem uma resposta permanente e o jogador só precisa descobri-la uma
  vez (`dials.md` diretriz 4; U11 em `candidates.md`).
- **O pilar 2 se mede pela FREQUÊNCIA com que cada lado é o certo**, sobre as
  situações que o jogo realmente gera — não sobre as que se imagina. Uma
  opção justa na curva mas cujo contexto favorável quase nunca acontece é um
  upgrade disfarçado do outro lado.
- **O pilar 3 conflita com sliders.** Os dials são contínuos; o meio de cada
  um pode ser exatamente a opção neutra que o pilar proíbe.

## O checklist

Para cada ação, item, herói, dial ou decisão de loja:

1. **Dois eixos com nome.** "Rápido × barulhento", "área × ritmo". Se não dá
   para nomear o que se perde, não há trade-off.
2. **Nenhum domina.** Existe um contexto plausível em que cada opção ganha?
3. **Frequência.** Em que fração das situações reais cada uma ganha? Medido
   pelo COMPORTAMENTO e pelo contexto que o jogo gera (`dials.md`, o método),
   nunca imaginado.
4. **Contexto parcialmente legível** antes da escolha — nem certo, nem cego.
5. **Visível na tela.** Dá para dizer qual foi escolhida assistindo trinta
   segundos.
6. **Sem neutro que proteja.**
7. **`c` sentido, não decisivo.** Errar dói; errar uma vez não condena a run.

## Passada nas escolhas atuais

Estado em 2026-10-04. Leitura de desenho, não medição — onde diz "verificar",
é o checklist pedindo um número que ainda não foi tirado.

| escolha | eixos | o que passa | o que falha ou está aberto |
|---|---|---|---|
| **Mangual** | área × ritmo | 1, 2, 5 (a corrente gira, o herói para), 6 (carregar ou não) | **3**: quase todo golpe do jogo normal é duelo, então o lado bom raramente aparece — o defeito é o contexto, não o item. Junto com um machado, perde no duelo e ganha cercado, o que mantém 2 |
| **Ordem da loja** | um item bom × vários pequenos | 1, 6 (a ordem é uma lista, não um meio-termo) | **2, 3**: a medição "Active against idle" (`decisions.md`) achou a ordem padrão um jogador forte e as alternativas sem espalhar o resultado — os saldos são pequenos demais para a ordem pesar. **4**: o jogador não sabe o que a próxima run pede |
| **Dials** (Coragem, Ganância, Pressa) | arriscar × preservar, desviar × seguir, rapidez × leitura do escuro | 1, 5 (`dials.md` mede comportamento) | **6**: contínuos — verificar se o meio de cada um é a escolha que nunca erra. A revisão de 2026-08-29 fez das pontas "personagem"; o pilar pede que as pontas sejam ESCOLHAS, não só personagem |
| **Pawa** | gastar agora × gastar no fim | 1 (cada andar já vira chapa; a moeda não chega à loja), 5 | 3: verificar se "agora" ganha sempre — um herói que nunca tem motivo para guardar não está apostando |
| **Papazito** | informação × vida | 1, 5 | **2**: a análise de chains o mediu dominante (informação vence força nos mapas temáticos). A resposta foi movê-lo para o degrau difícil, não dar a ele um custo — o checklist pede o custo |
| **Ricardo** | saber o baú × vida | 1, 5 | 2: verificar se saber o conteúdo custa o que vale |
| **Vito** | força cedo × ? | 5 | **1**: o segundo eixo não tem nome. Começar armado é ganho; o que ele perde não está escrito |
| **Herói base** | — | é a régua, não uma escolha | — |
| **A fuga** (gaveta) | sair da luta × perder o turno e o andar | 1, 6 | **2**: medida e reprovada duas vezes — o ganho não pagava o custo (`fuga.md`). O checklist explica por quê, e onde ela voltaria |
| **Portal do inferno** (desenho) | gastar o ingresso agora × esperar uma pilha melhor | 1, 2, 3, 6 no papel | não construído — é o primeiro desenho que nasce já passando no checklist |

## Como usar

- **Antes de construir**, preencher a linha da tabela acima para a escolha
  nova. Um eixo sem nome ou um contexto que nunca acontece é motivo para
  redesenhar antes do código, não depois da medição.
- **Depois de construir**, o item 3 é o que se mede — e mede-se com o
  instrumento que já existe (`run-check.html`, `node tools/measure.mjs`),
  contando situações e comportamento, não só profundidade e vitórias.
- **Quando uma escolha falha no 3**, a primeira pergunta é se o defeito é a
  escolha ou o contexto. O mangual não precisa de mais dano: o jogo precisa de
  lugares com grupos. Corrigir o número para compensar o contexto é ajustar um
  parâmetro para compensar outro, que é o que `CLAUDE.md` proíbe.
