import { Module } from '@nestjs/common';
import { SuperadminController } from './superadmin.controller';
import { SuperadminRepository } from './superadmin.repository';
import { SuperadminService } from './superadmin.service';

@Module({
  controllers: [SuperadminController],
  providers: [SuperadminService, SuperadminRepository],
})
export class SuperadminModule {}
