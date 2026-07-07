# Simulado 1Z0-071

Aplicativo web (PWA) para simular a prova de certificação **Oracle Database SQL (1Z0-071)**, com banco de questões próprio, cronômetro e correção automática.

🔗 Deploy: [melodic-tarsier-e6843d.netlify.app](https://melodic-tarsier-e6843d.netlify.app)

## Funcionalidades

- Simulado cronometrado com envio automático das respostas ao término do tempo
- Quantidade de questões e duração configuráveis
- Geração de simulados variados a partir de um banco de questões
- Explicação didática (em português) para cada questão, cobrindo a regra do Oracle SQL por trás da resposta
- Instalável como PWA (funciona offline via Service Worker)

## Estrutura do projeto

```
index.html          # tela única do app (início, questão, resultado)
app.js               # lógica do simulado (seleção de questões, timer, correção)
style.css            # estilos
question-bank.json    # banco de questões (id, tópico, enunciado, alternativas, explicação)
manifest.json / sw.js  # configuração de PWA
icon-192.png / icon-512.png
```

## Banco de questões

As questões estão organizadas em 8 tópicos do edital: `fundamentals`, `select`, `functions`, `joins`, `dml`, `ddl`, `set`, `advanced`. Cada questão tem enunciado, alternativas, resposta(s) correta(s) e uma explicação didática.

## Como rodar localmente

Como é um app estático, basta servir a pasta com qualquer servidor HTTP, por exemplo:

```bash
npx serve .
```

E abrir `http://localhost:3000`.

## Tecnologias

HTML, CSS e JavaScript puro (sem frameworks), com Service Worker para funcionamento como PWA.
