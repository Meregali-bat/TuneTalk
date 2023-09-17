-- -----------------------------------------------------
-- Table `tunetalk`.`album`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tunetalk`.`album` (
  `idalbum` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(45) NOT NULL,
  `descricao` VARCHAR(250) NOT NULL,
  PRIMARY KEY (`idalbum`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `tunetalk`.`musica`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tunetalk`.`musica` (
  `idmusica` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(45) NOT NULL,
  `duracao` TIME NOT NULL,
  `album_idalbum` INT NOT NULL,
  PRIMARY KEY (`idmusica`, `album_idalbum`),
  INDEX `fk_musica_album1_idx` (`album_idalbum` ASC) VISIBLE,
  CONSTRAINT `fk_musica_album1`
    FOREIGN KEY (`album_idalbum`)
    REFERENCES `tunetalk`.`album` (`idalbum`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `tunetalk`.`artista`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tunetalk`.`artista` (
  `idartista` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(80) NOT NULL,
  PRIMARY KEY (`idartista`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `tunetalk`.`artistamusica`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tunetalk`.`artistamusica` (
  `idartista` INT NOT NULL,
  `idmusica` INT NOT NULL,
  PRIMARY KEY (`idartista`, `idmusica`),
  INDEX `fk_artista_has_musica_musica1_idx` (`idmusica` ASC) VISIBLE,
  INDEX `fk_artista_has_musica_artista_idx` (`idartista` ASC) VISIBLE,
  CONSTRAINT `fk_artista_has_musica_artista`
    FOREIGN KEY (`idartista`)
    REFERENCES `tunetalk`.`artista` (`idartista`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_artista_has_musica_musica1`
    FOREIGN KEY (`idmusica`)
    REFERENCES `tunetalk`.`musica` (`idmusica`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `tunetalk`.`genero`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tunetalk`.`genero` (
  `idgenero` INT NOT NULL,
  `nome` VARCHAR(45) NOT NULL,
  `descricao` VARCHAR(250) NOT NULL,
  PRIMARY KEY (`idgenero`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `tunetalk`.`musicagenero`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tunetalk`.`musicagenero` (
  `idmusica` INT NOT NULL,
  `idgenero` INT NOT NULL,
  PRIMARY KEY (`idmusica`, `idgenero`),
  INDEX `fk_musica_has_genero_genero1_idx` (`idgenero` ASC) VISIBLE,
  INDEX `fk_musica_has_genero_musica1_idx` (`idmusica` ASC) VISIBLE,
  CONSTRAINT `fk_musica_has_genero_musica1`
    FOREIGN KEY (`idmusica`)
    REFERENCES `tunetalk`.`musica` (`idmusica`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_musica_has_genero_genero1`
    FOREIGN KEY (`idgenero`)
    REFERENCES `tunetalk`.`genero` (`idgenero`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `tunetalk`.`artistagenero`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tunetalk`.`artistagenero` (
  `idartista` INT NOT NULL,
  `idgenero` INT NOT NULL,
  PRIMARY KEY (`idartista`, `idgenero`),
  INDEX `fk_artista_has_genero_genero1_idx` (`idgenero` ASC) VISIBLE,
  INDEX `fk_artista_has_genero_artista1_idx` (`idartista` ASC) VISIBLE,
  CONSTRAINT `fk_artista_has_genero_artista1`
    FOREIGN KEY (`idartista`)
    REFERENCES `tunetalk`.`artista` (`idartista`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_artista_has_genero_genero1`
    FOREIGN KEY (`idgenero`)
    REFERENCES `tunetalk`.`genero` (`idgenero`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `tunetalk`.`albumartista`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tunetalk`.`albumartista` (
  `idalbum` INT NOT NULL,
  `idartista` INT NOT NULL,
  PRIMARY KEY (`idalbum`, `idartista`),
  INDEX `fk_album_has_artista_artista1_idx` (`idartista` ASC) VISIBLE,
  INDEX `fk_album_has_artista_album1_idx` (`idalbum` ASC) VISIBLE,
  CONSTRAINT `fk_album_has_artista_album1`
    FOREIGN KEY (`idalbum`)
    REFERENCES `tunetalk`.`album` (`idalbum`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_album_has_artista_artista1`
    FOREIGN KEY (`idartista`)
    REFERENCES `tunetalk`.`artista` (`idartista`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `tunetalk`.`albumgenero`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tunetalk`.`albumgenero` (
  `idalbum` INT NOT NULL,
  `idgenero` INT NOT NULL,
  PRIMARY KEY (`idalbum`, `idgenero`),
  INDEX `fk_album_has_genero_genero1_idx` (`idgenero` ASC) VISIBLE,
  INDEX `fk_album_has_genero_album1_idx` (`idalbum` ASC) VISIBLE,
  CONSTRAINT `fk_album_has_genero_album1`
    FOREIGN KEY (`idalbum`)
    REFERENCES `tunetalk`.`album` (`idalbum`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_album_has_genero_genero1`
    FOREIGN KEY (`idgenero`)
    REFERENCES `tunetalk`.`genero` (`idgenero`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `tunetalk`.`usuariomusica`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tunetalk`.`usuariomusica` (
  `idusuario` INT NOT NULL,
  `idmusica` INT NOT NULL,
  `musica_album_idalbum` INT NOT NULL,
  PRIMARY KEY (`idusuario`, `idmusica`, `musica_album_idalbum`),
  INDEX `fk_usuario_has_musica_musica1_idx` (`idmusica` ASC, `musica_album_idalbum` ASC) VISIBLE,
  INDEX `fk_usuario_has_musica_usuario1_idx` (`idusuario` ASC) VISIBLE,
  CONSTRAINT `fk_usuario_has_musica_usuario1`
    FOREIGN KEY (`idusuario`)
    REFERENCES `tunetalk`.`usuario` (`idusuario`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_usuario_has_musica_musica1`
    FOREIGN KEY (`idmusica` , `musica_album_idalbum`)
    REFERENCES `tunetalk`.`musica` (`idmusica` , `album_idalbum`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `tunetalk`.`post`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tunetalk`.`post` (
  `idpost` INT NOT NULL AUTO_INCREMENT,
  `texto` VARCHAR(500) NOT NULL,
  `likes` INT NULL,
  `usuario_idusuario` INT NOT NULL,
  PRIMARY KEY (`idpost`, `usuario_idusuario`),
  INDEX `fk_post_usuario1_idx` (`usuario_idusuario` ASC) VISIBLE,
  CONSTRAINT `fk_post_usuario1`
    FOREIGN KEY (`usuario_idusuario`)
    REFERENCES `tunetalk`.`usuario` (`idusuario`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `tunetalk`.`comentarios`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tunetalk`.`comentarios` (
  `idcomentarios` INT NOT NULL AUTO_INCREMENT,
  `likes` INT NULL,
  `post_idpost` INT NOT NULL,
  `post_usuario_idusuario` INT NOT NULL,
  PRIMARY KEY (`post_idpost`, `post_usuario_idusuario`),
  CONSTRAINT `fk_comentarios_post1`
    FOREIGN KEY (`post_idpost` , `post_usuario_idusuario`)
    REFERENCES `tunetalk`.`post` (`idpost` , `usuario_idusuario`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `tunetalk`.`favoritos`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tunetalk`.`favoritos` (
  `idfavoritos` INT NOT NULL,
  `nome` VARCHAR(250) NULL,
  PRIMARY KEY (`idfavoritos`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `tunetalk`.`favoritos_has_usuario`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tunetalk`.`favoritos_has_usuario` (
  `favoritos_idfavoritos` INT NOT NULL,
  `usuario_idusuario` INT NOT NULL,
  PRIMARY KEY (`favoritos_idfavoritos`, `usuario_idusuario`),
  INDEX `fk_favoritos_has_usuario_usuario1_idx` (`usuario_idusuario` ASC) VISIBLE,
  INDEX `fk_favoritos_has_usuario_favoritos1_idx` (`favoritos_idfavoritos` ASC) VISIBLE,
  CONSTRAINT `fk_favoritos_has_usuario_favoritos1`
    FOREIGN KEY (`favoritos_idfavoritos`)
    REFERENCES `tunetalk`.`favoritos` (`idfavoritos`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_favoritos_has_usuario_usuario1`
    FOREIGN KEY (`usuario_idusuario`)
    REFERENCES `tunetalk`.`usuario` (`idusuario`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `tunetalk`.`favoritos_has_musica`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tunetalk`.`favoritos_has_musica` (
  `favoritos_idfavoritos` INT NOT NULL,
  `musica_idmusica` INT NOT NULL,
  `musica_album_idalbum` INT NOT NULL,
  PRIMARY KEY (`favoritos_idfavoritos`, `musica_idmusica`, `musica_album_idalbum`),
  INDEX `fk_favoritos_has_musica_musica1_idx` (`musica_idmusica` ASC, `musica_album_idalbum` ASC) VISIBLE,
  INDEX `fk_favoritos_has_musica_favoritos1_idx` (`favoritos_idfavoritos` ASC) VISIBLE,
  CONSTRAINT `fk_favoritos_has_musica_favoritos1`
    FOREIGN KEY (`favoritos_idfavoritos`)
    REFERENCES `tunetalk`.`favoritos` (`idfavoritos`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_favoritos_has_musica_musica1`
    FOREIGN KEY (`musica_idmusica` , `musica_album_idalbum`)
    REFERENCES `tunetalk`.`musica` (`idmusica` , `album_idalbum`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
