import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as cargarDotenv } from 'dotenv';

// En desarrollo el .env vive en la raíz del monorepo; en Docker las variables
// llegan por el entorno y el archivo no existe.
for (const ruta of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env'), resolve(__dirname, '../../../../.env')]) {
  if (existsSync(ruta)) {
    cargarDotenv({ path: ruta });
    break;
  }
}

const bool = (v: string | undefined, def = false) => (v === undefined || v === '' ? def : ['1', 'true', 'yes'].includes(v.toLowerCase()));
const num = (v: string | undefined, def: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : def);

export interface Env {
  nodeEnv: string;
  apiPort: number;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  cookieSecure: boolean;
  webOrigin: string;
  loginThrottleLimit: number;
  s3: {
    endpoint: string;
    publicEndpoint: string;
    publicPathPrefix: string;
    region: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
    forcePathStyle: boolean;
  };
  ia: {
    provider: 'mock' | 'anthropic';
    anthropicApiKey: string;
    anthropicModel: string;
    mockFallar: boolean;
    timeoutMs: number;
  };
  calificacion: { backoffMs: number; intentos: number };
}

export function cargarEnv(): Env {
  const e = process.env;
  const jwtSecret = e.JWT_SECRET ?? '';
  const nodeEnv = e.NODE_ENV ?? 'development';
  if (!jwtSecret || (nodeEnv === 'production' && jwtSecret.length < 32)) {
    throw new Error('JWT_SECRET no está definido (en producción debe tener al menos 32 caracteres).');
  }
  const provider = (e.IA_PROVIDER ?? 'mock') as Env['ia']['provider'];
  if (provider !== 'mock' && provider !== 'anthropic') throw new Error(`IA_PROVIDER inválido: ${provider}`);
  return {
    nodeEnv,
    apiPort: num(e.API_PORT, 3001),
    databaseUrl: e.DATABASE_URL ?? '',
    redisUrl: e.REDIS_URL ?? 'redis://localhost:6379',
    jwtSecret,
    jwtExpiresIn: e.JWT_EXPIRES_IN ?? '8h',
    cookieSecure: bool(e.COOKIE_SECURE),
    webOrigin: e.WEB_ORIGIN ?? 'http://localhost:3000',
    loginThrottleLimit: num(e.LOGIN_THROTTLE_LIMIT, 10),
    s3: {
      endpoint: e.S3_ENDPOINT ?? 'http://localhost:9000',
      publicEndpoint: e.S3_PUBLIC_ENDPOINT ?? e.S3_ENDPOINT ?? 'http://localhost:9000',
      publicPathPrefix: e.S3_PUBLIC_PATH_PREFIX ?? '',
      region: e.S3_REGION ?? 'us-east-1',
      bucket: e.S3_BUCKET ?? 'regicap',
      accessKey: e.S3_ACCESS_KEY ?? 'regicap',
      secretKey: e.S3_SECRET_KEY ?? 'regicap-secret',
      forcePathStyle: bool(e.S3_FORCE_PATH_STYLE, true),
    },
    ia: {
      provider,
      anthropicApiKey: e.ANTHROPIC_API_KEY ?? '',
      anthropicModel: e.ANTHROPIC_MODEL ?? 'claude-haiku-5-5',
      mockFallar: bool(e.IA_MOCK_FALLAR),
      timeoutMs: 30_000,
    },
    // 5 reintentos con espera exponencial (30 s, 60 s, 120 s…) — Fase 2 §2.3
    calificacion: { backoffMs: num(e.CALIFICACION_BACKOFF_MS, 30_000), intentos: 5 },
  };
}

export const ENV = Symbol('ENV');
