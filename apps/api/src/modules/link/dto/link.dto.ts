import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LinkType } from '@repo/prisma';

export class CreateLinkDto {
  @ApiProperty({ example: 'My YouTube Channel', description: 'Display title of the link' })
  title!: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/@alexrivera', description: 'Destination URL' })
  url?: string;

  @ApiPropertyOptional({ enum: LinkType, default: LinkType.LINK })
  type?: LinkType;

  @ApiPropertyOptional({ example: 'https://cdn.onelink.bio/icons/yt.png' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ default: true })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Scheduled appearance date ISO string' })
  startsAt?: string | null;

  @ApiPropertyOptional({ description: 'Scheduled expiration date ISO string' })
  expiresAt?: string | null;

  @ApiPropertyOptional({ default: false })
  isPasswordProtected?: boolean;

  @ApiPropertyOptional({ description: 'Access PIN or password for gated content' })
  password?: string | null;

  @ApiPropertyOptional({ default: false })
  isAgeRestricted?: boolean;

  @ApiPropertyOptional({ example: 'NEW', description: 'Badge pill text' })
  badge?: string;
}

export class UpdateLinkDto {
  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  url?: string;

  @ApiPropertyOptional({ enum: LinkType })
  type?: LinkType;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Scheduled appearance date ISO string' })
  startsAt?: string | null;

  @ApiPropertyOptional({ description: 'Scheduled expiration date ISO string' })
  expiresAt?: string | null;

  @ApiPropertyOptional()
  isPasswordProtected?: boolean;

  @ApiPropertyOptional()
  password?: string | null;

  @ApiPropertyOptional()
  isAgeRestricted?: boolean;

  @ApiPropertyOptional({ example: 'NEW', description: 'Badge pill text' })
  badge?: string;
}

export class ReorderItemDto {
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  id!: string;

  @ApiProperty({ example: 0 })
  position!: number;
}

export class ReorderLinksDto {
  @ApiProperty({ type: [ReorderItemDto] })
  items!: ReorderItemDto[];
}
