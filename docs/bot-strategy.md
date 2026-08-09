# Estratégia do bot

**Este arquivo descreve o que o bot faz hoje, não as regras que alguém achou
que ele deveria seguir.** A versão anterior era o oposto — foi escrita antes
do bot existir, organizada em torno de três regras desenhadas à mão, e o
código já a tinha contrariado: a "Regra 1 — recursos antes de combate" deixou
de valer quando o B11 fez a luta competir com o loot.

Sempre que o bot muda, **este arquivo muda**. Se ele descreve algo que o
código não faz, o código está certo e o arquivo está velho.

**O que falhou não mora aqui.** Toda tentativa medida-e-rejeitada vive em
`docs/project/decisions.md`, junto com o resto do que o projeto aprendeu.
Este arquivo não repete essa lista: duas cópias divergem, e o histórico do
git já guarda o registro completo de cada item.

---

## 1. Os objetivos

Estas são as únicas regras de verdade. Todo o resto é o bot tentando
cumpri-las.

**#1 — concluir a run: atravessar os dez andares, vivo.** Requisito mínimo.

**#2 — acumular moeda.** A moeda deriva de xp por turno, acumula andar a
andar, e serve para comprar na loja.

### Os dois não competem, e isso é estrutural

**Moeda só é efetivamente ganha se a run for concluída.** Morrer descarta o
acumulado da run em andamento e, pela regra padrão, zera também o saldo
guardado e o item comprado. O placar de vida inteira é pago apenas numa
conclusão completa, pela mesma lógica.

Consequência: **um bot que arrisca a run por moeda está fazendo uma troca
estritamente ruim.** O #1 não é um rival do #2 — é a condição para ele
existir. Qualquer comportamento que ganhe moeda ao custo de profundidade está
errado pelos dois objetivos ao mesmo tempo, não fazendo um trade-off entre
eles.

Isso é o que torna o modo de falha do B9 ("um bot que caça luta por loot é um
bot que morre por loot") uma preocupação legítima e não um preciosismo.

### Por que não há um terceiro objetivo

Ser interessante de assistir é o produto, mas não é algo que o bot possa
maximizar — "seja interessante" não é uma função de custo. Isso fica a cargo
do design do mapa; um bot competente já é naturalmente assistível, mesmo
quando faz bobagem.

### O #2 ainda não é perseguido — ver §5

O bot não tem **nenhum termo de moeda** hoje. Ele otimiza custo em hp. O #2 é
um objetivo do produto que o bot ainda ignora, e isso está registrado como
lacuna aberta em vez de descrito como se já funcionasse.

---

## 2. O que o bot sabe

**Só `Observation` / `Belief`, nunca `GameState`.** Regra dura do
`CLAUDE.md`, e é de canal: um campo que carregue resposta ainda não revelada
já violou a regra, mesmo que ninguém o leia. Foi por isso que o `drop` já
sorteado de uma criatura foi removido do Belief (M28).

**Névoa de guerra.** Ele enxerga por raio de visão simples, sem raycasting, e
lembra do que viu. Tile nunca visto é tratado como **andável** — otimismo
deliberado, que tem um custo real descrito em §5.

**Quantas criaturas o andar tem.** Concedido de propósito
(`BOT_KNOWS_MONSTER_COUNT`): sem isso ele não consegue formular "vale a pena
o desvio dado o que ainda vem".

**Que equipamento persiste entre andares.** Por isso ele precifica loot
contra os andares que **ainda faltam**, não contra o atual — `horizon` e
`monstersAhead` descontam o futuro pela chance de chegar lá. Um andar jogado
isolado genuinamente não tem futuro, e nesse caso o desconto é zero.

---

## 3. Como ele decide um turno

Tudo numa moeda só: **hp**. É o que permite comparar "andar até ali" com "ter
esta luta" sem inventar taxa de conversão.

### 3.1 Precificar o tabuleiro

`dangerField` monta o preço de ameaça por tile. Um Dijkstra sobre isso —
custo de passo mais preço de perigo — dá o custo em hp de alcançar cada tile.
Esse campo alimenta toda escolha abaixo.

### 3.2 Escolher o objetivo

Uma comparação, não uma cadeia de prioridades. `chooseGoal`:

**Coisas que valem ter.** Loot visível, precificado por `valueByItemName` —
que calcula **valor marginal**: quanto o resto da campanha fica mais barato
com o item, contra o inventário que o herói já tem. E, desde o B11, **uma
luta que vale começar entra na mesma lista**, com um `net` na mesma moeda.
Vence o maior líquido, seja qual for o tipo. Loot que não paga a própria
caminhada pontua negativo e é ignorado.

**A luta mais barata.** Se nada acima pagou, a criatura conhecida de menor
custo — não a mais próxima. Andar contra ela *é* o ataque, então combate não
precisa de caso especial.

**O santuário.** Legal quando o critério de limpeza do andar foi cumprido
(hoje: as criaturas da espinha precisam morrer; a regra antiga de matar tudo
foi relaxada por decisão do dono).

**Fronteira.** Explorar, como último recurso.

**Histerese unificada.** Um único teste de teimosia, indexado pelo tipo do
objetivo atual — o B11 juntou os dois que existiam antes. Objetivo de
fronteira é especialmente teimoso: dezenas ficam à mesma distância, e
reescolher a cada passo faria o bot trocar de alvo para sempre sem chegar a
nenhum.

### 3.3 Decidir se a luta é sobrevivível

`worthStarting` é um filtro duro, aplicado **antes** de a criatura entrar em
qualquer comparação. `duelCost` estima o hp perdido num duelo; a margem de
segurança é um dial. Isto não é ranking — é veto. O B11 mudou como uma luta
se ordena contra loot, e deliberadamente não afrouxou quando ela é segura.

### 3.4 Simular, não adivinhar

O movimento das criaturas é determinístico, então "onde estará o lobo em três
turnos" só tem resposta em relação ao que o bot fizer. Por isso a camada
tática é **busca sobre as próprias jogadas do bot**, rodando o motor de
verdade sobre um mundo hipotético — não previsão seguida de rota.

Ela funciona como **veto, não como escolha**. Pontuada livremente, a busca
anda em círculos: um passo custa uma fração mínima do que custa levar um
golpe, então recuar sempre pontua melhor que avançar e a run nunca termina.
Ela só derruba o passo planejado se o superar por uma margem, e há uma
penalidade explícita para desfazer o passo anterior.

Profundidade um. Mais fundo é pior, não melhor — está medido em
`decisions.md`.

### 3.5 Deixar vir até você

Quando algo está caçando, o bot pode escolher um tile e **se comprometer com
ele uma vez**, em vez de recalcular todo turno. Recalcular era exatamente
como o vaivém nascia.

---

## 4. Como as coisas são precificadas

| pergunta | quem responde |
|---|---|
| quanto custa o resto da campanha | `campaignCost` |
| quanto custa um duelo | `duelCost` |
| a luta é sobrevivível | `worthStarting` |
| quanto vale este item, para **este** herói | `valueByItemName` (delta marginal) |
| quanto vale um baú fechado | `expectedChestValue` |
| o que esta criatura provavelmente carrega | `expectedMonsterDropValue` (B9) |

**Arma é precificada marginalmente, armadura por valor de face — e isso está
certo.** Armadura *é* hp efetivo, linear e sem teto, então três de armadura
valem três, sempre. Arma passa por turnos-para-matar, que é recíproco do
dano, então cada ponto vale menos que o anterior. Qualquer redesenho da curva
de arma precisa preservar esse cálculo marginal.

---

## 5. O que ele ainda não faz

Lacunas conhecidas, declaradas aqui para não serem redescobertas.

**Não persegue o objetivo #2.** Nenhum termo de moeda existe no bot. Já há
recomendação registrada de como adicionar direito — delta real de
`campaignCost` com o equipamento comprado na run seguinte, **não** a fórmula
da moeda, que existe para diagnóstico e não como preço de decisão. Ver as
notas do U6e em `docs/backlog.md`.

**Roteamento é o resíduo inteiro do vaivém.** Com a penalidade de reversão no
lugar, as camadas de veto e de objetivo praticamente zeraram; o que sobra é
roteamento. Duas tentativas já falharam por motivos entendidos, ambos em
`decisions.md`.

**Tile nunca visto conta como andável.** É otimismo deliberado, e cobra: uma
rota mirada no escuro pode acabar em rocha, o esbarrão gasta uma ação sem
gastar um turno, e o replanejamento é outra chance de inverter. A pista
aberta é o esbarrão, não a escolha de rota.

**Vários flags embarcados não passaram por 2σ formal.** `priceDrops` e
`combatCompetes` foram medidos em duas famílias de seed concordantes, sem
barra formal — sinalizado, não afirmado.

**`finishes` está em zero, então guardas que o leem são decorativas.** Duas
regras de segurança consecutivas foram escritas como "pare se `finishes`
cair", com `finishes` lendo zero em todos os braços. Ver M33.

---

## 6. Os flags desligados

Estão no código, desligados, com o número que os matou no comentário — de
propósito, para que a medição viaje junto e ninguém os religue por intuição.
São: procurar corredor, precificação por exposição, e as três tentativas de
dar valor à exploração.

O raciocínio de cada um está em `docs/project/decisions.md`. **Leia lá antes
de ligar qualquer um** — todos parecem boas ideias, e é exatamente por isso
que foram construídos.
