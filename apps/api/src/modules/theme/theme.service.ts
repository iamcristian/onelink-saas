import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class ThemeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all preset themes available on the platform, sorted with default first.
   */
  async getAllThemes() {
    return await this.prisma.theme.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Retrieves a specific theme by ID.
   */
  async getThemeById(id: string) {
    const theme = await this.prisma.theme.findUnique({
      where: { id },
    });
    if (!theme) {
      throw new NotFoundException(`Theme with ID ${id} not found`);
    }
    return theme;
  }
}
