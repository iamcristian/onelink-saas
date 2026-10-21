import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialPlatform, BgType, BtnStyle } from '@repo/prisma';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'alexrivera', description: 'Vanity username handle' })
  username?: string;

  @ApiPropertyOptional({ example: 'Alex Rivera ⚡', description: 'Display title of profile' })
  title?: string | null;

  @ApiPropertyOptional({ example: 'Tech & Lifestyle creator', description: 'Creator biography' })
  bio?: string | null;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/...', description: 'Avatar image URL' })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ example: '11111111-1111-1111-1111-111111111111', description: 'Theme preset UUID' })
  themeId?: string | null;

  @ApiPropertyOptional({ example: true, description: 'Whether profile is publicly visible' })
  isPublished?: boolean;

  @ApiPropertyOptional({ example: 'Alex Rivera Links', description: 'Custom page title for SEO' })
  seoTitle?: string | null;

  @ApiPropertyOptional({ example: 'Find all my latest content, videos and tools.', description: 'Meta description' })
  seoDesc?: string | null;
}

export class UpdateCustomThemeDto {
  @ApiProperty({ enum: BgType, default: BgType.SOLID })
  bgType!: BgType;

  @ApiProperty({ example: '#09090b', description: 'Hex color or linear-gradient string' })
  bgValue!: string;

  @ApiProperty({ enum: BtnStyle, default: BtnStyle.FILLED })
  btnStyle!: BtnStyle;

  @ApiProperty({ example: '#27272a', description: 'Button surface color' })
  btnColor!: string;

  @ApiProperty({ example: '#ffffff', description: 'Button text color' })
  btnTextColor!: string;

  @ApiProperty({ example: 'Inter', default: 'Inter' })
  fontFamily!: string;

  @ApiProperty({ example: '#ffffff', default: '#000000' })
  textColor!: string;

  @ApiProperty({ example: 8, default: 8, description: 'Border radius in px' })
  btnRadius!: number;
}

export class CreateSocialLinkDto {
  @ApiProperty({ enum: SocialPlatform })
  platform!: SocialPlatform;

  @ApiProperty({ example: 'https://youtube.com/@alexrivera', description: 'Social platform link or handle' })
  url!: string;

  @ApiPropertyOptional({ example: 0 })
  position?: number;

  @ApiPropertyOptional({ default: true })
  isActive?: boolean;
}

export class UpdateSocialLinkDto {
  @ApiPropertyOptional({ enum: SocialPlatform })
  platform?: SocialPlatform;

  @ApiPropertyOptional({ example: 'https://youtube.com/@alexrivera' })
  url?: string;

  @ApiPropertyOptional()
  position?: number;

  @ApiPropertyOptional()
  isActive?: boolean;
}

export class ReorderSocialItemDto {
  @ApiProperty({ example: '55555555-5555-5555-5555-555555555555' })
  id!: string;

  @ApiProperty({ example: 0 })
  position!: number;
}

export class ReorderSocialLinksDto {
  @ApiProperty({ type: [ReorderSocialItemDto] })
  items!: ReorderSocialItemDto[];
}
