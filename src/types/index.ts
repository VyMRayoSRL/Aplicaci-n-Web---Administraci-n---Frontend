// Tipos base para la aplicación
export interface ApiResponse<T> {
  data: T;
  total?: number;
  page?: number;
  limit?: number;
  message?: string;
}

// Roles de usuario soportados en la aplicación
export type Role = 'admin' | 'contabilidad' | 'supervisor';

export interface PaginationParams {
  page: number;
  limit: number;
}

// Entidades principales
export interface Servicio {
  id_servicio: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ServicioForm {
  nombre: string;
  descripcion?: string;
}

export interface ServicioFilters extends PaginationParams {
  nombre?: string;
  activo?: boolean;
}

export interface Puesto {
  id_puesto: number;
  id_servicio: number;
  nombre: string;
  descripcion?: string;
  cant_horas: number;
  activo: boolean;
  created_at: string;
  updated_at?: string;
}

export interface PuestoForm {
  id_servicio: number;
  nombre: string;
  descripcion?: string;
  cant_horas: number;
}

export interface PuestoFilters extends PaginationParams {
  id_servicio?: number;
  nombre?: string;
  activo?: boolean;
}

export interface Planilla {
  id_planilla: number;
  id_puesto: number;
  mes: number;
  anio: number;
  horas_mensuales: number;
  estado: PlanillaEstado;
  id_usuario: number;
}

// Borrador → vigente → cerrada (una cerrada se reabre a vigente)
export type PlanillaEstado = 'borrador' | 'vigente' | 'cerrada';

export interface PlanillaForm {
  id_puesto: number;
  mes: number;
  anio: number;
}

export interface PlanillaFilters extends PaginationParams {
  id_puesto?: number;
  mes?: number;
  anio?: number;
}

export interface DiaPlanilla {
  id_dia_planilla: number;
  id_planilla: number;
  id_dia_tipo?: number;
  fecha: string;
  horas_requeridas: number;
  horas_totales_trabajadas: number;
  horas_cumplidas: number;
  horario_entrada?: string;
  horario_salida?: string;
  horario_entrada_2?: string;
  horario_salida_2?: string;
  jornada_partida: boolean;
  es_laborable: boolean;
}

export interface DiaPuestoTipo {
  id_dia_tipo: number;
  id_puesto: number;
  dia_semana: number;
  fecha_especial?: string | null;
  horario_entrada?: string | null;
  horario_salida?: string | null;
  horario_entrada_2?: string | null;
  horario_salida_2?: string | null;
  horas_requeridas: number;
  jornada_horario_partido: boolean;
  es_laborable: boolean;
}

export interface DiaPuestoTipoForm {
  id_puesto: number;
  dia_semana: number;
  fecha_especial?: string | null;
  horario_entrada?: string | null;
  horario_salida?: string | null;
  horario_entrada_2?: string | null;
  horario_salida_2?: string | null;
  jornada_horario_partido: boolean;
  es_laborable: boolean;
}

// Turno como intervalo [inicio, fin) con fecha y hora local 'YYYY-MM-DDTHH:mm'.
// fecha, hora_inicio, hora_fin, cantidad_horas e id_dia_planilla son derivados (vienen calculados del back).
export interface Turno {
  id_turno: number;
  id_planilla: number;
  id_vigilador: number;
  inicio: string;
  fin: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  cantidad_horas: number;
  horas_diurnas: number;
  horas_nocturnas: number;
  id_dia_planilla: number | null;
  id_puesto: number;
  id_servicio: number;
  puesto_nombre?: string;
  servicio_nombre?: string;
  advertencias?: AdvertenciaTurno[];
}

// No impiden guardar: más de 12 h seguidas o menos de 12 h de descanso
export interface AdvertenciaTurno {
  codigo: 'TURNO_LARGO' | 'DESCANSO_CORTO';
  mensaje: string;
}

export interface TurnoForm {
  id_planilla: number;
  id_vigilador: number;
  inicio: string;
  fin: string;
}

export interface DiaVigiladorIndexMap {
  [idVigilador: number]: { [fecha: string]: any };
}

export interface DiaVigilador {
  id_dia_vigilador: number;
  id_vigilador: number;
  fecha: string;
  estado: 'trabaja' | 'franco' | 'ausente' | 'vacaciones' | 'licencia' | 'feriado' | 'enfermo' | 'No Asignado';
}

// Estados compartidos
export const AsistenciaEstado = {
  OK: 'OK',
  DESVIO: 'El tiempo registrado es mayor al tiempo planificado',
  SIN_PLANIFICACION: 'SIN_PLANIFICACION',
  VIGILADOR_DESCONOCIDO: 'VIGILADOR_DESCONOCIDO',
  SIN_COMPARACION: 'SIN_COMPARACION',
  NO_ASIGNADO: 'El estado del vigilador no debería quedar como "No Asignado"',
  MALA_PLANIFICACION_TURNOS: 'Tuvo turnos registrados pero no planificados y su estado tampoco concuerda',
  TURNOS_SIN_ASISTENCIA: 'Hubo turnos planificados pero no se registraron asistencias para este día',
  ASISTENCIAS_SIN_TURNOS: 'Tuvo asistencias registradas pero no turnos planificados para este día',
} as const
export type AsistenciaEstadoType = typeof AsistenciaEstado[keyof typeof AsistenciaEstado]

export const DiaVigiladorEstado = {
  TRABAJA: 'trabaja',
  NO_ASIGNADO: 'No Asignado',
  FRANCO: 'franco',
  AUSENTE: 'ausente',
  VACACIONES: 'vacaciones',
  LICENCIA: 'licencia',
  FERIADO: 'feriado',
  ENFERMO: 'enfermo',
} as const
export type DiaVigiladorEstadoType = typeof DiaVigiladorEstado[keyof typeof DiaVigiladorEstado]

export interface Vigilador {
  id_vigilador: number;
  nombre: string;
  apellido: string;
  legajo: string;
  dni: string;
  activo: boolean;
  created_at: string;
  updated_at?: string;
}

export interface PlanillaVigilador {
  id_planilla: number;
  id_vigilador: number;
}

// Tipos para contabilidad
export interface ContabilidadResumen {
  id_vigilador: number;
  mes: number;
  anio: number;
  horas_diurnas: number;
  horas_nocturnas: number;
  horas_totales: number;
  dias_trabajados: number;
}

export interface ContabilidadPlanilla {
  fecha: string;
  estado: string;
  turnos: Array<{
    hora_inicio: string;
    hora_fin: string;
    horas_diurnas: number;
    horas_nocturnas: number;
    horas_totales: number;
  }>;
  horas_diurnas: number;
  horas_nocturnas: number;
  horas_totales: number;
}

export interface AsistenciaExcel {
  legajo: number;
  fecha: string;
  pares?: Array<{ entrada: string; salida: string }>;
  horas_diurnas: number;
  horas_nocturnas: number;
  horas_totales: number;
  feriado?: boolean;
  dia_trabajado: boolean;
}

// Estados reales que puede devolver el backend actualmente
export type EstadoComparacion =
  | 'OK'
  | 'DESVIO'
  | 'SIN_COMPARACION'
  | 'VIGILADOR_DESCONOCIDO'
  | 'SIN_PLANIFICACION';

export interface ComparacionDetalle {
  excel: { inicio: string; fin: string; dur_min: number };
  plan: { inicio: string; fin: string; dur_min: number };
  delta_inicio_min: number;
  delta_fin_min: number;
  delta_total_min: number;
  dentro_tolerancia: boolean;
}

export interface ComparacionAsistencia extends AsistenciaExcel {
  id_vigilador?: number;
  estado: EstadoComparacion;
  comparaciones?: ComparacionDetalle[];
  delta_total_min?: number;
  desglose_por_lugar?: DesglosePorLugarSegment[];
}

export interface ResumenMensual {
  legajo: number | string;
  horas_diurnas: number;
  horas_nocturnas: number;
  horas_totales: number;
  dias_trabajado: number;
  ausencias: number;
}

export interface DesglosePorLugarSegment {
  id_planilla?: number | null;
  id_puesto?: number | null;
  id_servicio?: number | null;
  minutos_diurnos: number;
  minutos_nocturnos: number;
  minutos_totales: number;
  fuente: 'planificado' | 'inferido' | 'desconocido';
}

export interface ResumenPorPuesto {
  legajo: number | string;
  id_puesto: number;
  id_servicio?: number | null;
  id_planilla?: number | null;
  horas_diurnas: number;
  horas_nocturnas: number;
  horas_totales: number;
}

export interface ResumenPorServicio {
  legajo: number | string;
  id_servicio: number;
  horas_diurnas: number;
  horas_nocturnas: number;
  horas_totales: number;
}

export interface ResumenMensualTodos {
  id_vigilador: number;
  legajo: string | number;
  apellido: string;
  nombre: string;
  horas_diurnas: number;
  horas_nocturnas: number;
  horas_totales: number;
  dias_trabajados: number;
}

// Tipos para formularios y filtros
export interface LoginForm {
  email: string;
  password: string;
}

export interface User {
  id_usuario: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: Role;
}

// Tipos para navegación