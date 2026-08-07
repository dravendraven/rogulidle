# Estratégia do bot — formalização das 3 regras

Notas de projeto para a Fase 3, derivadas dos números medidos em
`rogule-spec.md`. Não é a especificação do bot (isso vem na Fase 3); é a
tradução das três regras do dono para quantidades computáveis, mais o que os
números do jogo dizem sobre elas.

Premissa fixada em §10.1 da spec: **fog of war real com memória**. O bot lê
`Belief`, nunca `GameState`.

---

## 0. O objetivo: vencer primeiro, passos depois

> **Revisado.** A versão original desta seção fixava **matar todos os
> monstros antes do santuário** como obrigação do bot. Isso mudou por decisão
> do dono, junto com o redesenho de mapa: *"não há mais obrigação de matar
> tudo, desde que o design do mapa obrigue o bot a matar o suficiente para
> chegar no shrine"*. O texto abaixo é a regra em vigor; o que ela substituiu
> está em §0.1.

**R0 virou regra de mapa, não regra de bot.** A geração põe ~70% da massa de
ameaça do andar na rota obrigatória até o santuário (`src/sim/spine.js`), de
modo que **chegar ao santuário já significa ter brigado com a maior parte
dela**. O bot só é proibido de sair enquanto algo *obrigatório* que ele
conheça continuar vivo.

Passos são **critério de desempate, não objetivo**. Uma run de 1000 passos
que vence vale mais que qualquer run curta que morre.

```
maximizar  P(vitória) − λ · passos
sujeito a  R0: santuário só é alvo válido sem nenhum monstro de ESPINHA
               conhecido vivo  (`requireClear`, ver abaixo)
           R2: nunca escolher ação que resulte em ameaça ≥ 2
falha      morte do jogador
```

`requireClear` tem três valores, e os três continuam medíveis porque a
mudança precisava ser comparável com o que ela substituiu:

| valor | significado |
|---|---|
| `spine` | **em vigor.** Sai quando nada obrigatório conhecido está vivo |
| `all` | o R0 antigo: kills == total de monstros |
| `none` | sem restrição, pode correr para a escada a qualquer momento |

Monstros **não vistos** não contam. O bot não tem como saber se um bicho que
nunca viu está na rota — e não precisa: o que é obrigatório está, por
construção, entre ele e o santuário, então andar até lá os encontra.

### 0.1 Por que a regra dura saiu

Ela vinha da regra de casa que o dono jogava com amigos: limpar o andar
inteiro aumentava a chance de fracasso, e era isso que tornava o desafio
divertido. Continua sendo verdade — o que mudou é **quem impõe**.

Com salas laterais no mapa, forçar a limpeza por decreto apagava a escolha
que elas existem para oferecer. Medido antes da mudança: proibir o desvio,
exigir o desvio e permitir o desvio davam masmorras **idênticas**, porque o
bot limpava tudo de qualquer jeito.

**Aviso honesto:** trocar a regra ainda não fez a escolha existir. Medido em
50 descidas, o bot abre 87% dos baús laterais tanto nas salas favoráveis
quanto nas desfavoráveis (z = 0,64). Ver `docs/map-design.md`.

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

**1. O bot joga para vencer, mas não pode desistir do que é obrigatório.**
As duas coisas convivem: ele maximiza sobrevivência dentro do espaço de
jogadas legais, mas R0 proíbe a fuga para o santuário enquanto houver
monstro de espinha vivo. Se está com 2 HP e sobrou um dragon **na rota**, ele
luta. Um dragon numa **sala lateral**, não — aquele é decisão econômica, e
recusar é jogada legal.

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

O "que se pague" é o que mudou com o placar de passos (§0). Um baú a
30 tiles de distância, isolada, provavelmente não vale o desvio; o mesmo
baú no caminho, sim. O bot resolve isso com o valor de sobrevivência
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

O valor esperado de abrir um baú é baixo:

- ~50% dos baús estão vazios (spec §4)
- do que sai, só ~30% afeta combate (escudo/adaga/machado) e ~16% cura
- cada baú custa **2 turnos** (abrir, depois pisar)

Combinando: um baú vale em média ~0.15 de item de combate e ~0.08 de
cura. Isso **não invalida a regra** — com turno de graça, colher tudo que é
frio continua estritamente correto. Mas significa que *atravessar perigo*
por um baú específico quase nunca compensa, porque o prêmio esperado
é uma fração de item. Atravessar perigo por um **item de chão já visível e
identificado** (a adaga que você enxerga no chão) é outra conversa — aí o
prêmio é certo.

Distinção prática para o bot: **baú fechado e item revelado são dois
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
dano_dele_por_turno = (5/6) × E[U{0..xp-1}]
HP_esperado_perdido ≈ 0.9 × (turnos_para_matar − 1) × dano_dele_por_turno
```

O `0.9` é a chance de o monstro não pular o turno; o `−1` é o último golpe,
que ele não chega a dar.

O que o herói veste não aparece nessa conta: armadura virou HP extra, então
ela muda quantos golpes ele aguenta, não o tamanho de cada um.

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

### Armadura era degrau — agora é rampa

> **Substituída.** Armadura deixou de reduzir dano e passou a ser HP máximo
> extra (spec §13.2). O que segue é o que *era* verdade, mantido porque
> explica por que a mudança precisou acontecer.

Com `max(0, roll − armadura)` e o roll indo até `xp−1`, uma armadura `A`
**zerava completamente** todo monstro com `xp ≤ A+1`:

| Armadura | Ficava imune a |
|---|---|
| 1 escudo | 🐀 rat, 🦇 bat |
| 2 escudos | + 👻 ghost, 🐗 boar |
| 3 escudos | + 🐺 wolf, 👹 ogre |
| 5 escudos | + 🧟 zombie, 🧛 vampire, 🧞 genie |

Cada ponto apagava uma faixa inteira da tabela, e depois de ~5 não sobrava
nada para anular. Numa run de um andar isso era uma reviravolta boa; numa
descida de dez andares era o que travava tudo, porque o herói ficava
invulnerável no andar 3 e nenhuma curva de dificuldade alcança isso.

**Hoje:** um escudo dá +3 de HP máximo e cura 3. Cada um vale o mesmo que o
anterior, sem degrau e sem saturação — a força do herói vira linear, que é o
que a curva de progressão precisa. Nada nunca fica inofensivo.

Para o bot, isso simplifica duas coisas: o valor de um escudo é constante
(+3, sempre) em vez de depender de quais monstros restam, e o dano de um
monstro deixa de depender do equipamento do herói.

Armas continuam cortando o outro lado, e agora são o único item cujo valor
depende do que sobrou para matar.

### A ordem de matar importa por causa das armas

> **Revisado.** Esta seção argumentava que a bola de neve vinha do xp. O xp
> deixou de crescer (balance.js) e a armadura deixou de reduzir dano, então
> o argumento foi refeito com o que sobrou: armas e HP acumulado.

Se nenhum monstro pode ser pulado, "enfrentar os fracos primeiro" não é
evitar perigo — é ordenar para que o confronto caro aconteça no momento mais
forte da run.

Duas coisas se acumulam, e elas agem em lados diferentes:

- **Armas** encurtam cada luta. Um machado leva o dano de `0.833` para
  `(5/6) × E[U{0..4}] = 1.667` com a rolagem alargada — o dobro, o que corta
  pela metade os turnos que o monstro tem para revidar.
- **Escudos** compram golpes absorvidos, +3 de HP máximo cada. Não mudam o
  custo de um duelo; mudam quantos duelos cabem antes do fim.

O monstro terminal continua sendo o caso de teste. Um dragon (xp 8, 15 hp)
bate `(5/6) × E[U{0..7}] = 2.92` por golpe, **sempre** — nenhum equipamento
reduz isso. Com um machado, matá-lo leva ~9 turnos e custa cerca de 21 HP,
o que só é pagável com escudos acumulados suficientes.

É uma economia mais honesta que a anterior: o dragon nunca vira grátis, ele
vira **financiável**.

### Reformulação da regra 3

> Ordenar alvos por **HP esperado perdido contra o equipamento atual**, não
> por xp. Reavaliar sempre que uma **arma** entrar no inventário, já que ela
> encurta todos os duelos restantes de uma vez.
>
> Escudos não reordenam nada — eles não mudam o custo de duelo nenhum, só o
> saldo disponível para pagar. Um monstro nunca passa de "letal" a "grátis";
> ele passa a caber no orçamento.

A sua intuição (sala com xp 1 antes de sala com xp 3) continua correta; o
cálculo só a estende para os casos onde o rótulo engana.

---

## 4. Como as três regras se compõem

Duas são restrições duras, uma é pontuação.

**Restrições (o bot nunca as viola):**

```
R0  santuário só é alvo válido sem monstro de ESPINHA conhecido vivo
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

Cinco tipos de alvo: **item revelado**, **baú fechado**, **monstro**,
**fronteira** (exploração) e **santuário**. O santuário deixou de ser
trivial: sob `spine` ele libera com salas laterais ainda de pé, então sair
passa a competir de verdade com continuar saqueando.

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

Escrito quando R0 era "matar todos", e a razão original **caducou**: sob
`spine` a saída não compara `kills` com total nenhum, só checa se algo de
espinha conhecido continua vivo. A contagem sobreviveu por outro motivo, e
ele é mais forte.

**Precificar equipamento exige saber quanto falta matar.** Uma arma vale
exatamente o HP que economiza no que resta (`loot.js`), então sem a contagem
o bot atribuiria valor zero a gear sempre que não visse nada — justamente a
hora de se armar. `monstersStillToFight` preenche o que falta com estimativas
medianas.

O mesmo raciocínio se estende para baixo: gear pega no andar 3 é usada nos
andares 4 a 10, então `monstersAhead` soma os andares seguintes pela lei de
crescimento, descontados por `LOOT_CAMPAIGN_HORIZON` — contar todos a valor
de face suporia que o herói vive para usá-los.

**O bot conhece a contagem** (`BOT_KNOWS_MONSTER_COUNT`). Coerente com a
premissa de que ele conhece o comportamento das criaturas, e evita a
varredura obrigatória do mapa. A tensão de "falta um, onde está?" continua.

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

> **Nota posterior.** R0 acabou sendo relaxada mesmo assim (§0), mas não
> como saída de emergência para a taxa de morte: por decisão de design, para
> que salas laterais fossem uma escolha. O conselho acima continua valendo —
> afrouxar a regra para consertar dificuldade é tratar o sintoma.

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

### 4.4 A busca tática paga em profundidade 1, e só nela

**Ligada por padrão, com `TACTICAL_DEPTH = 1`.** Em profundidade 1 ela é
exatamente o que o plano original pedia: simular a resposta das criaturas ao
passo que o bot vai dar, e recusar o passo que o deixa entre duas.

Medido em 60 seeds retidas (400–459):

|  | vitórias | kills | dano/kill | golpes/kill | turnos |
|---|---|---|---|---|---|
| desligada | 31 | 3,50 | 2,67 | 3,52 | 129 |
| profundidade 1 | **37** | **3,68** | **2,24** | **2,76** | 181 |
| profundidade 3 | — | 3,63 | 2,45 | **11,01** | 214 |

Somando duas famílias de seeds, 58 contra 55 vitórias em 100 — empate — mas
todas as métricas de comportamento apontam junto. O custo é 1,8× por run,
invisível para quem assiste, já que a run é calculada antes de ser exibida.

**Profundidade 3 é pior que profundidade 1**, e o número que denuncia é
`golpes/kill`: 11,01 contra 2,76. Ela não esquiva, ela **hesita** — fica
colada em monstros absorvendo ataques fracos em vez de resolver a luta. Ver
as três armadilhas abaixo: são todas formas da mesma doença, uma avaliação
de horizonte curto que consegue "não apanhar" simplesmente não lutando.

> **Lição de método.** Eu descartei esta feature inteira uma vez, medindo só
> taxa de vitória em profundidade 3. A taxa de vitória mistura qualidade do
> bot com dificuldade do mapa, e profundidade 3 era a única variante testada.
> Métricas de comportamento (dano e golpes por kill) mostraram o oposto, e a
> variante barata que a especificação original pedia nunca tinha sido
> medida sozinha.

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
   157, travamentos 4 → 1). Fazia sentido sob a R0 dura, onde todo monstro
   precisava morrer, então HP tirado de um valia quase o mesmo que HP
   guardado. Sob `spine` isso vale para os monstros de espinha e passa a ser
   uma aproximação para os de sala lateral, que podem ser deixados vivos —
   não foi remedido depois da mudança.

O que provavelmente falta, para quem retomar: o horizonte de 3 turnos é
curto demais para as decisões que justificariam a busca — recuar até um
corredor, escolher onde aceitar o encontro. Essas levam de 5 a 10 turnos e
o custo cresce rápido. Vale mais atacar o problema de raio longo (genie,
vampiro) na camada estratégica, decidindo *onde* travar a luta, do que
simular fundo.

### 4.5 Onde o ping-pong nasce: veto tático, não escolha de objetivo

`REVERSAL_PENALTY` (balance.js) documentava a causa como **não
identificada**, depois de uma tentativa de conserto que varreu 0 / 1,5 / 6 e
moveu a taxa de reversão só de 0,238 para 0,205, custando vitórias no
caminho. A questão em aberto era em qual **camada** o loop nasce:

```
objetivo ALTERNANDO junto com o passo  → nasce na ESCOLHA DE OBJETIVO
objetivo ESTÁVEL e só o passo alterna  → nasce no VETO TÁTICO
```

O remédio que já falhou mora no veto — evidência fraca a favor da primeira,
não prova.

**Instrumentação.** O hook `trace` (bot.js) gravava `goal` e `planned` antes
do veto tático decidir, então nunca capturava a ação **de fato** tomada
quando o veto discordava do plano. Estendido para gravar também `final` (o
que `decide()` de fato retorna) e `vetoed` (`final !== planned`), sem mudar
nenhuma decisão — só grava mais no array que o chamador já passava.

**Método.** Definição de reversão = a mesma que `REVERSAL_PENALTY` já usa:
`final[t] === OPPOSITE[final[t-1]]`, sobre a ação **final**, não a
planejada. Um episódio é uma janela maximal de ≥4 ações alternando
estritamente A,B,A,B,... Para cada episódio, classifiquei pela identidade do
objetivo (`goalId`, estável entre turnos para monstro/item/baú via seu id;
posição do tile para fronteira/santuário) e por quantos turnos o veto
disparou:

```
goalChanges == 0  e  vetoed nunca dispara  e  planned já alterna sozinho
    → ROTEAMENTO (terceira camada, não prevista pela bifurcação)

goalChanges == 0  e  vetoed domina os turnos do episódio
    → VETO TÁTICO

goalChanges  > 0  e  vetoed nunca dispara
    → ESCOLHA DE OBJETIVO
```

**Medido, duas famílias de seeds independentes** (a segunda nunca usada para
ajustar nada acima):

```
                        primária (n=60)      confirmação (n=60, seeds novas)
floors com episódio     20,1%                 21,8%
taxa de reversão geral  0,174                 0,210

                episódios          turnos gastos          comprimento médio
veto tático     61%                62%                    13,1
roteamento      15%                14%                    12,8
objetivo        11%                10%                     8% (turnos)
outro/misto     13%                14%                    —
```

(percentuais de turnos e episódios batem entre si dentro de cada categoria
nas duas famílias; a tabela acima resume as duas rodadas — números completos
na medição.)

**Resposta à bifurcação: veto tático, dominante e consistente.** Não
escolha de objetivo. ~61-64% dos episódios e dos turnos perdidos vêm de
`scoreActions` derrubando o plano de um lado para o outro enquanto o
objetivo estratégico fica **parado no mesmo alvo** o episódio inteiro —
tipicamente uma fronteira, às vezes por 14+ turnos seguidos. Isso explica
por que `REVERSAL_PENALTY` quase não moveu a agulha: ele ataca o sintoma
certo (desfazer o passo anterior), mas dentro da camada errada de contexto —
o padrão observado não é "ataca, recua, ataca, recua" como o comentário
original supunha, é o veto alternando entre duas direções **perpendiculares**
do plano (ex.: `up`/`right`) e convertendo uma delas (`right`) na sua
**oposta** (`down`), fabricando a reversão a partir de um plano que sozinho
nunca teria sido classificado como reversão.

**Escolha de objetivo é real, mas minoritária (~7-11%).** A suspeita
registrada na tarefa se confirma como mecanismo, só não como causa
dominante: baú/item são reavaliados do zero todo turno (`chooseGoal` passo
1, sem o amortecimento de `GOAL_STICKINESS`, que só cobre `kind === 'monster'`
— bot.js §"Stick with the current target"), então dois alvos de valor líquido
próximo trocam de lugar no ranking a cada passo, porque o passo em direção a
um muda a distância dos dois. Episódios deste tipo mostram `goalId`
alternando entre exatamente dois baús, a cada turno, sem o veto nunca
disparar.

**Uma terceira camada que a bifurcação não previa (~14-21%): roteamento.**
Objetivo **parado** no mesmo baú, veto **nunca** chega a disparar (nenhum
monstro por perto), e ainda assim `planned` alterna sozinho entre duas
direções opostas por até 17 turnos seguidos. A hipótese mais provável, a
confirmar: `believedWalkable` trata tile nunca visto como andável
(deliberado — é o que permite mirar no escuro), então o caminho mais barato
até um baú fixo muda conforme o fog-of-war revela mais mapa a cada passo —
duas rotas de custo empatado sob incerteza podem trocar de lugar puramente
por causa do que acabou de ser visto, sem o objetivo nem o veto participarem
da decisão.

**Consequência prática.** Um conserto para este bug pertence ao veto tático
(`scoreActions`/`bestValue` em tactics.js, ou a forma como o penalty de
reversão é aplicado ali), não a `chooseGoal`. Mas resolver só o veto deixa
de fora 14-21% dos episódios — o bloco de roteamento — que nasce antes de o
veto ser sequer consultado.

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

## 5. Os dois recursos do herói

O original permite curar indefinidamente parado em zona fria. Como o bot
maximiza vitória e passos são só desempate, ele **vai** descobrir e explorar
essa jogada: acampar até HP cheio antes de cada duelo torna o HP irrelevante
e a run inteira mecânica.

Duas divergências deliberadas fecham isso (`rogule-spec.md` §13.1 e §13.2):

**Não há regeneração passiva.** Esperar não cura. A única fonte de HP é a
poção 🥃, que só cai de criatura. HP vira estritamente não-renovável a não
ser por loot conquistado.

**Armadura é uma segunda barra que se gasta.** Escudos enchem um tampão que
absorve o golpe antes do HP, e o que foi gasto fica gasto. O HP máximo nunca
se move.

Consequência estratégica, e é a que importa: o herói tem **dois recursos com
comportamentos diferentes**, e o bot precisa tratá-los assim.

| | HP | Armadura |
|---|---|---|
| onde repõe | poção, de criatura | escudo, de baú |
| se acumula? | não, tem teto | não, é gasta |
| o que faz | mantém vivo | adia o dano |

A ordem dos duelos deixa de ser otimização de margem e passa a determinar se
a run termina. E a resposta a HP baixo deixa de ser "recuar e curar" — essa
jogada não existe mais. A única resposta é **jogar melhor**: escolher duelos
mais baratos, buscar escudo antes, usar corredor.
