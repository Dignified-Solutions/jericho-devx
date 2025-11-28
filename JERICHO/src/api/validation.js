import { z } from 'zod';

export const goalSchema = z
  .object({
    text: z.string().trim().optional(),
    goal: z.string().trim().optional(),
    goalText: z.string().trim().optional()
  })
  .refine((data) => Boolean(data.text || data.goal || data.goalText), {
    message: 'Goal text is required.'
  })
  .transform((data) => {
    const text = data.text || data.goal || data.goalText;
    return { text };
  });

export const identitySchema = z
  .object({
    domain: z.string().trim().min(1, 'domain is required'),
    capability: z.string().trim().min(1, 'capability is required'),
    level: z
      .union([z.string(), z.number()])
      .transform((value) => Number(value))
      .refine(Number.isFinite, 'level must be a number')
  })
  .strict();

export const identityPatchSchema = z
  .object({
    updates: z
      .record(
        z
          .union([z.string(), z.number()])
          .transform((value) => Number(value))
          .refine(Number.isFinite, 'level must be a number')
      )
      .refine((value) => Object.keys(value || {}).length > 0, 'updates cannot be empty')
  })
  .strict();

export const taskRecordSchema = z
  .object({
    id: z.string().trim().min(1, 'id is required'),
    status: z.string().trim().min(1, 'status is required')
  })
  .strict();

export const taskStatusSchema = z
  .object({
    taskId: z.string().trim().min(1, 'taskId is required'),
    status: z.enum(['completed', 'missed'])
  })
  .strict();
