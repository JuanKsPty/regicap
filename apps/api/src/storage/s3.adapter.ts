import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';
import { ENV, type Env } from '../config/env';
import type { StorageProvider } from './storage-provider.interface';

/**
 * Adaptador S3 (MinIO en el VPS; intercambiable por Cloudflare R2 o AWS S3).
 *
 * Dos clientes: `interno` (red Docker) para operaciones del servidor y
 * `publico` solo para FIRMAR URLs que consumirá el navegador. Si el
 * almacenamiento se publica bajo un prefijo (`/files` detrás de Traefik), se
 * firma para la ruta que MinIO verá tras quitar el prefijo y se antepone el
 * prefijo a la URL resultante.
 */
@Injectable()
export class S3Adapter implements StorageProvider {
  private readonly interno: S3Client;
  private readonly publico: S3Client;

  constructor(@Inject(ENV) private readonly env: Env) {
    const base = {
      region: env.s3.region,
      forcePathStyle: env.s3.forcePathStyle,
      credentials: { accessKeyId: env.s3.accessKey, secretAccessKey: env.s3.secretKey },
      // Las URLs firmadas se usan desde el navegador: sin checksums automáticos.
      requestChecksumCalculation: 'WHEN_REQUIRED' as const,
      responseChecksumValidation: 'WHEN_REQUIRED' as const,
    };
    this.interno = new S3Client({ ...base, endpoint: env.s3.endpoint });
    this.publico = new S3Client({ ...base, endpoint: env.s3.publicEndpoint });
  }

  private get bucket() {
    return this.env.s3.bucket;
  }

  private conPrefijo(url: string): string {
    const prefijo = this.env.s3.publicPathPrefix;
    if (!prefijo) return url;
    const u = new URL(url);
    u.pathname = `${prefijo.replace(/\/$/, '')}${u.pathname}`;
    return u.toString();
  }

  async urlDeSubida(clave: string, tipo: 'application/pdf', bytes: number): Promise<string> {
    const cmd = new PutObjectCommand({ Bucket: this.bucket, Key: clave, ContentType: tipo, ContentLength: bytes });
    const url = await getSignedUrl(this.publico, cmd, {
      expiresIn: 300,
      signableHeaders: new Set(['content-type', 'content-length']),
    });
    return this.conPrefijo(url);
  }

  async urlDeLectura(clave: string, segundos: number): Promise<string> {
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: clave,
      ResponseContentType: 'application/pdf',
      ResponseContentDisposition: 'inline',
    });
    return this.conPrefijo(await getSignedUrl(this.publico, cmd, { expiresIn: segundos }));
  }

  async eliminar(clave: string): Promise<void> {
    await this.interno.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: clave }));
  }

  async metadatos(clave: string): Promise<{ bytes: number; tipo: string } | null> {
    try {
      const r = await this.interno.send(new HeadObjectCommand({ Bucket: this.bucket, Key: clave }));
      return { bytes: Number(r.ContentLength ?? 0), tipo: r.ContentType ?? '' };
    } catch (e) {
      const nombre = (e as { name?: string; $metadata?: { httpStatusCode?: number } });
      if (nombre.name === 'NotFound' || nombre.$metadata?.httpStatusCode === 404) return null;
      throw e;
    }
  }
}
