# Estratégia do bot — formalização das 3 regras

Notas de projeto para a Fase 3, derivadas dos números medidos em
`rogule-spec.md`. Não é a especificação do bot (isso vem na Fase 3); é a
tradução das três regras do dono para quantidades computáveis, mais o que os
números do jogo dizem sobre elas.

Premissa fixada em §10.1 da spec: **fog of war real com memória**. O bot lê
`Belief`, nunca `GameState`.

---

## 0. O objetivo: vencer primeiro, passos depois

Regra fixada pelo dono: **matar todos os monstros antes de tocar o santuário
é obrigatório**, não um peso. Vem da regra de casa que ele jogava com
amigos — limpar o andar inteiro aumentava a chance de fracasso, e era isso
que tornava o desafio divertido.

Mas passos são **critério de desempate, não objetivo**. Uma run de 1000
passos que vence vale mais que qualquer run curta que morre.

```
maximizar  P(vitória) − λ · passos
sujeito a  R0: santuário só é alvo válido com todos os monstros mortos
           R2: nunca escolher ação que resulte em ameaça ≥ 2
falha      morte do jogador
```

### λ — o botão de aversão a risco

`λ` tem unidade de "probabilidade de vitória por passo", e a forma legível
dele é a inversa: **quantos passos o bot paga por 1 ponto percentual de
chance de vitória.**

| λ | Comportamento | Como assiste |
|---|---|---|
| ≈ 0 | pega todo desvio seguro, nunca arrisca | metódico, vence muito, lento |
| médio | desvia pelo loot que importa | equilibrado |
| alto | vai direto ao alvo, ignora loot distante | speedrun, morre bastante |

Não é só um parâmetro de tuning — é **personalidade visível**. Vale expor ao
espectador como "cauteloso / equilibrado / imprudente" na Fase 2, porque
muda o que se vê na tela sem exigir bot nenhum a mais.

Valor inicial e curva de sensibilidade ficam para a Fase 4.

### Duas consequências

**1. O bot joga para vencer, mas não pode desistir.** As duas coisas
convivem: ele maximiza sobrevivência dentro do espaço de jogadas legais, mas
R0 proíbe a fuga para o santuário. Se está com 2 HP e sobrou um dragon, ele
luta. Isso proíbe heurística de auto-preservação que viole R0 — não proíbe
cautela.

**2. Passos não disciplinam o descanso.** Uma versão anterior deste
documento afirmava que o custo em passos do descanso bastava para impedir o
farm de regeneração. **Errado**: isso só valia enquanto passos fossem o
objetivo primário. Com vitória dominando, pagar 100 passos por 1 HP é barato,
e a jogada ótima volta a ser acampar na zona fria até encher a vida. A trava
tem que ser mecânica — ver §5.

---

## 1. Regra 1 — recursos antes de combate

### Formalização: partição fria / quente

Para cada monstro conhecido `M` na memória, e cada tile `t`:

```
frio(t, M)  ⟺  pathlen(t, M.pos) ≥ M.activation
frio(t)     ⟺  frio(t, M) para todo M conhecido
```

Enquanto o bot permanecer inteiramente na zona fria, **nenhum monstro
conhecido se move um único tile**. A zona fria é estática: os raios não
mudam porque as posições não mudam.

Então a regra 1 vira uma instrução exata:

> **Todo loot da zona fria que se pague em passos deve ser colhido antes de
> pisar em qualquer tile quente.**

Dentro da zona fria não há decisão de *risco* a tomar — só de custo. Vira um
problema de roteamento: qual subconjunto do loot frio visitar, e em que
ordem, dado que cada desvio custa passos no placar. É o caso que você
descreveu: a sala só com loot é resolvida inteira antes de encostar na sala
com monstro.

O "que se pague" é o que mudou com o placar de passos (§0). Uma cobertura a
30 tiles de distância, isolada, provavelmente não vale o desvio; a mesma
cobertura no caminho, sim. O bot resolve isso com o valor de sobrevivência
esperado do item contra o custo em passos do desvio — não com um raio fixo.

### O que o fog muda

"Frio" é sempre *dado a crença atual*. Região inexplorada pode esconder
monstro, então há três classes de tile, não duas:

| Classe | Risco | Tratamento |
|---|---|---|
| Frio e conhecido | zero | colher primeiro, sem hesitar |
| Quente e conhecido | calculável | precificar com §3 |
| Inexplorado | desconhecido | prêmio de risco fixo, ver §4 |

O caso complexo que você levantou — "andar até o loot poderia levar a um
perigo maior que uma criatura sozinha" — é exatamente o cruzamento de zona
quente para alcançar loot. Aí o loot deixa de ser grátis e passa a competir
no mesmo cálculo do §3: o custo do caminho é o HP esperado perdido ao
atravessar os raios de perseguição que ele cruza.

### O que os números dizem sobre a ambição da regra

O valor esperado de destampar uma cobertura é baixo:

- ~50% das coberturas estão vazias (spec §4)
- do que sai, só ~30% afeta combate (escudo/adaga/machado) e ~16% cura
- cada cobertura custa **2 turnos** (destampar, depois pisar)

Combinando: uma cobertura vale em média ~0.15 de item de combate e ~0.08 de
cura. Isso **não invalida a regra** — com turno de graça, colher tudo que é
frio continua estritamente correto. Mas significa que *atravessar perigo*
por uma cobertura específica quase nunca compensa, porque o prêmio esperado
é uma fração de item. Atravessar perigo por um **item de chão já visível e
identificado** (a adaga que você enxerga no chão) é outra conversa — aí o
prêmio é certo.

Distinção prática para o bot: **cobertura fechada e item revelado são dois
tipos de alvo com valores muito diferentes.** Vale separar.

---

## 2. Regra 2 — nunca dois de uma vez

Direta de implementar, porque o motor coopera: monstros não se empilham
(spec §7), então largura de corredor 1 força mecanicamente o duelo 1×1.

```
ameaça(t) = |{ M conhecido : pathlen(t, M.pos) ≤ 1 no próximo turno }|
```

Restrição dura: nunca escolher ação cujo resultado tenha `ameaça ≥ 2`.
Restrição branda: penalizar tiles com poucas saídas quando há monstro ativo
(anti-encurralamento) — mas note que **estrangulamento é bom quando você
está do lado certo dele**. Um corredor não é uma armadilha, é a ferramenta
que implementa esta regra. O bot deve *procurar* corredores quando puxa
aggro de mais de um monstro, não evitá-los.

Sob fog, `ameaça` só conta monstros conhecidos. Adjacência a um tile
inexplorado carrega risco de surpresa.

### Como ficou implementado (P3 incremento 4)

Duas correções ao que estava escrito acima, ambas por medição.

### 2.1 Procurar corredor foi medido e NÃO se paga

A metade desta regra que dizia "o bot deve *procurar* corredores quando puxa
aggro de mais de um monstro" foi construída em quatro variantes. Nenhuma
sobreviveu à medição. Está em `src/bot/bot.js` atrás de `chokepoint` e
`exposurePricing`, **ambas desligadas**.

Medido em 60–100 seeds, contra uma linha de base de 55–57%:

| Variante | Vitórias | Turnos | Travadas |
|---|---|---|---|
| linha de base | 55–57% | 136 | 0 |
| só segurar posição | 56,7% | 141 | 0 |
| procurar gargalo sempre | **45,0%** | 281 | 6 |
| procurar + comprometer | **41,7%** | 306 | 7 |
| procurar só quando cercado | 56,0% | 137 | 0 |
| preço por exposição no tile | **46,0%** | 135 | 0 |

Por que falha, e a lição vale mais que a feature:

**Um corredor compra exatamente uma coisa** — impedir que um segundo
atacante alcance o bot. Contra um perseguidor sozinho ele não compra nada,
e a caminhada até lá é paga em golpes levados no caminho. Como estar
cercado por dois é só ~27% das mortes, cobrar o reposicionamento em toda
aproximação perde dinheiro. Mirar só no caso de dois zera o prejuízo e não
gera lucro: o ganho posicional aparece tarde demais para mudar o desfecho.

**O preço por exposição foi o pior de todos** e por um motivo não óbvio:
tornar o bot avesso a terreno aberto o faz dar voltas longas, e ele acaba
passando *mais* turnos exposto do que o atalho custaria. Evitar perigo por
tile não é o mesmo que evitar perigo por run.

O texto acima — "estrangulamento é bom quando você está do lado certo dele"
— continua verdadeiro como física do jogo. Só não compensa o custo de
chegar lá.

**A regra R2 virou preço, não proibição.** Uma proibição pode deixar o alvo
inalcançável e exige maquinário de fallback; um preço alto (`CROWD_PENALTY`)
é evitado sempre que existe alternativa e degrada sozinho quando não existe.
A versão dura pertence à seleção de ação, junto com a busca tática (§4.3),
não ao planejamento de rota.

**O problema principal não era escolher lutas ruins — era ser alcançado.**
A medição que motivou este incremento perguntou, errado, se o monstro que
matou era insobrevivível no instante da morte; isso é quase tautológico. A
pergunta certa — o bot *escolheu* essa luta? — mostrou que ele escolhe
quase nunca: em 2859 turnos com monstro à vista, o ramo de "recusar luta
perdida" disparou **uma vez**. Ele passava a run inteira indo buscar loot e
era interceptado no caminho, porque toda rota era precificada só em passos.

A correção foi precificar o tile: `danger(t)` é o dano esperado por turno
gasto ali, somado sobre os monstros acordados em relação a `t` e atenuado
por distância. A rota passa a ser Dijkstra sobre custo em HP em vez de BFS
sobre passos, o que unifica "andar até lá" e "ter esta luta" numa moeda só.

Resultado em 100 seeds retidas: 39,0% para 57,0% de vitórias, e em mapas
vencíveis 39,4% para 59,6%.

---

## 3. Regra 3 — fracos primeiro

Direcionalmente certa, e vale como intuição. Mas **`xp` sozinho ordena mal**,
porque o custo de um duelo depende de `xp` *e* `hp`: `xp` diz quanto ele bate
por turno, `hp` diz quantos turnos ele dura.

```
turnos_para_matar ≈ hp_dele / dano_esperado_meu
dano_dele_por_turno = (5/6) × E[max(0, U{0..xp-1} − minha_armadura)]
HP_esperado_perdido ≈ 0.9 × (turnos_para_matar − 1) × dano_dele_por_turno
```

O `0.9` é a chance de o monstro não pular o turno; o `−1` é o último golpe,
que ele não chega a dar.

### Custo de duelo com jogador recém-nascido (xp 3, sem equipamento, 10 HP)

Dano esperado do jogador: `(5/6) × E[U{0,1,2}] = 0.833` por golpe.

| Monstro | xp | hp | HP perdido | Veredito |
|---|---|---|---|---|
| 🐀 rat | 1 | 2 | **0.0** | grátis, sempre |
| 🦇 bat | 2 | 3 | 1.0 | barato |
| 👻 ghost | 3 | 3 | 2.0 | aceitável |
| 🐗 boar | 3 | 4 | 2.9 | aceitável |
| 🐺 wolf | 4 | 5 | 5.6 | caro |
| 👹 ogre | 4 | 7 | 8.3 | quase fatal |
| 🧟 zombie | 5 | 9 | 14.7 | **letal** |
| 🧛 vampire | 6 | 8 | 16.1 | **letal** |
| 🧞 genie | 6 | 10 | 20.6 | **letal** |
| 🐉 dragon | 8 | 15 | 44.6 | **letal** |
| 🦖 t-rex | 10 | 12 | 45.2 | **letal** |

Leitura: **de mãos vazias o bot só pode lutar contra os quatro primeiros.**
Do wolf pra cima precisa de equipamento; do zombie pra cima, sem equipamento
é suicídio garantido.

Onde `xp` erra a ordenação:

- **wolf e ogre têm o mesmo xp 4**, mas o ogre custa 48% mais caro (7 hp
  contra 5). Um humano lendo "4" acima das duas cabeças escolheria errado.
- **zombie (xp 5) e vampire (xp 6)** custam praticamente o mesmo.
- **dragon (xp 8) e t-rex (xp 10)** também. O rótulo sugere uma diferença
  que não existe.

### Armadura é degrau, não rampa

Como o dano é `max(0, roll − armadura)` e o roll vai até `xp−1`, uma
armadura `A` **zera completamente** todo monstro com `xp ≤ A+1`:

| Armadura | Fica imune a |
|---|---|
| 1 escudo | 🐀 rat, 🦇 bat |
| 2 escudos | + 👻 ghost, 🐗 boar |
| 3 escudos | + 🐺 wolf, 👹 ogre |
| 5 escudos | + 🧟 zombie, 🧛 vampire, 🧞 genie |

Isso é a consequência estratégica mais forte do jogo inteiro: **o valor de um
escudo não é marginal, é de limiar.** O terceiro escudo transforma o ogre de
"quase fatal" em "grátis". A prioridade de loot do bot deve refletir isso —
escudo vale muito mais que adaga na maior parte das runs.

E armas cortam o outro lado: um machado (+2) leva o dano do jogador de 0.833
para 2.5, triplicando a velocidade de kill e reduzindo o HP perdido na mesma
proporção em *todos* os duelos.

### Sob "matar todos", a regra 3 deixa de ser sobre evitar risco

Se nenhum monstro pode ser pulado, "enfrentar os fracos primeiro" não é mais
uma forma de evitar perigo — é **construção de bola de neve**, e essa é a
justificativa forte.

O jogador ganha +1 xp a cada 2 kills (spec §5). Com 5 monstros no mapa,
matar os 4 mais baratos primeiro leva o xp de 3 para 5 antes do confronto
final. Dano esperado do jogador vai de `0.833` para `(5/6) × E[U{0..4}] =
1.667` — **exatamente o dobro**, o que corta pela metade o custo do duelo
mais caro da run.

Somando o equipamento colhido no caminho, o monstro terminal deixa de ser
inviável. Um dragon (xp 8, 15 hp) enfrentado por último, com xp 5, um
machado e dois escudos:

```
dano do jogador  = (5/6) × E[U{0..4} + 2] = 3.33  → 4.5 turnos para matar
dano do dragon   = (5/6) × E[max(0, U{0..7} − 2)] = 1.56
HP perdido       ≈ 0.9 × 3.5 × 1.56 ≈ 4.9
```

Contra os 44.6 da tabela de mãos vazias. **A ordem de execução vale mais que
qualquer item isolado** — e é por isso que a regra obrigatória é jogável em
vez de suicida.

### Reformulação da regra 3

> Ordenar alvos por **HP esperado perdido contra o equipamento atual**, não
> por xp. Reavaliar a ordem inteira sempre que o inventário ou o xp mudarem —
> um único escudo pode mover um monstro de "letal" para "grátis", e cada
> segundo kill reordena o resto do plano.

A sua intuição (sala com xp 1 antes de sala com xp 3) continua correta; o
cálculo só a estende para os casos onde o rótulo engana.

---

## 4. Como as três regras se compõem

Duas são restrições duras, uma é pontuação.

**Restrições (o bot nunca as viola):**

```
R0  santuário só é alvo válido quando kills == total_de_monstros
R2  nunca escolher ação que resulte em ameaça ≥ 2
```

**Pontuação (escolhe entre os alvos legais):**

```
score(alvo) = valor_de_sobrevivência(alvo)
            − custo_em_passos(alvo)          ; §0, o placar
            − custo_HP_do_caminho(alvo)      ; regra 1, via zonas frio/quente
            − custo_HP_do_duelo(alvo)        ; regra 3, com xp e equipamento atuais
            − prêmio_de_incerteza            ; fog: alvo em região inexplorada
```

Cinco tipos de alvo: **item revelado**, **cobertura fechada**, **monstro**,
**fronteira** (exploração) e **santuário** — este último trivial, porque
quando R0 libera não sobrou mais nada a fazer.

Ordem que deve emergir sem ser codificada: colher o loot frio que se paga →
explorar fronteira fria → matar o monstro mais barato alcançável → recolher
o que ficou frio depois da morte dele → repetir, com o custo dos duelos
caindo a cada 2 kills → santuário.

### 4.0 O bot não pode ser função pura da crença

Descoberto ao construir a P1, e vai morder na P3.

Bater numa parede **não gasta turno** (spec §6): nada muda no estado, e os
monstros não agem. Logo, um bot que decida puramente a partir da crença
atual, ao escolher uma ação que esbarra numa parede, recebe de volta
exatamente a mesma crença — e escolhe a mesma ação. Para sempre. Não é um
travamento do motor, é um ponto fixo da política.

A política de teste da P1 caiu nisso: 1200 decisões, 2 turnos jogados.

Duas defesas, e vale ter as duas:

1. **Nunca escolher uma ação que esbarre em parede.** É trivial de checar
   com a crença — o tile é conhecido e não-andável — e é o que um bot
   competente faria de qualquer forma.
2. **Carregar estado próprio** (o plano atual, ou pelo menos um contador),
   para que a política não seja função apenas da crença.

`playGame` tem um guarda `maxDecisions` separado de `maxTurns` exatamente
porque `maxTurns` não detecta esse caso — o contador de turnos nunca sobe.

### 4.1 O bot precisa saber quantos monstros existem

R0 exige comparar `kills` com o total, e sob fog o bot não descobre esse
total sozinho. Duas saídas:

- **Bot conhece a contagem** (5) como constante de jogo. Ele sabe quando
  terminou, mas ainda precisa explorar para *achar* os que faltam.
- **Bot não conhece.** Aí R0 só é satisfeita após varredura completa do
  mapa, e toda run termina com uma exploração exaustiva e chata.

**Recomendação: o bot conhece a contagem.** É coerente com a premissa que
você já fixou (o bot conhece o comportamento das criaturas), e evita a
varredura obrigatória. A tensão de "falta um, onde está?" continua existindo,
que é a parte boa.

### 4.2 O que retirei da versão anterior

Este documento antes sugeria que "limpar a sala" fosse peso alto e não regra
absoluta, com medo de o bot se matar por teimosia contra um t-rex. **Isso
está descartado por decisão do dono**, e a análise da bola de neve (§3)
mostra que o medo era exagerado: com a ordem de execução correta, o monstro
terminal é enfrentado com o dobro do dano base e o equipamento acumulado da
run inteira.

Fica como item de Fase 4 medir a taxa de morte real. Se ela vier alta demais
para ser divertida, o ajuste correto é o **balanceamento** (contagem de
monstros, densidade de loot, §10.2 da spec) — não relaxar R0.

---

## 4.3 Previsão: o bot não adivinha, ele simula

O movimento das criaturas é **determinístico**. A regra inteira (spec §7) é:
traça rota até o jogador, anda um passo, a menos que a rota seja mais longa
que o `activation`, a menos que caia o dado de 10% de pular o turno. Sem
estado escondido, sem intenção, sem memória própria.

Logo o bot não precisa de um *modelo* de previsão. Ele roda o jogo para a
frente e olha.

### O previsor é o próprio motor

O bot monta um `GameState` hipotético a partir da sua `Belief` e chama o
mesmo `step()` que o jogo de verdade usa.

Escrever um previsor separado seria o erro clássico: ele discordaria do
motor em algum caso de borda — a ordem em que as criaturas agem, o
bloqueio mútuo, o encontro que não deixa o jogador entrar no tile — e esse
desacordo produz bugs caríssimos de achar. Uma regra, uma implementação.

**Como o desconhecido entra no estado hipotético:**

| No `Belief` | No estado hipotético | Por quê |
|---|---|---|
| tile conhecido | como está | é fato |
| tile nunca visto | **andável e vazio** | deixa a rota planejar para dentro do escuro, que é como se explora |
| criatura lembrada fria | onde está | provadamente parada, ver abaixo |
| criatura lembrada quente | onde estava | hipótese; envelhece |

Tratar o inexplorado como vazio é otimista de propósito: a compensação não
vem de fingir perigo no mapa, vem do **prêmio de incerteza** na pontuação
de alvo (§4). Misturar as duas coisas — inventar monstros imaginários no
escuro *e* penalizar o escuro — contaria o mesmo risco duas vezes.

### Por que isso é busca, e não previsão

As criaturas perseguem a posição **atual** do jogador. Então "onde o lobo
estará em 3 turnos" não é uma pergunta bem formada — só existe "onde o lobo
estará em 3 turnos **se eu andar por aqui**".

Previsão e planejamento são o mesmo problema. Por isso a estrutura é uma
busca sobre as próprias sequências de ação, com as criaturas resolvidas por
simulação dentro de cada ramo. De brinde, a simulação acerta o acoplamento
entre elas: como criaturas se bloqueiam mutuamente, a posição de uma depende
da outra, coisa que um previsor artesanal erraria.

### O dado de 10%: assumir que nunca cai

Planejar como se as criaturas **sempre** agissem. É pessimista nos dois
sentidos — elas fecham a distância o mais rápido possível e sempre dão o
golpe delas — e mantém a busca determinística, sem ramificar em sorte.

O bot então nunca é surpreendido por uma criatura chegando *antes* do
previsto. O 10% só pode beneficiá-lo.

### Duas escalas de tempo

Busca profunda só cabe onde é barata:

- **Estratégica — qual objetivo.** Qual criatura, qual loot, para onde
  explorar. Distâncias e custo de duelo, sem simular turno a turno, horizonte
  longo. Recalcula quando a situação muda.
- **Tática — qual ação neste turno.** Dado o objetivo, simula 3 a 5 turnos à
  frente com o motor. É onde se responde "chego no corredor antes de ele
  cortar o caminho?" e "atacar agora ou esperar, quem dá o primeiro golpe?".

### Orçamento medido

Um turno simulado custa **0,029 ms** (medido em 2026-08-05, mapa com 5
criaturas vivas). Árvore completa por decisão:

| Profundidade | Largura 5 | Largura 3 (podada) |
|---|---|---|
| 3 | 4,4 ms | 1,1 ms |
| 4 | 22 ms | 3,4 ms |
| 5 | 112 ms | 10 ms |
| 6 | 560 ms | 31 ms |

A poda de 5 para ~3 tira: ações que batem em parede conhecida, ações que
violam R2, e ações que nem avançam para o objetivo nem recuam.

**Alvo: profundidade 5 podada, ~10 ms por decisão**, o que dá alguns
segundos por run inteira. E na maioria dos turnos não há ninguém no raio —
aí basta profundidade 1, que é o mapa de ameaça. A busca funda só liga com
algo ao alcance, então a média fica bem abaixo disso.

Como a run é calculada inteira antes de ser exibida (P2), esse custo é
invisível para quem assiste.

### 4.4 A busca tática foi construída e NÃO se pagou

Resultado negativo, registrado para não ser refeito por engano. Está em
`src/bot/tactics.js` e `src/bot/hypothetical.js`, atrás da opção
`tactical`, **desligada por padrão**.

Medido em 12 seeds, profundidade 3:

|  | vitórias | kills | turnos | ms/run |
|---|---|---|---|---|
| desligada | 5 | 2,83 | 97 | 78 |
| ligada | 4 | 3,33 | 157 | 740 |

Luta visivelmente melhor e não ganha mais. Dez vezes o custo.

Três armadilhas encontradas no caminho, todas de avaliação e nenhuma de
simulação — o motor como previsor funcionou exatamente como projetado:

1. **Escolher em vez de vetar.** Com passo valendo 0,01 HP e um golpe 0,83,
   recuar sempre pontua melhor que avançar. Solta, a busca anda em círculos:
   turnos 128 → 513, vitórias 3/6 → 0/6. Ela precisa de poder de veto sobre
   o plano estratégico, nunca de escolha livre.
2. **Perigo contado duas vezes.** O `costToGoal` estava ponderado por
   perigo, então os tiles em volta do alvo ficavam caros e *aproximar-se do
   monstro que ela decidiu matar* pontuava como afastar-se. A simulação já
   mostra o dano no HP; a distância restante deve ser só passos.
3. **Dano causado era invisível.** HP perdido era custo puro e HP tirado do
   monstro não valia nada, então nenhuma luta se justificava. Creditar o
   dano causado ao par com o recebido consertou o dithering (turnos 364 →
   157, travamentos 4 → 1). Faz sentido: sob R0 todo monstro precisa morrer,
   então HP tirado de um vale quase o mesmo que HP guardado.

O que provavelmente falta, para quem retomar: o horizonte de 3 turnos é
curto demais para as decisões que justificariam a busca — recuar até um
corredor, escolher onde aceitar o encontro. Essas levam de 5 a 10 turnos e
o custo cresce rápido. Vale mais atacar o problema de raio longo (genie,
vampiro) na camada estratégica, decidindo *onde* travar a luta, do que
simular fundo.

### A incerteza que sobra, e como medi-la

Duas fontes, nenhuma precisando de constante mágica:

**Criatura lembrada.** Uma que estava **fria** quando vista pela última vez
está provadamente no mesmo lugar — criaturas fora do `activation` não se
movem nunca (spec §7). Memória fria é fato; memória quente é hipótese que
envelhece ~1 tile por turno. O bot marca a diferença em vez de tratar toda
memória como igualmente duvidosa.

**Espaço inexplorado.** Como o bot conhece o total de criaturas (§4.1), ele
sabe exatamente quantas ainda não localizou. O prêmio de incerteza é função
desse número: com 4 mortas e 1 sumida, o escuro assusta muito mais do que
com todas as 5 já avistadas.

---

## 5. Teto de regeneração

O original permite curar indefinidamente parado em zona fria. Como o bot
maximiza vitória e passos são só desempate, ele **vai** descobrir e explorar
essa jogada: acampar até HP cheio antes de cada duelo torna o HP irrelevante
e a run inteira mecânica. É a tática não-divertida que o dono identificou.

Divergência deliberada do original, especificada em `rogule-spec.md` §13:
**a regeneração passiva tem um teto por run** (default 20% do HP máximo).
Poções 🥃 não contam contra o teto.

Consequência estratégica, e é a que importa: **HP vira recurso não-renovável.**
Cada ponto perdido num duelo é permanente, salvo poção. Isso é o que dá peso
de verdade à regra 3 — a ordem dos duelos deixa de ser otimização de margem
e passa a determinar se a run termina. E dá função real à poção, que no
original é quase irrelevante perto de um regenerador infinito.

Também elimina a jogada degenerada de "recuar, curar, voltar" como resposta
padrão a HP baixo. Sem ela, a única resposta a HP baixo é **jogar melhor**:
escolher duelos mais baratos, buscar escudo antes, usar corredor.
