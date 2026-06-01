ALTER TABLE `Usuario`
  ADD COLUMN `falhas_login` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `bloqueado_ate` DATETIME(3) NULL;

CREATE TABLE `senha_historico` (
  `id` VARCHAR(191) NOT NULL,
  `usuario_id` VARCHAR(191) NOT NULL,
  `senha_hash` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `senha_historico_usuario_id_idx` ON `senha_historico`(`usuario_id`);

ALTER TABLE `senha_historico`
  ADD CONSTRAINT `senha_historico_usuario_id_fkey`
  FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
