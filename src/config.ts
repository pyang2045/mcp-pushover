import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load .env file if it exists
dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PUSHOVER_DEFAULT_TOKEN: z.string().optional(),
  PUSHOVER_DEFAULT_USER: z.string().optional(),
  RETRY_MAX_ATTEMPTS: z.coerce.number().min(1).default(3),
  RETRY_INITIAL_DELAY: z.coerce.number().min(100).default(1000),
});

export const config = configSchema.parse(process.env);