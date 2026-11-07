-- Remix passou a se chamar Replay: os avisos já gravados também mudam o texto.
UPDATE "notificacoes" SET "conteudo" = 'deu replay no seu post' WHERE "tipo" = 'citacao' AND "conteudo" = 'remixou seu post';
