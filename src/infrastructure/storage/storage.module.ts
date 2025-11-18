import { Module } from '@nestjs/common';
import { FileSystemStorageService } from './file-system-storage.service';
import { STORAGE_TOKEN } from './storage.interface';

@Module({
  providers: [
    {
      provide: STORAGE_TOKEN,
      useClass: FileSystemStorageService,
    },
    FileSystemStorageService,
  ],
  exports: [STORAGE_TOKEN],
})
export class StorageModule {}

