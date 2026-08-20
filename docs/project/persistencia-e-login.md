# Persistência e login por nome

**Estudo escrito antes do código.** O que se apaga hoje, por que se apaga, e
em que ordem consertar — primeiro o refresh, depois o nome, depois a nuvem.
Nenhuma linha aqui descreve código que já existe; quando existir, quem
escrever atualiza `docs/rules.md` e apaga a parte correspondente daqui.

---

## 1. O que se apaga no refresh, e o que não

Já persiste hoje, cada módulo com sua própria chave de `localStorage`:

| o quê | chave |
|---|---|
| itens que o herói carrega para a próxima run | `rogulidle-wallet` |
| recordes por herói | `rogulidle-highscores` |
| feitos (com recibo, reverificado no load) | `rogulidle-achievements` |
| herói escolhido | `rogulidle-hero` |
| ordem de compra da loja | `rogulidle-shop-order` |
| pontuação vitalícia | `rogulidle-score` |
| notches do lab (a personalidade do bot) | `rogulidle-notches` |

Não persiste **nada da sessão**, que vive só na memória de `spectator.js`:

- `runNumber` — por isso o rodapé volta a «run 1»
- `history` — por isso «recent runs» esvazia
- `runsPlayed` / `cleared` — o placar do rodapé
- `sessionSeed` — sorteado de `Date.now()` a cada load, então o refresh não
  interrompe a sessão: ele começa **outra**

Ou seja: o bug relatado é uma coisa só — **a sessão não tem onde morar.** O
resto do save já mora em disco, só que espalhado em sete chaves que ninguém
lê junto.

## 2. São dois problemas, e a ordem importa

1. **Sobreviver ao refresh** — é local, não precisa de rede, não precisa de
   nome, e resolve o que foi relatado. Vale sozinho.
2. **Seguir o jogador para outro aparelho** — precisa de um lugar fora do
   browser, e portanto de um servidor, por menor que seja.

O nome («login») é o que liga um ao outro: ele é o endereço do save. Fazer
(2) antes de (1) seria sincronizar um estado que ainda não existe.

## 3. Peça 1 — um documento, não sete chaves

Hoje cada módulo faz seu próprio `load()`/`save()` contra sua própria chave.
Para sincronizar isso seria preciso ensinar o sincronizador sete chaves e
sete momentos de escrita. Em vez disso: **um documento só, com fatias.**

```
rogulidle:save:<nome>  →  {
  v: 1,                       // versão do formato, para migrar depois
  rev: 128,                   // contador monotônico, cresce a cada gravação
  updatedAt: 1735689600000,
  slices: {
    session:      { seed, runNumber, runsPlayed, cleared, history: [...] },
    wallet:       { heldItems: [...] },
    highscores:   { ... },
    achievements: { ... },
    score:        { ... },
    hero:         'vito',
    shopOrder:    [ ... ],
    notches:      { ... }
  }
}
```

Um módulo novo — `src/ui/save.js` — é dono desse documento e expõe duas
funções, `readSlice(nome)` e `writeSlice(nome, dados)`. **A API pública dos
sete módulos não muda**: cada um troca o corpo do seu `load`/`save` (que é um
par de funções de cinco linhas, sempre no topo do arquivo) por uma chamada de
fatia. Nenhum outro arquivo é tocado, e o motor continua sem saber que
armazenamento existe — a regra que todos esses módulos já enunciam em
comentário («`step()` não acessa storage») fica intacta, porque `save.js`
nasce em `src/ui/`.

Na primeira carga, se as sete chaves antigas existirem e o documento novo
não, elas são lidas para dentro dele e apagadas. Migração de uma vez só, sem
código que fique para sempre.

**Por que a fatia `notches` entra:** ela decide qual bot o jogador tem. Se
não seguir o nome, o mesmo jogador encontra outro bot no celular. O botão
`↻ reset` continua sem tocá-la — reset apaga o que foi **ganho**, e ela foi
**sorteada**.

## 4. Peça 2 — a sessão persistida, com um ponto de salvamento só

O que salvar já está listado no §1. **Quando** salvar é a decisão que evita
metade dos problemas: **no fim da run, depois que a loja fecha.**

É o único instante em que o estado inteiro é coerente — a run foi contada, o
que morreu já foi perdido, a compra já foi feita. E tem uma consequência boa
de graça: **uma run interrompida por refresh simplesmente é jogada de novo,
idêntica.** Ela não chegou a mexer em nada persistido, e o par `(seed da
sessão, runNumber)` reproduz exatamente o mesmo mapa. Não existe «salvar no
meio», porque não existe meio que precise ser salvo.

Ao carregar, `sessionSeed` e `runNumber` vêm do save; a próxima run é a
`runNumber + 1` da mesma cadeia. O refresh deixa de começar outra sessão e
passa a **continuar** a que estava.

`?seed=` continua mandando: quem abre com seed explícito está pedindo uma
sessão reproduzível e recebe a cadeia daquele seed, sem herdar o `runNumber`
salvo.

## 5. Peça 3 — o nome é o endereço

Uma tela na primeira visita, um campo, um botão. O nome é normalizado (corta
espaços, minúsculas, um limite curto de caracteres, só letras/números/`-`/`_`)
e **o resultado é o id**. Sem senha; o dono já aceitou o risco de dois amigos
escolherem «vito», e um PIN foi descartado porque quebraria justamente o que
o nome existe para fazer — digitar só o nome em outro aparelho e achar o jogo
lá.

O nome vai para `rogulidle:player`, e o save passa a morar em
`rogulidle:save:<nome>`. Dois nomes no mesmo browser são dois jogos
independentes, o que é a maneira barata de testar tudo isto sem um segundo
aparelho.

Um controle discreto («trocar de jogador») volta para a tela do nome. Ele
**não apaga nada**: o save do nome anterior fica onde está.

Até aqui, zero rede. O jogo continua sendo os mesmos arquivos estáticos.

## 6. Peça 4 — o servidor mínimo

**Aqui é onde este plano sai das regras do repositório, e isso precisa ser
dito antes de qualquer código.** `CLAUDE.md` proíbe framework, npm, build
step e biblioteca externa na página — nada disso é violado: a página continua
JS puro e ganha um `fetch()`. Mas o projeto passa a ter **uma peça que não é
o repositório**: um serviço hospedado, com conta, com teto de uso e com
possibilidade de cair. Não existe versão disto sem essa peça; GitHub Pages
não guarda nada de ninguém.

Recomendação: **Cloudflare Worker + KV.** Um arquivo de umas sessenta linhas,
editável pelo painel no navegador (sem CLI, sem npm), plano gratuito. As
alternativas foram descartadas por peso (Firebase/Supabase trazem SDK e um
modelo de autenticação que não queremos) ou por não terem trava (gist/jsonbin
não têm escrita condicional).

Três rotas, e a trava é uma delas:

- `POST /claim {nome, aparelho}` → `200 {token, lease, save}` ou
  `409 {motivo:'ativo', ultimaAtividade, aparelho}`
- `PUT /state {nome, rev, save}` + header `X-Token` → `200 {rev, lease}`,
  `409` se o token não for mais o dono, `412` se a `rev` estiver atrasada
- `POST /release {nome, token, save, rev}` → grava e solta a trava; é o que o
  `pagehide` manda por `sendBeacon`

**A trava é um arrendamento, não um cadeado.** Quem tem o token é o dono por
um tempo, e cada `PUT` renova esse tempo. Um aparelho que fechou direito
solta na hora; um que travou ou perdeu bateria solta quando o prazo vence.
Sem prazo, um celular desligado trancaria a conta para sempre.

**Quem perde a trava para de escrever.** O `PUT` responde `409`, o cliente
para o loop e diz na tela que o jogo foi aberto em outro lugar. É isso que
impede dois aparelhos de gravarem por cima um do outro — a mensagem de erro
que o dono pediu é a metade visível de um mecanismo que precisa existir de
qualquer forma.

**O orçamento de escrita é uma restrição de projeto, não um detalhe.** O
plano gratuito tem teto diário de escritas, e uma run dura poucos minutos:
gravar a cada run, com alguns amigos jogando horas, estoura. Por isso a
gravação remota é **estrangulada** — no máximo uma a cada poucos minutos,
sempre no limite de uma run, mais a do `pagehide`. O `localStorage` continua
gravando toda run; o que é raro é a subida. O preço disso é conhecido e
pequeno: mudar de aparelho pode custar as últimas runs.

## 7. Peça 5 — o cliente

Ao entrar o nome: `claim`. Se vier `409`, a tela do nome mostra o recado e
não deixa entrar (e diz há quanto tempo o outro aparelho deu sinal). Se vier
`200`, o save remoto é adotado — **quem tem a trava é a verdade**, não o
carimbo de tempo mais novo. É a regra simples que sobrevive a um aparelho que
jogou offline segurando a trava.

Depois disso o jogo roda como sempre; a sincronização é um efeito de borda do
ponto de salvamento que a Peça 2 já criou.

## 8. Peça 6 — quando a rede falha

Rede fora não pode parar o jogo: ele grava local, mostra um selo discreto de
«sem sincronizar» e tenta de novo no próximo ponto de salvamento. Se a trava
ainda for dele quando voltar, sobe. Se não for mais, o loop para com a mesma
mensagem do §6 — e nesse caso o save local do período órfão é **descartado**,
porque a alternativa é decidir qual dos dois históricos é o verdadeiro, e não
há resposta boa para isso.

## 9. O que este plano não faz

**Não faz o jogo rodar com a aba fechada.** Hoje nada avança sem a página
aberta, e nada aqui muda isso: o que persiste é o registro, não o tempo.

Existe um caminho elegante para isso, e ele deve ser decidido à parte: o
motor é determinístico e uma run inteira computa em centenas de milissegundos
sem desenhar nada, então dá para calcular no load as runs que teriam
acontecido no tempo ausente. Mas isso mexe direto em
`docs/project/objectives.md` («os ciclos médio e longo não podem ser
alcançáveis só pela ausência»), precisaria de teto, e é uma decisão de
produto — não de persistência.

## 10. As perguntas para o dono

1. **Rodar ausente entra ou não?** (§9). Recomendação: não agora.
2. **Onde hospedar?** Cloudflare é a recomendação; precisa de uma conta do
   dono. Se preferir não abrir conta, o plano para nas Peças 1–3 e ainda
   resolve o refresh.
3. **Takeover:** quando o prazo do arrendamento vence, o segundo aparelho
   entra sozinho (recomendado) ou nunca entra sem alguém mandar?
4. **Os notches seguem o nome?** (§3). Recomendação: seguem.

## 11. As tarefas, em ordem

Cada uma vale sozinha e dá para ver se funcionou.

| # | tarefa | como se vê que funcionou |
|---|---|---|
| T1 | `save.js`: documento único, sete módulos portados, chaves antigas migradas | o jogo se comporta igual; o devtools mostra uma chave só, com o progresso antigo dentro |
| T2 | fatia `session`, gravada no fim da run | refresh mantém «recent runs» e o número da run, e a contagem continua de onde estava |
| T3 | tela do nome, save por nome, «trocar de jogador» | dois nomes no mesmo browser = dois jogos independentes |
| T4 | Worker + KV com as três rotas | responde por `curl`, antes de a página saber que ele existe |
| T5 | cliente: claim, adoção do save remoto, sync estrangulado, perda de trava | dois browsers: o segundo é recusado com o recado certo |
| T6 | falha de rede: selo, retomada, descarte do órfão | devtools em offline durante uma run e de volta |

T1–T3 não dependem de decisão nenhuma e resolvem o problema relatado.
T4–T6 dependem das respostas 2 e 3 do §10.
