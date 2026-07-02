export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      estudiantes: {
        Row: {
          id: string;
          nombre: string;
          apellidos: string;
          telefono: string | null;
          email: string | null;
          foto_url: string | null;
          activo: boolean;
          terminal_person_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["estudiantes"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["estudiantes"]["Insert"]>;
        Relationships: [];
      };
      planes: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          monto: number;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["planes"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["planes"]["Insert"]>;
        Relationships: [];
      };
      inscripciones: {
        Row: {
          id: string;
          estudiante_id: string;
          plan_id: string;
          activa: boolean;
          fecha_inicio: string;
          fecha_fin: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["inscripciones"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["inscripciones"]["Insert"]
        >;
        Relationships: [];
      };
      pagos: {
        Row: {
          id: string;
          estudiante_id: string;
          inscripcion_id: string;
          anio: number;
          mes: number;
          monto: number;
          pagado: boolean;
          fecha_pago: string | null;
          metodo_pago: string;
          referencia_externa: string | null;
          registrado_por: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["pagos"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["pagos"]["Insert"]>;
        Relationships: [];
      };
      cargos_especiales: {
        Row: {
          id: string;
          estudiante_id: string;
          tipo: "inscripcion" | "clase_suelta" | "clase_extra";
          descripcion: string;
          monto: number;
          pagado: boolean;
          fecha_cargo: string;
          fecha_pago: string | null;
          metodo_pago: string;
          referencia_externa: string | null;
          registrado_por: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["cargos_especiales"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["cargos_especiales"]["Insert"]
        >;
        Relationships: [];
      };
      accesos: {
        Row: {
          id: string;
          estudiante_id: string | null;
          terminal_person_id: string | null;
          tipo: "entrada" | "salida" | "denegado";
          motivo_denegado: string | null;
          capturado_en: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["accesos"]["Row"],
          "id" | "capturado_en"
        >;
        Update: never;
        Relationships: [];
      };
      cola_comandos: {
        Row: {
          id: string;
          tipo: string;
          estudiante_id: string | null;
          payload: Json | null;
          estatus: "pendiente" | "procesando" | "completado" | "error";
          intento: number;
          error_msg: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["cola_comandos"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["cola_comandos"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: {
      v_estado_pago_actual: {
        Row: {
          estudiante_id: string;
          nombre: string;
          apellidos: string;
          activo: boolean;
          terminal_person_id: string | null;
          acceso_permitido: boolean;
          anio_actual: number;
          mes_actual: number;
          last_payment_date: string | null;
          months_overdue: number;
          days_overdue: number | null;
          inscripciones_monto_pendiente: number;
          cargos_especiales_total_pendiente: number;
          cargos_especiales_count_pendiente: number;
          monto_total_adeudado: number;
          last_updated: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      [key: string]: never;
    };
  };
}

// Aliases útiles
export type Estudiante = Database["public"]["Tables"]["estudiantes"]["Row"];
export type Plan = Database["public"]["Tables"]["planes"]["Row"];
export type Inscripcion = Database["public"]["Tables"]["inscripciones"]["Row"];
export type Pago = Database["public"]["Tables"]["pagos"]["Row"];
export type CargoEspecial =
  Database["public"]["Tables"]["cargos_especiales"]["Row"];
export type Acceso = Database["public"]["Tables"]["accesos"]["Row"];
export type ColaComando = Database["public"]["Tables"]["cola_comandos"]["Row"];
export type EstadoPagoActual =
  Database["public"]["Views"]["v_estado_pago_actual"]["Row"];
