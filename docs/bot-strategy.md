# Estratégia do bot — formalização das 3 regras

Notas de projeto para a Fase 3, derivadas dos números medidos em
`rogule-spec.md`. Não é a especificação do bot (isso vem na Fase 3); é a
tradução das três regras do dono para quantidades computáveis, mais o que os
números do jogo dizem sobre elas.

Premissa fixada em §10.1 da spec: **fog of war real com memória**. O bot lê
`Belief`, nunca `GameState`.

---

## 0. O fato que domina tudo: turnos são quase de graça

Três coisas medidas no original se combinam:

1. **Não há limite de turnos** nem relógio dentro da run (spec §8).
2. **Regenerar custa só tempo**: +1 HP a cada 100 turnos, e só quando o HP
   não está cheio (spec §5).
3. **Monstros são estritamente estáticos fora do `activation` deles**
   (spec §7). Não patrulham, não vagam, não procuram.

Consequência: gastar turnos não é neutro, é **levemente positivo**, contanto
que o bot fique fora dos raios de perseguição. Não existe pressão de tempo
empurrando para o combate.

Isso é o que dá respaldo mecânico à regra 1. A pergunta "vale a pena andar
mais 20 tiles para pegar aquele loot?" quase sempre tem resposta sim — o
custo não é o tempo, é só a exposição no caminho.

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

> **Colher exaustivamente todo o loot da zona fria antes de pisar em
> qualquer tile quente.**

Dentro da zona fria não há decisão de risco a tomar — vira um problema de
roteamento (ordem de visita que minimiza passos), não de estratégia. É o
caso que você descreveu: a sala só com loot é colhida inteira antes de
encostar na sala com monstro.

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

### Reformulação da regra 3

> Ordenar alvos por **HP esperado perdido contra o equipamento atual**, não
> por xp. Reavaliar a ordem inteira sempre que o inventário mudar — um único
> escudo pode mover um monstro de "letal" para "grátis", e isso reordena o
> plano todo.

A sua intuição (sala com xp 1 antes de sala com xp 3) continua correta; o
cálculo só a estende para os casos onde o rótulo engana.

---

## 4. Como as três regras se compõem

Não são uma cadeia de prioridade — são termos de uma única pontuação de
alvo. Esboço para a Fase 3:

```
score(alvo) = valor(alvo)
            − custo_HP_do_caminho(alvo)      ; regra 1, via zonas frio/quente
            − custo_HP_do_duelo(alvo)        ; regra 3, com equipamento atual
            − penalidade_multi_ameaça        ; regra 2, restrição dura
            − prêmio_de_incerteza            ; fog: alvo em região inexplorada
```

Com quatro tipos de alvo: **item revelado**, **cobertura fechada**,
**monstro**, **fronteira** (exploração). O santuário ⛩ é um quinto, com
valor que sobe conforme o HP cai — é a saída de emergência.

Ordem natural que deve emergir sem ser codificada: colher tudo o que é frio
→ explorar fronteira fria → matar o monstro mais barato alcançável → colher
o que ficou frio depois da morte dele → repetir → santuário quando não sobrar
alvo positivo.

**Ponto a validar na Fase 4:** a meta "eliminar todas as criaturas antes do
portal" pode não ser ótima nem alcançável. Com 5 monstros sorteados por
dificuldade posicional, uma run pode conter um dragon perto do santuário que
nenhum equipamento razoável derruba. O bot precisa poder desistir de um alvo
e ascender — e "sempre limpar a sala" deve ser um peso alto, não uma regra
absoluta, senão o bot se mata contra um t-rex por teimosia.
