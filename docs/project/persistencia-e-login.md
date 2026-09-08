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
metade dos problemas: **no instante em que a run é contada.**

Antes desse instante a run não tocou em nada persistido, e por isso **uma run
interrompida por refresh simplesmente é jogada de novo, idêntica** — o par
`(seed da sessão, runNumber)` reproduz exatamente o mesmo mapa. Não existe
«salvar no meio», porque não existe meio que precise ser salvo.

Depois dele a run está contada. É por isso que o ponto **não** pode esperar a
loja, que dura meia dúzia de dezenas de segundos: quando ela abre, a
pontuação vitalícia já foi paga, a linha do recorde já foi escrita e o item
que o herói carregava já foi perdido para a morte. Gravar depois da loja
faria um refresh no meio dela repetir uma run que já cobrou tudo isso — e
cobrar de novo.

A loja grava a própria fatia no clique de cada compra, então sair no meio
dela custa o resto das compras e nada mais.

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

**O primeiro nome adota o save sem nome.** Quem já jogava antes disto tem o
progresso no slot `local`, e uma tela de login que o recebesse com histórico
vazio custaria exatamente o que este arco existe para proteger. Acontece uma
vez: carregado, o `local` deixa de existir, então o segundo nome começa
limpo — que é o que dois nomes num navegador têm de significar.

**Trocar de jogador recarrega a página.** A run em curso é do jogador que
está saindo, e não há como parar o loop no meio de uma run (nada neste
produto foi feito para parar). Recarregar é uma linha; um caminho de
desmontagem existiria para um botão só.

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

Recomendação: **Cloudflare Worker**, um arquivo editável pelo painel no
navegador (sem CLI, sem npm), plano gratuito. As alternativas foram
descartadas por peso (Firebase/Supabase trazem SDK e um modelo de
autenticação que não queremos) ou por não terem trava (gist/jsonbin não têm
escrita condicional). O armazenamento começou em KV e passou a **um Durable
Object por nome** quando cada run passou a subir: o teto gratuito do KV
(mil escritas por dia na conta inteira) virou o teto de runs por dia de
todos os jogadores juntos — `docs/project/decisions.md`, «A subida
espaçada». O Durable Object custou uma exceção ao «sem CLI»: o painel não
cria o namespace, então o primeiro deploy da classe passa pelo `wrangler`,
uma vez (`server/wrangler.jsonc`); depois disso o painel volta a servir.

Três rotas, e a trava é uma delas:

- `POST /claim {nome, aparelho, force}` → `200 {token, lease, save}` ou
  `409 {motivo:'ativo', ultimaAtividade, aparelho}`. Com `force`, a recusa
  não acontece: a trava viva é tomada, e o aparelho que a tinha é parado
  pelo mecanismo que já existia — o token dele deixou de ser o do dono.
- `PUT /state {nome, rev, save}` + header `X-Token` → `200 {rev, lease}`,
  `409` se o token não for mais o dono, `412` se a `rev` estiver atrasada
- `POST /release {nome, token, save, rev}` → grava e solta a trava; é o que o
  `pagehide` manda por `sendBeacon`

O arquivo é `server/save-worker.js`, e ele roda aqui também:
`node tools/save-server.mjs` sobe o MESMO arquivo com objetos falsos na
porta 8142, para curlar as rotas antes de existir conta em lugar nenhum. É
por isso que o worker não usa nada além de `Request`, `Response` e um
storage com `get` e `put` — o harness é encanamento, não uma segunda
implementação.

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
plano gratuito tem teto diário de escritas, e uma run dura poucos minutos.
Este plano propôs **estrangular** a subida (uma a cada poucos minutos) para
caber no teto, aceitando que mudar de aparelho custasse as últimas runs. Isso
foi construído, produziu duas histórias do mesmo nome, e foi desfeito: hoje
toda run sobe, e o teto é um custo do plano de hospedagem, não uma regra do
jogo — `docs/rules.md` §9 e `docs/project/decisions.md`, «A subida
espaçada».

## 7. Peça 5 — o cliente

Ao entrar o nome: `claim`. Se vier `409`, a tela do nome mostra o recado e
não deixa entrar (e diz há quanto tempo o outro aparelho deu sinal). Se vier
`200`, o save remoto é adotado sempre que existir. (O plano original
comparava revisões para decidir quem estava à frente; isso saiu junto com a
subida espaçada — `docs/project/decisions.md`, «A subida espaçada».) Um nome
que o servidor nunca viu sobe na hora, a partir da cópia do navegador.

Depois disso o jogo roda como sempre; a sincronização é um efeito de borda do
ponto de salvamento que a Peça 2 já criou.

**Uma recusa não é sempre um segundo aparelho.** Este é um jogo idle: uma aba
pausada por mais tempo que o prazo simplesmente deixa de renovar, e o nome
cai livre sem que ninguém o queira. Por isso um `409` na subida bate na porta
de novo: se o nome ainda está como foi deixado, a aba retoma a trava e segue
em silêncio; se alguém entrou no meio, aí sim ela para. Dizer «foi aberto em
outro aparelho» para quem só pausou seria mentira.

## 7b. Duas abas do mesmo navegador

**São duas travas diferentes, e a de fora não cobre o buraco.** A do serviço
recusa a segunda aba como recusaria outro aparelho — mas só enquanto ela for
alcançável. Sem rede, as duas abas falham em reclamar o nome, as duas jogam,
e as duas escrevem o mesmo documento: nenhuma corrompe os campos da outra
(cada uma grava o documento inteiro a partir da própria cópia), elas se
revezam apagando uma à outra, e quem subir primeiro quando a rede voltar
apaga a outra em silêncio.

A trava de dentro é do próprio navegador (`navigator.locks`): exclusiva por
origem, devolvida por ele mesmo quando a aba morre. Sem prazo, sem
batimento, sem chave no storage, nada a limpar depois de um crash — dez
linhas contra o arquivo inteiro que a trava de fora custou. Um navegador sem
a API joga como antes, porque recusar seria trocar uma bagunça rara por uma
certa.

Ela é pedida ANTES do nome: perguntar quem está jogando para recusar em
seguida seria grosseiro. E a segunda aba só recebe «recarregar» — dentro de
um navegador, fechar a outra aba é trivial, e um segundo jeito de tomar algo
seria mais para explicar do que vale.

## 8. Peça 6 — quando a rede falha

Esta peça propunha que rede fora não parasse o jogo: gravar local, mostrar um
selo de «sem sincronizar», descartar o «órfão» ao voltar se outro aparelho
tivesse jogado no meio. Foi construída assim e foi o que produziu o caso que
a derrubou. O que vale hoje está em `docs/rules.md` §9 («Sem servidor, o jogo
espera») e o porquê em `docs/project/decisions.md`, «A subida espaçada».

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

1. **Rodar ausente entra ou não?** (§9). Recomendação: não agora. É a única
   pergunta deste estudo que segue em aberto — as outras três foram
   respondidas e estão no código.
2. ~~**Onde hospedar?**~~ — respondido: Cloudflare Worker, hoje com um
   Durable Object por nome (§6). O deploy é do dono: o arquivo está escrito
   e testado.
3. ~~**Takeover**~~ — respondido DUAS vezes, e a segunda pelo uso. Primeiro:
   quando o prazo vence, o segundo aparelho entra sozinho. Depois, no
   primeiro dia de uso de verdade, o dono fechou o navegador do PC, o aviso
   de saída não saiu junto (fechar a janela inteira às vezes mata o processo
   antes), e o celular ficou esperando o prazo inteiro — então o botão
   «assumir mesmo assim» entrou também. Os dois convivem: o prazo é o que
   funciona sem ninguém, o botão é para quem SABE que o outro lado está
   fechado, que é uma coisa que só quem está olhando pode saber.
4. ~~**Os notches seguem o nome?**~~ — respondido: seguem (§3).

## 11. As tarefas, em ordem

Cada uma vale sozinha e dá para ver se funcionou.

| # | tarefa | como se vê que funcionou |
|---|---|---|
| T1 ✔ | `save.js`: documento único, sete módulos portados, chaves antigas migradas | o jogo se comporta igual; o devtools mostra uma chave só, com o progresso antigo dentro |
| T2 ✔ | fatia `session`, gravada quando a run é contada | refresh mantém «recent runs» e o número da run, e a contagem continua de onde estava |
| T3 ✔ | tela do nome, save por nome, «trocar de jogador» | dois nomes no mesmo browser = dois jogos independentes |
| T4 ✔ | Worker com as três rotas (KV, depois Durable Object) | responde por `curl`, antes de a página saber que ele existe |
| T5 ✔ | cliente: claim, adoção do save remoto, perda de trava | dois browsers: o segundo é recusado com o recado certo |
| T6 ✔ | falha de rede — feito como «selo, jogo local, descarte do órfão» e depois refeito como «toda run sobe; sem servidor, espera» | desligar a rede com a aba rodando: a tela de espera aparece no fim da run e some sozinha quando a rede volta |

T1–T3 não dependem de decisão nenhuma e resolvem o problema relatado.
T4–T6 dependem das respostas 2 e 3 do §10.
