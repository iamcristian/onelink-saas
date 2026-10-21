import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  Req,
  UseGuards,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response, Request } from 'express';
import { RegisterSchema, LoginSchema, RegisterInput, LoginInput } from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator';

export class RegisterDto implements RegisterInput {
  email!: string;
  password!: string;
  username!: string;
  name?: string;
}

export class LoginDto implements LoginInput {
  email!: string;
  password!: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth 2.0 flow or developer simulation' })
  async googleAuth(@Res() res: Response) {
    const url = await this.authService.getGoogleAuthUrl();
    return res.redirect(url);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Handle Google OAuth 2.0 redirect callback' })
  @ApiQuery({ name: 'code', required: false, type: String })
  @ApiQuery({ name: 'error', required: false, type: String })
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const forwardedHost = (req.headers['x-forwarded-host'] as string) || (req.headers['host'] as string);
    const forwardedProto = (req.headers['x-forwarded-proto'] as string) || 'http';
    const appUrl =
      this.configService.get<string>('APP_URL') ||
      this.configService.get<string>('NEXT_PUBLIC_APP_URL') ||
      (forwardedHost ? `${forwardedProto}://${forwardedHost}` : 'http://localhost:3000');

    if (error || !code) {
      const errorMsg = encodeURIComponent(error || 'Google authentication was cancelled');
      return res.redirect(`${appUrl}/login?error=${errorMsg}`);
    }

    try {
      const result = await this.authService.handleGoogleCallback(code);
      return res.redirect(`${appUrl}/auth/callback?token=${result.accessToken}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to authenticate with Google';
      return res.redirect(`${appUrl}/login?error=${encodeURIComponent(msg)}`);
    }
  }

  @Post('register')
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  @ApiOperation({ summary: 'Register a new creator account and reserve username' })
  @ApiResponse({ status: 201, description: 'User registered successfully with initial profile' })
  @ApiResponse({ status: 409, description: 'Email or username already in use' })
  async register(@Body() dto: RegisterDto) {
    return await this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(LoginSchema))
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 200, description: 'Authentication successful, returns JWT token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account suspended' })
  async login(@Body() dto: LoginDto) {
    return await this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile and subscription' })
  @ApiResponse({ status: 200, description: 'Current user session profile' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return await this.authService.getMe(user.id);
  }
}
