import { z } from 'zod';

const LoggerSchema = z.object({
  logger: z.string(),
  level: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG']),
  group: z.boolean(),
});

const LoggingUpdateDataSchema = z.object({
  loggers: z.array(LoggerSchema),
});

export const LoggingUpdateSchema = z.object({
  command: z.literal('logging/update'),
  data: LoggingUpdateDataSchema,
});

export type LoggingUpdate = z.infer<typeof LoggingUpdateSchema>;
export type LoggingUpdateData = z.infer<typeof LoggerSchema>;
