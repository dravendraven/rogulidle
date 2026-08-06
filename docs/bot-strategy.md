# Estratégia do bot — formalização das 3 regras

Notas de projeto para a Fase 3, derivadas dos números medidos em
`rogule-spec.md`. Não é a especificação do bot (isso vem na Fase 3); é a
tradução das três regras do dono para quantidades computáveis, mais o que os
números do jogo dizem sobre elas.

Premissa fixada em §10.1 da spec: **fog of war real com memória**. O bot lê
`Belief`, nunca `GameState`.

---

## 0. O objetivo: limpar o andar no menor número de passos

Regra fixada pelo dono: **matar todos os monstros antes de tocar o santuário
é obrigatório**, não um peso. Vem da regra de casa que ele jogava com
amigos — o placar era quem completava o desafio do dia em menos passos, e
limpar o andar inteiro aumentava a chance de fracasso, que era justamente o
que tornava a coisa divertida.

```
minimizar  passos
sujeito a  todos os monstros mortos  ∧  santuário alcançado
falha      morte do jogador
```

O santuário **não é alvo válido** enquanto restar monstro vivo. Não existe
saída de emergência: se o bot está com 2 HP e sobrou um dragon, ele luta.

### Três consequências

**1. Passos são o placar, então turnos deixam de ser de graça.** O jogo não
tem relógio (spec §8) e regenerar só custa tempo (spec §5), então nada mata
o bot por demorar — mas cada passo piora a nota. A pergunta "vale a pena
andar 20 tiles por aquele loot?" passa a ter resposta de verdade, em vez de
ser sempre sim. Todo desvio precisa se pagar em sobrevivência.

**2. Descansar custa um passo, e é isso que impede a degeneração.** Sem essa
propriedade, a jogada ótima sob "matar todos" seria recuar para a zona fria,
descansar até encher o HP e voltar — regeneração infinita, HP irrelevante,
e horrível de assistir. Como `move-to` com direção nula incrementa `:moves`
(spec §6), curar 1 HP custa 100 passos no placar. O metrificador se corrige
sozinho, e isso o torna **load-bearing**: se a Fase 4 mexer no placar, esse
buraco reabre.

**3. Morrer é um desfecho aceito.** O bot não deve jogar com segurança
máxima — a chance de fracasso é o produto, não o defeito. Isso proíbe
qualquer heurística de auto-preservação que faça o bot desistir de um alvo.

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
