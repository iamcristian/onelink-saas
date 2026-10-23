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

export type CollaboratorPermissionLevel = 'VIEWER' | 'EDITOR' | 'ADMIN' | 'OWNER';

const ROLE_WEIGHT: Record<string, number> = {
  'Viewer': 1,
  'Viewer / Auditor': 1,
  'Content Editor': 2,
  'Safety Admin': 3,
  'Admin': 3,
  'Platform Owner': 4,
};

const REQUIRED_WEIGHT: Record<CollaboratorPermissionLevel, number> = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

@Injectable()
export class ProfileAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Verifies that the requesting user owns the targeted profile or is an authorized collaborator or admin.
   * Enforces role weights: VIEWER (read-only), EDITOR (modify links/themes), ADMIN/OWNER (full access).
   */
  async verifyProfileAccess(
    profileId: string,
    userId: string,
    role?: string,
    requiredLevel: CollaboratorPermissionLevel = 'EDITOR',
  ): Promise<VerifiedProfile> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true, userId: true, username: true },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${profileId} not found`);
    }

    // 1. Super Admins and Platform Owners have global administrative access
    if (role === 'SUPER_ADMIN' || role === 'OWNER') {
      return profile;
    }

    // 2. Direct workspace owner has full access
    if (profile.userId === userId) {
      return profile;
    }

    // 3. Team collaborator check
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, isBanned: true },
    });

    if (!user?.email || user.isBanned) {
      throw new ForbiddenException('You do not have permission to manage this profile');
    }

    const email = user.email.toLowerCase().trim();

    // Check PostgreSQL team_members table
    const teamMember = await this.prisma.teamMember.findFirst({
      where: {
        ownerId: profile.userId,
        email,
        status: 'Active',
      },
    });

    if (teamMember) {
      const memberWeight = ROLE_WEIGHT[teamMember.role] ?? 1;
      if (memberWeight < REQUIRED_WEIGHT[requiredLevel]) {
        throw new ForbiddenException(
          `Your collaborator role (${teamMember.role}) does not have permission for this operation.`,
        );
      }
      return profile;
    }

    // Check Redis cache fallback for active sessions
    const ownerTeamKey = `billing:team_members:${profile.userId}`;
    const cachedMembers = await this.redis.get<any[]>(ownerTeamKey);
    const cachedMember = cachedMembers?.find(
      (m) =>
        m.email?.toLowerCase().trim() === email &&
        (m.status === 'Active' || m.status === 'Active Collaborator'),
    );

    if (cachedMember) {
      const memberRole = cachedMember.role || 'Viewer';
      const memberWeight = ROLE_WEIGHT[memberRole] ?? 1;
      if (memberWeight < REQUIRED_WEIGHT[requiredLevel]) {
        throw new ForbiddenException(
          `Your collaborator role (${memberRole}) does not have permission for this operation.`,
        );
      }
      return profile;
    }

    throw new ForbiddenException('You do not have permission to manage this profile');
  }
}
