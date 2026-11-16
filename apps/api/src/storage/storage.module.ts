import { Global, Module } from '@nestjs/common';
import { S3Adapter } from './s3.adapter';
import { STORAGE_PROVIDER } from './storage-provider.interface';

/** El adaptador concreto se registra con un token: se cambia por configuración. */
@Global()
@Module({
  providers: [S3Adapter, { provide: STORAGE_PROVIDER, useExisting: S3Adapter }],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
