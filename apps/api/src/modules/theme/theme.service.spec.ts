import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ThemeService } from './theme.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let prisma: {
    theme: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  const mockTheme = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Minimal Dark',
    bgType: 'SOLID',
    bgValue: '#09090b',
    btnStyle: 'FILLED',
    btnColor: '#27272a',
    btnTextColor: '#ffffff',
    fontFamily: 'Inter',
    textColor: '#ffffff',
    isDefault: true,
  };

  beforeEach(async () => {
    prisma = {
      theme: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemeService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ThemeService>(ThemeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllThemes', () => {
    it('should return all preset themes ordered by default first', async () => {
      prisma.theme.findMany.mockResolvedValue([mockTheme]);

      const result = await service.getAllThemes();

      expect(prisma.theme.findMany).toHaveBeenCalledWith({
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      });
      expect(result).toEqual([mockTheme]);
    });
  });

  describe('getThemeById', () => {
    it('should return theme when found', async () => {
      prisma.theme.findUnique.mockResolvedValue(mockTheme);

      const result = await service.getThemeById(mockTheme.id);

      expect(prisma.theme.findUnique).toHaveBeenCalledWith({
        where: { id: mockTheme.id },
      });
      expect(result).toEqual(mockTheme);
    });

    it('should throw NotFoundException if theme is not found', async () => {
      prisma.theme.findUnique.mockResolvedValue(null);

      await expect(service.getThemeById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
