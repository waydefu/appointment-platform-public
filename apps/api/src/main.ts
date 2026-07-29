import 'reflect-metadata';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);
export function resolveListenHost(
  environment: NodeJS.ProcessEnv = process.env
): string {
  const host = environment['HOST']?.trim() ?? '127.0.0.1';
  if (host === '') throw new Error('HOST must not be empty.');
  const isLoopback = LOOPBACK_HOSTS.has(host);
  if (environment['ALLOW_UNAUTHENTICATED_ROUTES'] === 'true' && !isLoopback) {
    throw new Error(
      `Refusing to bind unauthenticated routes to non-loopback host "${host}". ` +
        'Unset HOST or unset ALLOW_UNAUTHENTICATED_ROUTES.'
    );
  }
  if (!isLoopback && environment['ALLOW_NON_LOOPBACK_BIND'] !== 'true') {
    throw new Error(
      `Refusing to bind API to non-loopback host "${host}" without ` +
        'ALLOW_NON_LOOPBACK_BIND=true.'
    );
  }
  return host;
}
export async function createApplication(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { logger: false }
  );
  app.setGlobalPrefix('v1');
  return app;
}
async function bootstrap(): Promise<void> {
  const host = resolveListenHost();
  const app = await createApplication();
  await app.listen({
    host,
    port: Number(process.env['PORT'] ?? '3000')
  });
}
const isExecutedAsEntryPoint =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isExecutedAsEntryPoint) {
  void bootstrap();
}
