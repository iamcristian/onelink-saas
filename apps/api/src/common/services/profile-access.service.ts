import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

export interface VerifiedProfile {
  id: string;
  userId: string;
  username: string;
}

@Injectable()
export class ProfileAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Verifies that the requesting user owns the targeted profile or is an authorized collaborator or admin.
   */
  async verifyProfileAccess(
    profileId: string,
    userId: string,
    role?: string,
  ): Promise<VerifiedProfile> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true, userId: true, username: true },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${profileId} not found`);
    }

    // 1. Super Admins and Platform Owners have global access
    if (role === 'SUPER_ADMIN' || role === 'OWNER') {
      return profile;
    }

    // 2. Direct workspace owner
    if (profile.userId === userId) {
      return profile;
    }

    // 3. Team collaborator check
    if (this.prisma.user?.findUnique) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (user?.email) {
        const email = user.email.toLowerCase().trim();

        // Check PostgreSQL team_members table
        if (this.prisma.teamMember?.findFirst) {
          const teamMember = await this.prisma.teamMember.findFirst({
            where: {
              ownerId: profile.userId,
              email,
              status: 'Active',
            },
          });

          if (teamMember) {
            return profile;
          }
        }

        // Check Redis cache fallback for active sessions
        if (this.redis?.get) {
          const ownerTeamKey = `billing:team_members:${profile.userId}`;
          const cachedMembers = await this.redis.get<any[]>(ownerTeamKey);
          const isCachedMember = cachedMembers?.some(
            (m) =>
              m.email?.toLowerCase().trim() === email &&
              (m.status === 'Active' || m.status === 'Active Collaborator'),
          );

          if (isCachedMember) {
            return profile;
          }
        }
      }
    }

    throw new ForbiddenException('You do not have permission to manage this profile');
  }
}
