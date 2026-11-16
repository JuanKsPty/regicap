'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ActividadDto,
  ActividadInput,
  ActividadPatchInput,
  AdministradorDto,
  AnalisisDto,
  AnalisisParticipanteDto,
  ArchivoSubidaDto,
  CapacitacionDetalleDto,
  CapacitacionDto,
  CapacitacionInput,
  CapacitacionPatchInput,
  CatalogoDto,
  ContenidoRespuesta,
  CrearAdministradorInput,
  DetalleCapacitacionDto,
  FeedbackContextoDto,
  FeedbackInput,
  FeedbackListadoDto,
  FeedbackParticipanteDto,
  FiltrosResultados,
  InscripcionDto,
  InscripcionesRespuestaDto,
  LoginInput,
  ModuloDetalleDto,
  ModuloEstadoDto,
  PreguntaEmpresaDto,
  PreguntaInput,
  ProgresoDto,
  RegistroInput,
  ResultadosDto,
  UsuarioDto,
  VistaInscripciones,
} from '@regicap/types';
import { api, qs } from './api-client';

/* Caché en el cliente con TanStack Query, invalidada tras cada cambio (Fase 2 · reducir transferencia). */

/* ───────── Sesión ───────── */
export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => api<UsuarioDto>('/auth/me'), staleTime: 5 * 60_000, retry: false });

export const useLogin = () => useMutation({ mutationFn: (v: LoginInput) => api<UsuarioDto>('/auth/login', { method: 'POST', body: v }) });
export const useRegistro = () => useMutation({ mutationFn: (v: RegistroInput) => api<UsuarioDto>('/auth/registro', { method: 'POST', body: v }) });

/* ───────── CU-11 / CU-12 · Empresa ───────── */
const kCaps = ['empresa', 'capacitaciones'] as const;

export const useCapacitaciones = () => useQuery({ queryKey: kCaps, queryFn: () => api<CapacitacionDto[]>('/empresa/capacitaciones') });
export const useCapacitacionDetalle = (id: string) =>
  useQuery({ queryKey: [...kCaps, id], queryFn: () => api<CapacitacionDetalleDto>(`/empresa/capacitaciones/${id}`) });

function useInvalidarEmpresa() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: kCaps });
}

export function useRegistrarCapacitacion() {
  const inv = useInvalidarEmpresa();
  return useMutation({ mutationFn: (v: CapacitacionInput) => api<CapacitacionDto>('/empresa/capacitaciones', { method: 'POST', body: v }), onSuccess: inv });
}
export function useEditarCapacitacion(id: string) {
  const inv = useInvalidarEmpresa();
  return useMutation({ mutationFn: (v: CapacitacionPatchInput) => api<CapacitacionDto>(`/empresa/capacitaciones/${id}`, { method: 'PATCH', body: v }), onSuccess: inv });
}
export function useCambiarEstadoCapacitacion() {
  const inv = useInvalidarEmpresa();
  return useMutation({
    mutationFn: ({ id, accion }: { id: string; accion: 'publicar' | 'despublicar' }) => api<CapacitacionDto>(`/empresa/capacitaciones/${id}/${accion}`, { method: 'POST' }),
    onSuccess: inv,
  });
}
export function useEliminarCapacitacion() {
  const inv = useInvalidarEmpresa();
  return useMutation({ mutationFn: (id: string) => api(`/empresa/capacitaciones/${id}`, { method: 'DELETE' }), onSuccess: inv });
}

export function useModulosMutations(capacitacionId: string) {
  const inv = useInvalidarEmpresa();
  const opts = { onSuccess: inv };
  return {
    crear: useMutation({ mutationFn: (v: { nombre: string; tipo?: 'CONTENIDO' | 'TEST' }) => api<{ id: string }>(`/empresa/capacitaciones/${capacitacionId}/modulos`, { method: 'POST', body: v }), ...opts }),
    renombrar: useMutation({ mutationFn: (v: { id: string; nombre: string }) => api(`/empresa/modulos/${v.id}`, { method: 'PATCH', body: { nombre: v.nombre } }), ...opts }),
    eliminar: useMutation({ mutationFn: (id: string) => api(`/empresa/modulos/${id}`, { method: 'DELETE' }), ...opts }),
    mover: useMutation({ mutationFn: (v: { id: string; direccion: -1 | 1 }) => api(`/empresa/modulos/${v.id}/mover`, { method: 'POST', body: { direccion: v.direccion } }), ...opts }),
    crearActividad: useMutation({ mutationFn: (v: { moduloId: string; data: ActividadInput }) => api<ActividadDto>(`/empresa/modulos/${v.moduloId}/actividades`, { method: 'POST', body: v.data }), ...opts }),
    editarActividad: useMutation({ mutationFn: (v: { id: string; data: ActividadPatchInput }) => api<ActividadDto>(`/empresa/actividades/${v.id}`, { method: 'PATCH', body: v.data }), ...opts }),
    eliminarActividad: useMutation({ mutationFn: (id: string) => api(`/empresa/actividades/${id}`, { method: 'DELETE' }), ...opts }),
    crearPregunta: useMutation({ mutationFn: (v: { moduloId: string; data: PreguntaInput }) => api<PreguntaEmpresaDto>(`/empresa/modulos/${v.moduloId}/preguntas`, { method: 'POST', body: v.data }), ...opts }),
    eliminarPregunta: useMutation({ mutationFn: (id: string) => api(`/empresa/preguntas/${id}`, { method: 'DELETE' }), ...opts }),
  };
}

/** Sube un PDF: pide URL firmada a la API y lo envía DIRECTO al almacenamiento (no pasa por la API ni por la BD). */
export async function subirPdf(archivo: File): Promise<string> {
  const { clave, url } = await api<ArchivoSubidaDto>('/empresa/archivos/subida', {
    method: 'POST',
    body: { nombre: archivo.name, tipo: 'application/pdf', tamano: archivo.size },
  });
  const res = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/pdf' }, body: archivo });
  if (!res.ok) throw new Error('No se pudo subir el archivo. Inténtalo de nuevo.');
  return clave;
}

export const useAdministradores = () => useQuery({ queryKey: ['empresa', 'administradores'], queryFn: () => api<AdministradorDto[]>('/empresa/administradores') });
export function useAdministradoresMutations() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['empresa', 'administradores'] });
  return {
    crear: useMutation({ mutationFn: (v: CrearAdministradorInput) => api<AdministradorDto>('/empresa/administradores', { method: 'POST', body: v }), onSuccess: inv }),
    eliminar: useMutation({ mutationFn: (id: string) => api(`/empresa/administradores/${id}`, { method: 'DELETE' }), onSuccess: inv }),
  };
}

/* ───────── CU-03 / CU-04 / CU-05 · Participante ───────── */
export const useInscripciones = (vista: VistaInscripciones) =>
  useQuery({ queryKey: ['insc', vista], queryFn: () => api<InscripcionesRespuestaDto>(`/participante/inscripciones${qs({ vista })}`), placeholderData: keepPreviousData });
export const useCatalogo = (page: number) =>
  useQuery({ queryKey: ['catalogo', page], queryFn: () => api<CatalogoDto>(`/catalogo${qs({ page })}`), placeholderData: keepPreviousData });

function useInvalidarParticipante() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ['insc'] }), qc.invalidateQueries({ queryKey: ['catalogo'] }), qc.invalidateQueries({ queryKey: ['progreso'] }), qc.invalidateQueries({ queryKey: ['modulos'] })]);
}
export function useInscribirse() {
  const inv = useInvalidarParticipante();
  return useMutation({ mutationFn: (capacitacionId: string) => api<InscripcionDto>('/participante/inscripciones', { method: 'POST', body: { capacitacionId } }), onSuccess: inv, onError: inv });
}
export function useCancelarInscripcion() {
  const inv = useInvalidarParticipante();
  return useMutation({ mutationFn: (id: string) => api<InscripcionDto>(`/participante/inscripciones/${id}/cancelar`, { method: 'PATCH' }), onSuccess: inv, onError: inv });
}

export const useProgreso = () => useQuery({ queryKey: ['progreso'], queryFn: () => api<ProgresoDto[]>('/participante/progreso') });
export const useModulosDeInscripcion = (inscripcionId: string) =>
  useQuery({
    queryKey: ['modulos', inscripcionId],
    queryFn: () => api<ModuloEstadoDto[]>(`/participante/progreso/${inscripcionId}/modulos`),
    // Mientras la IA califica, refresca solo ("Pendiente de calificación" → puntaje)
    refetchInterval: (q) => (q.state.data?.some((m) => m.pendienteCalificacion) ? 3000 : false),
  });

export const useModuloDetalle = (inscripcionId: string, moduloId: string) =>
  useQuery({
    queryKey: ['modulo', inscripcionId, moduloId],
    queryFn: () => api<ModuloDetalleDto>(`/participante/inscripciones/${inscripcionId}/modulos/${moduloId}`),
    refetchInterval: (q) => (q.state.data?.pendienteCalificacion ? 2500 : false),
  });
export function useResolverModulo(inscripcionId: string, moduloId: string) {
  const qc = useQueryClient();
  const base = `/participante/inscripciones/${inscripcionId}/modulos/${moduloId}`;
  const alTerminar = (d: ModuloDetalleDto) => {
    qc.setQueryData(['modulo', inscripcionId, moduloId], d);
    void qc.invalidateQueries({ queryKey: ['modulos', inscripcionId] });
    void qc.invalidateQueries({ queryKey: ['progreso'] });
    void qc.invalidateQueries({ queryKey: ['insc'] });
  };
  return {
    guardar: useMutation({ mutationFn: (v: ContenidoRespuesta) => api<ModuloDetalleDto>(`${base}/borrador`, { method: 'PUT', body: v }), onSuccess: alTerminar }),
    enviar: useMutation({ mutationFn: (v: ContenidoRespuesta) => api<ModuloDetalleDto>(`${base}/enviar`, { method: 'POST', body: v }), onSuccess: alTerminar }),
  };
}

export const useFeedbackParticipante = () => useQuery({ queryKey: ['feedback', 'participante'], queryFn: () => api<FeedbackParticipanteDto>('/participante/feedback') });

/* ───────── CU-08 / CU-09 / CU-10 · Administrador ───────── */
export const useResultados = (f: FiltrosResultados) =>
  useQuery({ queryKey: ['resultados', f], queryFn: () => api<ResultadosDto>(`/admin/resultados${qs(f)}`), placeholderData: keepPreviousData });
export const useDetalleCapacitacionAdmin = (id: string) =>
  useQuery({ queryKey: ['resultados', 'cap', id], queryFn: () => api<DetalleCapacitacionDto>(`/admin/resultados/capacitaciones/${id}`) });
export const useAnalisisParticipante = (id: string) =>
  useQuery({ queryKey: ['resultados', 'participante', id], queryFn: () => api<AnalisisParticipanteDto>(`/admin/participantes/${id}/analisis`) });
export const useAnalisis = () => useQuery({ queryKey: ['analisis'], queryFn: () => api<AnalisisDto>('/admin/analisis') });

export function useMarcarDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { clave: string; aplicada: boolean }) => api('/admin/decisiones', { method: 'POST', body: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analisis'] }),
  });
}
export function useReencolarCalificaciones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ reencoladas: number }>('/admin/calificaciones/reencolar', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resultados'] }),
  });
}

export const useFeedbackListado = (q: string) =>
  useQuery({ queryKey: ['feedback', 'listado', q], queryFn: () => api<FeedbackListadoDto>(`/admin/feedback/participantes${qs({ q })}`), placeholderData: keepPreviousData });
export const useFeedbackContexto = (participanteId: string | null, capacitacionId: string | null) =>
  useQuery({
    queryKey: ['feedback', 'contexto', participanteId, capacitacionId],
    enabled: !!participanteId,
    queryFn: () => api<FeedbackContextoDto>(`/admin/feedback/contexto${qs({ participanteId, capacitacionId })}`),
  });
export function useEnviarFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: FeedbackInput) => api('/admin/feedback', { method: 'POST', body: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback'] }),
  });
}
