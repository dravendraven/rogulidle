# O que um dial tem de ser, e como se mede

> O título da seção abaixo diz "os três" e hoje são QUATRO — a Pressa
> voltou em 2026-08-29 (reversão do B24 sob o critério de comportamento).

**Diretriz do dono, 2026-08-17/18, mais o método que ela obriga e a primeira
leitura feita com ele.** Escrito depois de uma sessão que mediu os dials
errados por dois motivos diferentes e chegou à conclusão errada nas duas
vezes. Ler antes de varrer qualquer dial.

## Os três que o jogador tem

As linhas `kind: 'hero'` de `src/ui/dials.js` são a fonte de verdade, e hoje
são estas:

| dial | campo | governa |
|---|---|---|
| **Coragem** | `bravery` | o quanto ele subestima a vida de uma criatura |
| **Ganância** | `sideAppetite` | o quanto ele super ou subestima um baú |
| **Curiosidade** | `curiosity` | o quanto o desconhecido vale a caminhada |
| **Pressa** | `stepCost` | quanto custa um passo em hp — o raio do que vale a caminhada |

`fightMargin`, `persistence` e `EXPOSURE_STEPS` **não são dials** — foram
constantes decididas quando o que estava fundido foi separado (M47/C1, e
depois a própria Cautela: a metade de exposição dela mediu como calibração —
mortes 1,00 planas — e virou `EXPOSURE_STEPS`; a metade do desconhecido
ficou e é a Curiosidade). `test/baseline.md` e
`dial-sweep.mjs` carregaram os nomes velhos por um tempo e uma sessão inteira
concluiu sobre parâmetros que ninguém alcança. Quando um dial muda de nome ou
sai, esta tabela, `baseline.md` e `dial-sweep.mjs` mudam no mesmo commit.

## A diretriz

**1. Isolado, cada faixa deve ser EQUIVALENTE em eficácia no herói base.**
Mover um dial sozinho não deve ter vencedor. Um dial que inclina para um lado
tem um no-brainer numa das pontas, e o desenho de bandas em torno de um centro
existe exatamente para evitar isso (`decisions.md`, B21).

> **Revisão do dono, 2026-08-29 — a equivalência vale para as QUATRO faixas
> do meio; as duas pontas são personagem, não calibração.** O spread foi
> alargado de ±80% para ±95% de propósito: a ponta máxima precifica a 1,95×
> e a mínima a 0,05×, que é "encara qualquer criatura" e "nenhum baú vale um
> passo" — comportamentos extremos e opostos por desenho, com custo real em
> eficácia assumido. A diretriz 2 (comportamento visível) passa a ser a
> régua das pontas.

**2. Mas cada faixa deve mudar o COMPORTAMENTO, de forma visível.** Isto é o
que separa um dial situacional de um dial morto, e os dois leem igual em
qualquer medida de resultado. `objectives.md`: "se você não consegue dizer
qual escolha foi feita assistindo trinta segundos, não foi uma escolha".

**3. O que importa é a COMBINAÇÃO.** Provavelmente existe um ponto ótimo, e
ele deve vir com troca: um ótimo que vai mais fundo e faz pouca moeda, outro
que faz moeda e não vai fundo, outro bom em geral que cai em armadilha com
frequência. O ótimo pode existir; ele não pode ser óbvio.

**4. O ótimo deve depender da SITUAÇÃO**, não ser um ajuste certo permanente.
O debuff diário do inferno (`candidates.md` U11) é o que muda a resposta dia a
dia — a mesma lógica que `items.md` já usa para itens: iguais em expectativa
sobre todos os dias, desiguais contra qualquer dia dado.

**5. O baseline calibra; os heróis dão variedade.** O herói base é onde as
faixas se equivalem. Cada persona desloca o ótimo por um motivo próprio — o
jogador otimiza o que o herói já faz, ou compensa o que ele não faz. Vito, que
é forte no combate cedo, pode querer Coragem alta; Ricardo, que sabe o valor
real do que está à vista, muda o que Ganância significa — e se ela virar
aritmética em vez de aposta, pode ficar redundante nele. Um dial que importa
em quatro heróis e não no quinto continua sendo escolha, desde que o quinto
tenha outra coisa para decidir.

## O método: medir COMPORTAMENTO, nunca só resultado

**O erro que este documento existe para impedir.** Todo sweep do projeto media
profundidade, clears, ou espera até o porco. Nenhuma dessas medidas distingue
um dial inerte de um dial situacional: os dois leem plano. Uma sessão varreu
os três dials contra "runs até matar o porco", viu linhas retas e reportou que
dois deles não faziam nada. Medidos por comportamento, os três fazem.

`test/baseline.md` já tinha metade disso escrito — a coluna `runs≠centro`
existe para distinguir "muda comportamento" de "muda resultado" — mas tratava
o primeiro caso como suspeita de dial inútil. Pela diretriz acima ele é o
ALVO.

**Uma métrica por dial, e ela descreve a decisão que aquele dial governa:**

| dial | métrica | por quê |
|---|---|---|
| Coragem | duelos **laterais** aceitos / laterais disponíveis | os da rota obrigatória não são escolha |
| Ganância | baús **laterais** abertos / laterais disponíveis | o baú da rota ele pega de passagem |
| Curiosidade | share do mapa revelado por andar **e** turnos por andar | a tese dela é uma troca — mapa aberto contra tempo gasto — e uma métrica só não mostra troca |
| Pressa | passos por andar **e** baús laterais abertos | a tese é o raio: quem paga caro o passo anda menos e deixa loot para trás |

**A rota obrigatória e o vault ficam fora de todo denominador.** Uma criatura
na espinha é enfrentada porque é preciso passar, e a sala do porco é encarada
por ~99% de quem sai vivo do andar (`vault-irrecusavel.md`). Contá-los enche o
denominador de não-decisões — o mesmo defeito que arrastou o wire "the gamble
is dead" de 0.69 para 0.26 quando os baús do vault entraram nele.

**Toda célula imprime TODAS as métricas, não só a própria.** É assim que se vê
interferência entre dials, e há.

## A primeira leitura — 2026-08-18, herói base, 120 runs por célula

DATADA, como o snapshot de `test/baseline.md`: se uma leitura discordar,
rode de novo antes de acreditar em qualquer uma das duas. O que importa aqui
são as FORMAS, não os números.

Centro: duelos 77,3% · baús 83,4% · 97 turnos/andar · 12,4 golpes/andar ·
profundidade 4,16.

```
Coragem   duelos: 71,7 → 72,4 → 74,7 → 78,1 → 78,0 → 77,9   (3,4σ 2,5σ 2,2σ | 0,7σ 0,5σ 0,4σ)
Ganância  baús:   24,3 → 75,3 → 84,4 → 84,7 → 85,8 → 85,4   (24,8σ 4,3σ | resto < 2σ)
Cautela   turnos:   94 →   94 →   97 →   98 →  100 →  100   (1,8σ 1,7σ 0,0σ 1,3σ 2,8σ 3,0σ)
```

**Coragem satisfaz a diretriz na metade baixa.** Recusa duelos laterais — 71,7%
contra 77,3% — com a profundidade parada em 4,10 contra 4,16. Comportamento
muda, eficácia não: exatamente o alvo.

**Cautela mostra a troca que o nome promete.** Turnos sobem 94 → 100 e golpes
caem 12,7 → 12,0. Anda mais para se expor menos. Pequeno (6%) e monotônico.
(Leitura do dial FUNDIDO, anterior à troca por Curiosidade — a linha dela nas
seis faixas novas ainda não foi tirada.)

**Os três saturam acima do centro, e esse é o defeito comum.** Coragem tem três
bandas iguais no topo, Ganância tem quatro. **O efeito é assimétrico e as
bandas são simétricas**, então metade do painel oferece opções que fazem a
mesma coisa. A correção não é mudar quantas faixas existem — é distribuí-las
onde o dial trabalha.

**Os dials não são independentes.** Ganância mínima derruba os duelos de 77,3%
para 68,1%: ela muda o combate, não só a coleta. Qualquer calibração feita um
dial por vez erra por isso.

**Ganância mínima não é uma faixa baixa, é outro jogo.** 24,3% de baús contra
83,4%, e a profundidade cai a 3,25. Medido por outro caminho, custa +6,85 runs
até o porco (7,4σ) e deixa 10% das sessões sem destravar nada em 30 runs. É a
única violação clara da diretriz 1 no painel hoje.

## O que ainda não foi medido

- **As combinações.** Tudo acima move um dial por vez, o que por construção
  não enxerga "Coragem baixa com Ganância alta" — que é onde a diretriz 3 põe
  o conteúdo. O desenho que responderia: a grade das combinações contra
  múltiplos eixos de resultado (profundidade, moeda, armadilhas), e olhar a
  **fronteira de Pareto**. Várias combinações na fronteira, cada uma vencendo
  num eixo, é a diretriz satisfeita; uma combinação dominando todos os eixos é
  no-brainer e o desenho falhou.
- **Os heróis.** Tudo acima é `HEROES.base`. A diretriz 5 só é testável
  repetindo isto por persona.
- **As hipóteses do dono sobre para que serve cada ponta**, ainda não testadas:
  Ganância baixa acumularia moeda mais rápido para voltar equipado; Coragem
  baixa recusaria o porco e as salas laterais caras e levaria a run mais longe.
  A segunda é mensurável hoje — a métrica de duelos laterais e a de moeda por
  run já existem.
- **Quantas faixas.** Reduzir de seis para quatro aumenta o contraste entre
  vizinhas em ~65% sem mexer na amplitude, mas afasta as internas do centro
  (±0,16 → ±0,27) e torna a armadilha da Ganância mais provável de ser
  sorteada (1 em 6 → 1 em 4). Provavelmente o problema é a distribuição, não a
  contagem.
