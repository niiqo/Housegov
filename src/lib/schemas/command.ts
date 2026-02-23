import { z } from "zod";

export const ActionEnum = z.enum([
  "CREAR_TAREA",
  "COMPLETAR_TAREA",
  "REPORTAR_INCUMPLIMIENTO",
  "PROGRAMAR_EVENTO",
  "AGREGAR_ITEM_COMPRA",
  "MARCAR_ITEM_COMPRADO",
  "CREAR_RECORDATORIO",
  "NO_ACTION",
]);

export const CommandSchema = z
  .object({
    action: ActionEnum,
    house_id: z.string().optional().default("DESCONOCIDO"),
    responsible_user: z.string().optional().default("DESCONOCIDO"),
    sector: z.string().optional().default("DESCONOCIDO"),
    task_type: z.string().optional().default("DESCONOCIDO"),
    description: z.string().optional().default(""),
    metadata: z.unknown().optional().default({}),
  })
  .transform((cmd) => {
    // Normalizamos metadata a objeto para que no rompa executeCommand
    const meta =
      cmd.metadata && typeof cmd.metadata === "object" && !Array.isArray(cmd.metadata)
        ? (cmd.metadata as Record<string, unknown>)
        : {};
    return { ...cmd, metadata: meta };
  });

export type Command = z.infer<typeof CommandSchema>;