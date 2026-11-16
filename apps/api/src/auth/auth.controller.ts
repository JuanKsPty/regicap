import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  crearAdministradorSchema,
  loginSchema,
  registroSchema,
  type AdministradorDto,
  type CrearAdministradorInput,
  type LoginInput,
  type RegistroInput,
  type UsuarioDto,
} from '@regicap/types';
import type { Response } from 'express';
import { CurrentUser, empresaDe, Public, Roles, type UsuarioAuth } from '../common/decorators';
import { zod } from '../common/zod-validation.pipe';
import { ENV, type Env } from '../config/env';
import { COOKIE_TOKEN } from './auth.guards';
import { AuthService } from './auth.service';

const OCHO_HORAS = 8 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private poner(res: Response, token: string) {
    // Cookie httpOnly + Secure (en producción) + SameSite=Lax: no accesible desde JavaScript.
    res.cookie(COOKIE_TOKEN, token, {
      httpOnly: true,
      secure: this.env.cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: OCHO_HORAS,
    });
  }

  @Public()
  @Post('registro')
  async registro(@Body(zod(registroSchema)) dto: RegistroInput, @Res({ passthrough: true }) res: Response): Promise<UsuarioDto> {
    const { usuario, token } = await this.auth.registrar(dto);
    this.poner(res, token);
    return usuario;
  }

  // Límite de intentos en /auth/login (fuerza bruta)
  @Public()
  @Throttle({ default: { limit: Number(process.env.LOGIN_THROTTLE_LIMIT ?? 10), ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body(zod(loginSchema)) dto: LoginInput, @Res({ passthrough: true }) res: Response): Promise<UsuarioDto> {
    const { usuario, token } = await this.auth.login(dto);
    this.poner(res, token);
    return usuario;
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(COOKIE_TOKEN, { httpOnly: true, secure: this.env.cookieSecure, sameSite: 'lax', path: '/' });
  }

  @Get('me')
  me(@CurrentUser() user: UsuarioAuth): Promise<UsuarioDto> {
    return this.auth.perfil(user.id);
  }
}

/** Gestión de Administradores de la Empresa (cada Empresa solo ve los suyos). */
@Controller('empresa/administradores')
@Roles('EMPRESA')
export class AdministradoresController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  listar(@CurrentUser() user: UsuarioAuth): Promise<AdministradorDto[]> {
    return this.auth.listarAdministradores(empresaDe(user));
  }

  @Post()
  crear(@CurrentUser() user: UsuarioAuth, @Body(zod(crearAdministradorSchema)) dto: CrearAdministradorInput): Promise<AdministradorDto> {
    return this.auth.crearAdministrador(empresaDe(user), dto);
  }

  @HttpCode(204)
  @Delete(':id')
  async eliminar(@CurrentUser() user: UsuarioAuth, @Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.auth.eliminarAdministrador(empresaDe(user), id);
  }
}
