import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { cargarEnv } from '../config/env';
import { AdministradoresController, AuthController } from './auth.controller';
import { JwtAuthGuard, RolesGuard } from './auth.guards';
import { AuthService } from './auth.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const env = cargarEnv();
        return { secret: env.jwtSecret, signOptions: { expiresIn: env.jwtExpiresIn as never } };
      },
    }),
  ],
  controllers: [AuthController, AdministradoresController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
