# I12 — a linha de base pré-M35

**Isto existe contra a regra normal do projeto de não registrar medição.** O
I12 pede explicitamente: a metade de comparação replica as MESMAS seeds depois
do B14, e taxa comparada entre famílias de seed diferentes é comparação mais
fraca. Sem este arquivo o "antes" só existe fazendo checkout de commit antigo,
que é possível e que ninguém faz.

**Não copie estes números para lugar nenhum.** Eles descrevem um commit
específico e envelhecem no instante em que o motor muda — que é o motivo de o
projeto não registrar medição em geral. O que este arquivo persiste de
verdade é **como reproduzir**, não o resultado.

## Como reproduzir, exatamente

```
git worktree add --detach <caminho> 9058559
cd <caminho>
git checkout 365b2c7 -- src/analysis/clustering.js   # ver "por que este passo"
node tools/measure.mjs --selftest          # 8/8 antes de confiar em qualquer número
node tools/measure.mjs clustering descentCheck '{"runs":1000,"firstSeed":3000000}'
```

- **Commit:** `9058559` — pré-M35 (o motor ainda recusa poção com hp cheio) e
  já com o instrumento de poção. O M35 entrou logo depois, em `57d1eff`.
- **Por que o checkout do `365b2c7`:** o instrumento que existia em `9058559`
  lia `amount` do log para medir cura. Pré-M35 esse campo é o valor de FACE da
  poção, não o hp ganho — cura satura no hpMax, então poção pisada faltando 1
  de hp entregava 1 e logava 3. Medido: **12,4% da cura aparente da base nunca
  foi recebida.** O `365b2c7` aplica o teto do próprio motor sobre o hp que
  entra no turno, o que recupera o ganho real antes do M35 e é no-op depois
  (ali `amount` já é o ganho). Uma implementação, correta dos dois lados —
  por isso é este arquivo de análise em cima daquele motor, e não um commit
  novo. **O motor medido continua sendo o de `9058559`.**
- **Família de seeds:** `3000000` a `3007999`, contígua. `descentCheck` usa
  `firstSeed + i`, então a família inteira é descrita pela base e pelo n — não
  há lista de 8000 números para guardar.
- **n = 8000**, rodado em 8 pedaços de 1000 (`firstSeed` 3000000, 3001000, …,
  3007000) só para paralelizar. O particionamento não afeta resultado: cada
  run é determinística na sua própria seed.
- **Custo, e o que aqui é medido e o que é conta.** Medido: cada pedaço de
  1000 leva 6,3–7,5 min, e 4 em paralelo terminam juntos — então n=8000 são
  **duas ondas, ~14 min de relógio**. Nunca cronometrei em série; os ~55 min
  que este arquivo dizia antes eram extrapolação de 0,41 s/run apresentada
  como medição, que é exatamente o hábito que este projeto já pagou caro.
  Corrigido em vez de apagado.

## O que a metade de comparação precisa fazer

Mesmo comando, mesma família, no commit de depois do B14. Comparar:

| número | por quê |
|---|---|
| `healPerPotionGenerated` | **o headline de verdade** — efeito direto do M35, e se move mesmo se `finishes` não mover |
| `healDelivered` | o total por trás dele; comparável dos dois lados só por causa do `365b2c7` |
| `finishRate` + `finishRateSe` | o headline nominal, mas a ~0,3% pode não resolver em amostra nenhuma que a gente rode |
| `potionShareDrunk` | contagem de bebidas; **não espere salto** — ver abaixo |
| `potionsRefusedAtFullHp` | pré-M35 é o canal que o M35 apaga; depois é 0 por construção |
| `drinksWasted` / `deathsHoldingPotion` | os dois tripwires, cercando a política pelos dois lados: beber cedo demais e tarde demais |
| `floorAttempts`, `turnsPerFloor` | **a armadilha do denominador** — runs mais longas movem qualquer taxa sozinhas; diga o que o denominador fez antes de explicar a taxa |

**`healOverheal` não atravessa a fronteira.** Pré-M35 mede desperdício real
contra o teto de hp. Pós-M35 lê 0 sempre — não porque o exagero acabou, mas
porque o log deixou de carregar valor de face e o instrumento não consegue
mais vê-lo. Ler esse 0 como "não há exagero" seria errado.

**Não espere `potionShareDrunk` saltar.** A recusa com hp cheio é 0,4% da
oferta gerada; ~44% das poções não são bebidas porque o bot nunca chega
nelas, e o M35 não faz nada quanto a isso. O ganho da feature está no que
cada poção bebida entrega, não em quantas são bebidas.

**Os dois efeitos vêm entrelaçados.** M35 (poção nunca se perde) e B14 (o bot
ganha uma decisão que pode errar) mudam juntos. Se `finishes` se mexer, esta
medição não diz qual dos dois moveu — o B15 é que separa, mudando só a
política contra um motor fixo.
