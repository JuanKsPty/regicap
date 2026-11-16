-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('PARTICIPANTE', 'EMPRESA', 'ADMINISTRADOR');

-- CreateEnum
CREATE TYPE "EstadoCapacitacion" AS ENUM ('BORRADOR', 'PUBLICADA');

-- CreateEnum
CREATE TYPE "EstadoInscripcion" AS ENUM ('PENDIENTE', 'EN_CURSO', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoModulo" AS ENUM ('CONTENIDO', 'TEST');

-- CreateEnum
CREATE TYPE "TipoActividad" AS ENUM ('PDF', 'TEXTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "TipoPregunta" AS ENUM ('SIMPLE', 'TEXTO_LIBRE', 'CUANTITATIVA', 'CUALITATIVA');

-- CreateEnum
CREATE TYPE "EstadoRespuesta" AS ENUM ('BORRADOR', 'ENVIADA');

-- CreateEnum
CREATE TYPE "EstadoCalificacion" AS ENUM ('PENDIENTE', 'CALIFICADA', 'ERROR');

-- CreateEnum
CREATE TYPE "Nivel" AS ENUM ('ALTO', 'MEDIO', 'BAJO');

-- CreateTable
CREATE TABLE "empresa" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "tipo" VARCHAR(40) NOT NULL DEFAULT 'otro',
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "password_hash" VARCHAR(72) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "rol" "Rol" NOT NULL,
    "empresa_id" UUID,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacitacion" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "duracion" VARCHAR(40) NOT NULL,
    "estado" "EstadoCapacitacion" NOT NULL DEFAULT 'BORRADOR',
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "capacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modulo" (
    "id" UUID NOT NULL,
    "capacitacion_id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "tipo" "TipoModulo" NOT NULL DEFAULT 'CONTENIDO',
    "orden" INTEGER NOT NULL,

    CONSTRAINT "modulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividad" (
    "id" UUID NOT NULL,
    "modulo_id" UUID NOT NULL,
    "titulo" VARCHAR(160) NOT NULL,
    "tipo" "TipoActividad" NOT NULL,
    "contenido" TEXT,
    "archivo_key" VARCHAR(300),
    "orden" INTEGER NOT NULL,

    CONSTRAINT "actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pregunta" (
    "id" UUID NOT NULL,
    "modulo_id" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "tipo" "TipoPregunta" NOT NULL,
    "peso" DECIMAL(5,2) NOT NULL,
    "configuracion" JSONB,
    "rubrica" TEXT,
    "creada_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripcion" (
    "id" UUID NOT NULL,
    "participante_id" UUID NOT NULL,
    "capacitacion_id" UUID NOT NULL,
    "estado" "EstadoInscripcion" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_inscripcion" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuesta" (
    "id" UUID NOT NULL,
    "inscripcion_id" UUID NOT NULL,
    "modulo_id" UUID NOT NULL,
    "contenido" JSONB NOT NULL,
    "estado" "EstadoRespuesta" NOT NULL DEFAULT 'BORRADOR',
    "fecha_envio" TIMESTAMPTZ,
    "actualizada_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calificacion" (
    "id" UUID NOT NULL,
    "respuesta_id" UUID NOT NULL,
    "estado" "EstadoCalificacion" NOT NULL DEFAULT 'PENDIENTE',
    "puntaje" DECIMAL(5,2),
    "nivel" "Nivel",
    "criterio_mas_bajo" VARCHAR(200),
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "detalle" JSONB,
    "ultimo_error" VARCHAR(500),
    "actualizada_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "administrador_id" UUID NOT NULL,
    "participante_id" UUID NOT NULL,
    "capacitacion_id" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "fecha" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_aplicada" (
    "empresa_id" UUID NOT NULL,
    "clave" VARCHAR(120) NOT NULL,
    "aplicada_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_aplicada_pkey" PRIMARY KEY ("empresa_id","clave")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresa_nombre_key" ON "empresa"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_empresa_id_idx" ON "usuario"("empresa_id");

-- CreateIndex
CREATE INDEX "capacitacion_estado_idx" ON "capacitacion"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "capacitacion_empresa_id_nombre_key" ON "capacitacion"("empresa_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "modulo_capacitacion_id_orden_key" ON "modulo"("capacitacion_id", "orden");

-- CreateIndex
CREATE INDEX "actividad_modulo_id_orden_idx" ON "actividad"("modulo_id", "orden");

-- CreateIndex
CREATE INDEX "pregunta_modulo_id_idx" ON "pregunta"("modulo_id");

-- CreateIndex
CREATE INDEX "inscripcion_participante_id_estado_idx" ON "inscripcion"("participante_id", "estado");

-- CreateIndex
CREATE INDEX "inscripcion_capacitacion_id_estado_idx" ON "inscripcion"("capacitacion_id", "estado");

-- CreateIndex
CREATE INDEX "respuesta_modulo_id_idx" ON "respuesta"("modulo_id");

-- CreateIndex
CREATE UNIQUE INDEX "respuesta_inscripcion_id_modulo_id_key" ON "respuesta"("inscripcion_id", "modulo_id");

-- CreateIndex
CREATE UNIQUE INDEX "calificacion_respuesta_id_key" ON "calificacion"("respuesta_id");

-- CreateIndex
CREATE INDEX "calificacion_estado_idx" ON "calificacion"("estado");

-- CreateIndex
CREATE INDEX "feedback_participante_id_fecha_idx" ON "feedback"("participante_id", "fecha");

-- CreateIndex
CREATE INDEX "feedback_capacitacion_id_idx" ON "feedback"("capacitacion_id");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacitacion" ADD CONSTRAINT "capacitacion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modulo" ADD CONSTRAINT "modulo_capacitacion_id_fkey" FOREIGN KEY ("capacitacion_id") REFERENCES "capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividad" ADD CONSTRAINT "actividad_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pregunta" ADD CONSTRAINT "pregunta_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripcion" ADD CONSTRAINT "inscripcion_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripcion" ADD CONSTRAINT "inscripcion_capacitacion_id_fkey" FOREIGN KEY ("capacitacion_id") REFERENCES "capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta" ADD CONSTRAINT "respuesta_inscripcion_id_fkey" FOREIGN KEY ("inscripcion_id") REFERENCES "inscripcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta" ADD CONSTRAINT "respuesta_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificacion" ADD CONSTRAINT "calificacion_respuesta_id_fkey" FOREIGN KEY ("respuesta_id") REFERENCES "respuesta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_administrador_id_fkey" FOREIGN KEY ("administrador_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_capacitacion_id_fkey" FOREIGN KEY ("capacitacion_id") REFERENCES "capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_aplicada" ADD CONSTRAINT "decision_aplicada_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
