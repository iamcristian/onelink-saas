import { Global, Module } from '@nestjs/common';
import { ProfileAccessService } from './services/profile-access.service';

@Global()
@Module({
  providers: [ProfileAccessService],
  exports: [ProfileAccessService],
})
export class CommonModule {}
