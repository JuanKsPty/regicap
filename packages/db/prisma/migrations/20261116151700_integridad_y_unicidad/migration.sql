-- Restricciones que Prisma no puede modelar (Fase 2 · D-05, D-12, RNF-10)

-- RF-07: una sola inscripción ACTIVA por participante y capacitación.
-- Cancelar cambia el estado (no se borra, D-12), por eso el índice es parcial.
CREATE UNIQUE INDEX "inscripcion_participante_capacitacion_activa_key"
  ON "inscripcion" ("participante_id", "capacitacion_id")
  WHERE "estado" <> 'CANCELADA';

-- RF-02: la Empresa y el Administrador pertenecen a una Empresa; el Participante no.
ALTER TABLE "usuario"
  ADD CONSTRAINT "usuario_empresa_segun_rol_chk"
  CHECK (("rol" = 'PARTICIPANTE' AND "empresa_id" IS NULL) OR ("rol" <> 'PARTICIPANTE' AND "empresa_id" IS NOT NULL));

-- Pesos de pregunta en (0, 100]
ALTER TABLE "pregunta"
  ADD CONSTRAINT "pregunta_peso_chk" CHECK ("peso" > 0 AND "peso" <= 100);

-- Puntaje 0–100
ALTER TABLE "calificacion"
  ADD CONSTRAINT "calificacion_puntaje_chk" CHECK ("puntaje" IS NULL OR ("puntaje" >= 0 AND "puntaje" <= 100));
