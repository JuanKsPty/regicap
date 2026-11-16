-- Separada de la anterior: un valor nuevo de un enum no puede usarse en la misma
-- transacción que lo crea (ALTER TYPE … ADD VALUE).
--
-- RF-02: EMPRESA y ADMINISTRADOR pertenecen a una Empresa; PARTICIPANTE y SUPERADMIN no.
ALTER TABLE "usuario" DROP CONSTRAINT "usuario_empresa_segun_rol_chk";
ALTER TABLE "usuario"
  ADD CONSTRAINT "usuario_empresa_segun_rol_chk"
  CHECK (
    ("rol" IN ('PARTICIPANTE', 'SUPERADMIN') AND "empresa_id" IS NULL)
    OR ("rol" IN ('EMPRESA', 'ADMINISTRADOR') AND "empresa_id" IS NOT NULL)
  );
