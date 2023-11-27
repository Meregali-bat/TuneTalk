CREATE TABLE IF NOT EXISTS `usuario` (
  `idusuario` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(45) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `senha` VARCHAR(65) NOT NULL,
  `fotoPerfil` VARCHAR(255) NULL,
  `bio` VARCHAR(255) NULL,
  PRIMARY KEY (`idusuario`));

CREATE TABLE IF NOT EXISTS`seguir` (
  `usuario_idusuario` INT NOT NULL,
  `usuario_idusuario1` INT NOT NULL,
  PRIMARY KEY (`usuario_idusuario`, `usuario_idusuario1`),
  INDEX `fk_usuario_has_usuario1_usuario2_idx` (`usuario_idusuario1` ASC),
  INDEX `fk_usuario_has_usuario1_usuario1_idx` (`usuario_idusuario` ASC),
  CONSTRAINT `fk_usuario_has_usuario1_usuario1`
    FOREIGN KEY (`usuario_idusuario`)
    REFERENCES`usuario` (`idusuario`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_usuario_has_usuario1_usuario2`
    FOREIGN KEY (`usuario_idusuario1`)
    REFERENCES`usuario` (`idusuario`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
)
ENGINE = InnoDB;


CREATE TABLE IF NOT EXISTS `post` (
  `idpost` INT NOT NULL AUTO_INCREMENT,
  `texto` VARCHAR(500) NOT NULL,
  `likes` INT NULL,
  `musicName` VARCHAR(255) NULL,
  `artistName` VARCHAR(255) NULL,
  `posterMusica` VARCHAR(255) NULL,
  `albumName` VARCHAR(255) NULL,
  `posterAlbum` VARCHAR(255) NULL,
  `postType` VARCHAR(255) NULL,
  `releaseDate` DATE NULL,
  `usuario_idusuario` INT NOT NULL,
  `data` DATETIME NOT NULL,
  PRIMARY KEY (`idpost`, `usuario_idusuario`),
  INDEX `fk_post_usuario1_idx` (`usuario_idusuario` ASC),
  CONSTRAINT `fk_post_usuario1`
  FOREIGN KEY (`usuario_idusuario`)
  REFERENCES `usuario` (`idusuario`)
  ON DELETE NO ACTION
  ON UPDATE NO ACTION);

CREATE TABLE IF NOT EXISTS `curtir` (
  `post_idpost` INT NOT NULL,
  `post_usuario_idusuario` INT NOT NULL,
  `usuario_idusuario` INT NOT NULL,
  PRIMARY KEY (`post_idpost`, `usuario_idusuario`, `post_usuario_idusuario`),
  INDEX `fk_post_has_usuario_usuario1_idx` (`usuario_idusuario`),
  INDEX `fk_post_has_usuario_post1_idx` (`post_idpost`, `post_usuario_idusuario`),
  CONSTRAINT `fk_post_has_usuario_post1`
    FOREIGN KEY (`post_idpost`, `post_usuario_idusuario`)
    REFERENCES `post` (`idpost`, `usuario_idusuario`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_post_has_usuario_usuario1`
    FOREIGN KEY (`usuario_idusuario`)
    REFERENCES `usuario` (`idusuario`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);



CREATE TABLE IF NOT EXISTS `comentarios` (
  `idcomentarios` INT NOT NULL AUTO_INCREMENT,
  `texto` VARCHAR(500) NOT NULL,
  `likes` INT NULL,
  `comentarioscol` VARCHAR(45) NULL,
  `post_idpost` INT NOT NULL,
  `usuario_idusuario` INT NOT NULL,
  PRIMARY KEY (`idcomentarios`)
  INDEX `fk_comentarios_post1_idx` (`post_idpost` ASC) ,
  INDEX `fk_comentarios_usuario1_idx` (`usuario_idusuario` ASC) ,
  CONSTRAINT `fk_comentarios_post1`
    FOREIGN KEY (`post_idpost`)
    REFERENCES `post` (`idpost`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_comentarios_usuario1`
    FOREIGN KEY (`usuario_idusuario`)
    REFERENCES `usuario` (`idusuario`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);

  

CREATE TABLE IF NOT EXISTS `comentarios_has_comentarios` (
  `comentarios_idcomentarios` INT NOT NULL,
  `comentarios_idcomentarios1` INT NOT NULL,
  PRIMARY KEY (`comentarios_idcomentarios`, `comentarios_idcomentarios1`),
  INDEX `fk_comentarios_has_comentarios_comentarios2_idx` (`comentarios_idcomentarios1` ASC) ,
  INDEX `fk_comentarios_has_comentarios_comentarios1_idx` (`comentarios_idcomentarios` ASC),
  CONSTRAINT `fk_comentarios_has_comentarios_comentarios1`
    FOREIGN KEY (`comentarios_idcomentarios`)
    REFERENCES `comentarios` (`idcomentarios`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_comentarios_has_comentarios_comentarios2`
    FOREIGN KEY (`comentarios_idcomentarios1`)
    REFERENCES `comentarios` (`idcomentarios`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION);
