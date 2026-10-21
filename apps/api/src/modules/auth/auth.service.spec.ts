import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

describe('AuthService (Authentication & Slug Reservation)', () => {
  let service: AuthService;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    profile: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    theme: {
      findFirst: jest.Mock;
    };
    plan: {
      findUnique: jest.Mock;
    };
    subscription: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };
  let configService: {
    get: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      profile: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      theme: {
        findFirst: jest.fn().mockResolvedValue({ id: 'theme-1' }),
      },
      plan: {
        findUnique: jest.fn().mockResolvedValue({ id: 'plan-free', code: 'FREE' }),
      },
      subscription: {
        create: jest.fn().mockResolvedValue({ id: 'sub-1' }),
      },
      $transaction: jest.fn(async (cb) => {
        return cb(prismaService);
      }),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return undefined;
        if (key === 'GOOGLE_CALLBACK_URL') return 'http://localhost:3001/api/auth/google/callback';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should successfully register new user, hash password, and create profile', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.profile.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'alex@onelink.bio',
        name: 'Alex Rivera',
        role: 'CREATOR',
      });
      prismaService.profile.create.mockResolvedValue({
        id: 'profile-1',
        username: 'alexrivera',
      });

      const result = await service.register({
        email: 'alex@onelink.bio',
        password: 'Password123!',
        username: 'alexrivera',
        name: 'Alex Rivera',
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('alex@onelink.bio');
      expect(result.user.profile.username).toBe('alexrivera');
      expect(jwtService.signAsync).toHaveBeenCalled();
    });

    it('should reject registration if email is already taken', async () => {
      prismaService.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'alex@onelink.bio',
          password: 'Password123!',
          username: 'alexrivera',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject registration if username slug is already reserved', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.profile.findUnique.mockResolvedValue({ id: 'existing-profile' });

      await expect(
        service.register({
          email: 'alex@onelink.bio',
          password: 'Password123!',
          username: 'alexrivera',
        }),
      ).rejects.toThrow('This username is already taken');
    });
  });

  describe('login', () => {
    it('should login valid user and return JWT', async () => {
      const passwordHash = await bcrypt.hash('Secret123!', 10);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'alex@onelink.bio',
        passwordHash,
        role: 'CREATOR',
        isBanned: false,
        profile: { id: 'prof-1', username: 'alex' },
      });

      const result = await service.login({
        email: 'alex@onelink.bio',
        password: 'Secret123!',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('alex@onelink.bio');
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      const passwordHash = await bcrypt.hash('Secret123!', 10);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'alex@onelink.bio',
        passwordHash,
        isBanned: false,
      });

      await expect(
        service.login({
          email: 'alex@onelink.bio',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException if account is banned', async () => {
      const passwordHash = await bcrypt.hash('Secret123!', 10);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'banned@onelink.bio',
        passwordHash,
        isBanned: true,
      });

      await expect(
        service.login({
          email: 'banned@onelink.bio',
          password: 'Secret123!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Google OAuth 2.0 Integration', () => {
    describe('getGoogleAuthUrl', () => {
      it('should return simulated mock URL when GOOGLE_CLIENT_ID is not configured', async () => {
        configService.get.mockReturnValue(undefined);

        const url = await service.getGoogleAuthUrl();
        expect(url).toContain('mock_google_dev_code_');
        expect(url).toContain('/api/auth/google/callback');
      });

      it('should return real Google OAuth URL when GOOGLE_CLIENT_ID is configured', async () => {
        configService.get.mockImplementation((key: string) => {
          if (key === 'GOOGLE_CLIENT_ID') return 'gcp-client-id-123.apps.googleusercontent.com';
          if (key === 'GOOGLE_CALLBACK_URL') return 'http://localhost:3001/api/auth/google/callback';
          return undefined;
        });

        const url = await service.getGoogleAuthUrl();
        expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
        expect(url).toContain('client_id=gcp-client-id-123.apps.googleusercontent.com');
        expect(url).toContain('response_type=code');
      });
    });

    describe('validateGoogleUser', () => {
      it('should log in existing user if matching googleId is found', async () => {
        prismaService.user.findUnique.mockResolvedValue({
          id: 'google-user-1',
          email: 'google.creator@gmail.com',
          googleId: 'g-109283',
          role: 'CREATOR',
          isBanned: false,
          profile: { id: 'prof-g1', username: 'gcreator' },
        });

        const result = await service.validateGoogleUser({
          googleId: 'g-109283',
          email: 'google.creator@gmail.com',
          name: 'Google Creator',
        });

        expect(result.accessToken).toBe('mock-jwt-token');
        expect(result.user.email).toBe('google.creator@gmail.com');
        expect(result.user.profile?.username).toBe('gcreator');
      });

      it('should link googleId to existing user with matching email address', async () => {
        // First findUnique by googleId returns null
        prismaService.user.findUnique
          .mockResolvedValueOnce(null)
          // Second findUnique by email returns existing user
          .mockResolvedValueOnce({
            id: 'existing-email-user',
            email: 'existing@domain.com',
            role: 'CREATOR',
            isBanned: false,
            profile: { id: 'prof-e1', username: 'existinguser' },
          });

        prismaService.user.update.mockResolvedValue({
          id: 'existing-email-user',
          email: 'existing@domain.com',
          googleId: 'g-444555',
          role: 'CREATOR',
          isBanned: false,
          profile: { id: 'prof-e1', username: 'existinguser' },
        });

        const result = await service.validateGoogleUser({
          googleId: 'g-444555',
          email: 'existing@domain.com',
          name: 'Existing User',
        });

        expect(prismaService.user.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'existing-email-user' },
            data: { googleId: 'g-444555' },
          }),
        );
        expect(result.accessToken).toBe('mock-jwt-token');
      });

      it('should throw ForbiddenException if user account is banned', async () => {
        prismaService.user.findUnique.mockResolvedValue({
          id: 'banned-google-user',
          email: 'banned@gmail.com',
          googleId: 'g-banned',
          isBanned: true,
        });

        await expect(
          service.validateGoogleUser({
            googleId: 'g-banned',
            email: 'banned@gmail.com',
          }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should auto-provision a new user with unique username, theme, and FREE plan', async () => {
        // googleId not found
        prismaService.user.findUnique.mockResolvedValueOnce(null);
        // email not found
        prismaService.user.findUnique.mockResolvedValueOnce(null);
        // username check: not taken
        prismaService.profile.findUnique.mockResolvedValueOnce(null);

        prismaService.user.create.mockResolvedValue({
          id: 'new-guser',
          email: 'newuser@gmail.com',
          name: 'New User',
          role: 'CREATOR',
          googleId: 'g-999',
        });

        prismaService.profile.create.mockResolvedValue({
          id: 'new-gprof',
          username: 'newuser',
        });

        const result = await service.validateGoogleUser({
          googleId: 'g-999',
          email: 'newuser@gmail.com',
          name: 'New User',
          avatarUrl: 'https://avatar.url',
        });

        expect(result.accessToken).toBe('mock-jwt-token');
        expect(result.user.email).toBe('newuser@gmail.com');
        expect(prismaService.$transaction).toHaveBeenCalled();
      });
    });
  });
});
