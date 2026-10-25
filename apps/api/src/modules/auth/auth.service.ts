import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { RegisterInput, LoginInput } from '@repo/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Registers a new user, hashes password, reserves username slug,
   * creates the creator profile, and returns JWT session token.
   */
  async register(input: RegisterInput) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });
    if (existingEmail) {
      throw new ConflictException('An account with this email already exists');
    }

    const cleanUsername = input.username.toLowerCase().trim();
    const existingUsername = await this.prisma.profile.findUnique({
      where: { username: cleanUsername },
    });
    if (existingUsername) {
      throw new ConflictException('This username is already taken');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    // Find default theme or fall back to first theme
    const defaultTheme = await this.prisma.theme.findFirst({
      where: { isDefault: true },
    }) || await this.prisma.theme.findFirst();

    // Atomic transaction: create User + Profile
    const { user, profile } = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: input.email.toLowerCase().trim(),
          passwordHash,
          name: input.name || cleanUsername,
        },
      });

      const newProfile = await tx.profile.create({
        data: {
          userId: newUser.id,
          username: cleanUsername,
          title: input.name || cleanUsername,
          bio: 'Welcome to my OneLink page!',
          themeId: defaultTheme?.id,
          isPublished: true,
        },
      });

      return { user: newUser, profile: newProfile };
    });

    const accessToken = await this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: {
          id: profile.id,
          username: profile.username,
        },
      },
      accessToken,
    };
  }

  /**
   * Validates user credentials, checks ban status, and returns JWT token.
   */
  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
      include: { profile: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isBanned) {
      throw new ForbiddenException(
        'This account has been suspended by OneLink Trust & Safety',
      );
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: user.profile
          ? {
              id: user.profile.id,
              username: user.profile.username,
            }
          : null,
      },
      accessToken,
    };
  }

  /**
   * Fetches profile and subscription information for the current user.
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBanned: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            username: true,
            title: true,
            bio: true,
            avatarUrl: true,
            isPublished: true,
            themeId: true,
          },
        },
        subscriptions: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            status: true,
            currentPeriodEnd: true,
            plan: {
              select: {
                id: true,
                code: true,
                name: true,
                priceCents: true,
                interval: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Auto-downgrade check: if paid subscription has passed currentPeriodEnd, downgrade to FREE
    if (user.subscriptions && user.subscriptions.length > 0) {
      const activeSub = user.subscriptions[0];
      if (
        activeSub &&
        activeSub.plan?.code !== 'FREE' &&
        activeSub.currentPeriodEnd &&
        new Date(activeSub.currentPeriodEnd).getTime() < Date.now()
      ) {
        const freePlan = await this.prisma.plan.findUnique({
          where: { code: 'FREE' },
        });

        if (freePlan) {
          await this.prisma.subscription.update({
            where: { id: activeSub.id },
            data: {
              planId: freePlan.id,
              currentPeriodEnd: null,
              status: 'ACTIVE',
            },
          });

          activeSub.plan = {
            id: freePlan.id,
            code: freePlan.code,
            name: freePlan.name,
            priceCents: freePlan.priceCents,
            interval: freePlan.interval,
          };
          activeSub.currentPeriodEnd = null;
        }
      }
    }

    if (!user.profile) {
      const defaultTheme =
        (await this.prisma.theme.findFirst({ where: { isDefault: true } })) ||
        (await this.prisma.theme.findFirst());
      const baseUsername =
        user.name
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 20) ||
        user.email.split('@')[0].replace(/[^a-z0-9]/g, '') ||
        'user';
      let candidate = baseUsername;
      const existing = await this.prisma.profile.findUnique({
        where: { username: candidate },
      });
      if (existing) {
        candidate = `${candidate}${Math.floor(100 + Math.random() * 900)}`;
      }

      const created = await this.prisma.profile.create({
        data: {
          userId: user.id,
          username: candidate,
          title: user.name || 'Creator',
          bio:
            user.role === 'SUPER_ADMIN'
              ? 'Platform Security & Operations Lead'
              : 'Welcome to my OneLink bio',
          themeId: defaultTheme?.id,
          isPublished: true,
        },
        select: {
          id: true,
          username: true,
          title: true,
          bio: true,
          avatarUrl: true,
          isPublished: true,
          themeId: true,
        },
      });
      user.profile = created;
    }

    return user;
  }

  /**
   * Generates the Google OAuth 2.0 redirection URL.
   * If Google Cloud credentials are not configured, falls back to a developer simulation link.
   */
  async getGoogleAuthUrl(): Promise<string> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const callbackUrl =
      this.configService.get<string>('GOOGLE_CALLBACK_URL') ||
      'http://localhost:3001/api/auth/google/callback';

    if (!clientId || clientId.trim().length === 0) {
      this.logger.log('Google Client ID not configured. Using automated developer simulation mode.');
      return `${callbackUrl}?code=mock_google_dev_code_${Date.now()}`;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid profile email',
      access_type: 'offline',
      prompt: 'select_account',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for Google profile and authenticates user.
   */
  async handleGoogleCallback(code: string, state?: string) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackUrl =
      this.configService.get<string>('GOOGLE_CALLBACK_URL') ||
      'http://localhost:3001/api/auth/google/callback';
    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';

    // 1. Automated Simulation Flow (strictly restricted to development)
    if (isDev && (code.startsWith('mock_google_dev_code_') || !clientId || !clientSecret)) {
      this.logger.log('Processing Google authentication via dev simulation.');
      return await this.validateGoogleUser({
        googleId: 'google_dev_user_1092837465',
        email: 'alex.rivera@google.com',
        name: 'Alex Rivera (Google)',
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      });
    }

    if (!clientId || !clientSecret) {
      throw new UnauthorizedException('Google OAuth credentials not configured on server.');
    }

    // 2. Real Google OAuth Token Exchange
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUrl,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        this.logger.error(`Failed to exchange Google OAuth code: ${err}`);
        throw new UnauthorizedException('Google OAuth authentication failed');
      }

      const tokenData = (await tokenRes.json()) as { access_token: string };
      const googleAccessToken = tokenData.access_token;

      // Fetch user profile from Google UserInfo endpoint
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });

      if (!userRes.ok) {
        throw new UnauthorizedException('Failed to fetch user information from Google');
      }

      const googleUser = (await userRes.json()) as {
        sub: string;
        email: string;
        name?: string;
        picture?: string;
      };

      return await this.validateGoogleUser({
        googleId: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
      });
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException || err instanceof ForbiddenException) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Google authentication error: ${msg}`);
      throw new UnauthorizedException('Failed to authenticate with Google');
    }
  }

  /**
   * Validates or provisions a user from verified Google credentials.
   */
  async validateGoogleUser(profile: {
    googleId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  }) {
    const cleanEmail = profile.email.toLowerCase().trim();

    // 1. Check if user already exists by googleId
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
      include: { profile: true },
    });

    if (user) {
      if (user.isBanned) {
        throw new ForbiddenException(
          'This account has been suspended by OneLink Trust & Safety',
        );
      }
      const accessToken = await this.generateToken(user.id, user.email, user.role);
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          profile: user.profile
            ? {
                id: user.profile.id,
                username: user.profile.username,
              }
            : null,
        },
        accessToken,
      };
    }

    // 2. Check if user exists by email (link Google account to existing user)
    user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { profile: true },
    });

    if (user) {
      if (user.isBanned) {
        throw new ForbiddenException(
          'This account has been suspended by OneLink Trust & Safety',
        );
      }
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId },
        include: { profile: true },
      });
      const accessToken = await this.generateToken(user.id, user.email, user.role);
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          profile: user.profile
            ? {
                id: user.profile.id,
                username: user.profile.username,
              }
            : null,
        },
        accessToken,
      };
    }

    // 3. New user registration via Google OAuth
    let baseUsername = (profile.name || cleanEmail.split('@')[0] || 'creator')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .substring(0, 20);

    if (baseUsername.length < 3) baseUsername = 'creator';

    let candidateUsername = baseUsername;
    let counter = 1;
    while (await this.prisma.profile.findUnique({ where: { username: candidateUsername } })) {
      candidateUsername = `${baseUsername}${counter}`;
      counter++;
    }

    const defaultTheme =
      (await this.prisma.theme.findFirst({ where: { isDefault: true } })) ||
      (await this.prisma.theme.findFirst());

    const freePlan = await this.prisma.plan.findUnique({ where: { code: 'FREE' } });
    const enterprisePlan = await this.prisma.plan.findUnique({ where: { code: 'ENTERPRISE' } });

    const { newUser, newProfile } = await this.prisma.$transaction(async (tx) => {
      const isFounder =
        cleanEmail === 'cris@onelink.bio' ||
        cleanEmail === 'crisarando10@gmail.com' ||
        cleanEmail === 'crisarandosyse@gmail.com';

      const createdUser = await tx.user.create({
        data: {
          email: cleanEmail,
          name: profile.name || candidateUsername,
          googleId: profile.googleId,
          role: isFounder ? 'OWNER' : 'CREATOR',
        },
      });

      const createdProfile = await tx.profile.create({
        data: {
          userId: createdUser.id,
          username: candidateUsername,
          title: profile.name || candidateUsername,
          bio: 'Welcome to my OneLink page!',
          avatarUrl:
            profile.avatarUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          themeId: defaultTheme?.id,
          isPublished: true,
        },
      });

      const assignedPlan = isFounder && enterprisePlan ? enterprisePlan : freePlan;
      if (assignedPlan) {
        await tx.subscription.create({
          data: {
            userId: createdUser.id,
            planId: assignedPlan.id,
            status: 'ACTIVE',
          },
        });
      }

      return { newUser: createdUser, newProfile: createdProfile };
    });

    const accessToken = await this.generateToken(newUser.id, newUser.email, newUser.role);
    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        profile: {
          id: newProfile.id,
          username: newProfile.username,
        },
      },
      accessToken,
    };
  }

  private async generateToken(userId: string, email: string, role: string): Promise<string> {
    return await this.jwtService.signAsync({
      sub: userId,
      email,
      role,
    });
  }
}

