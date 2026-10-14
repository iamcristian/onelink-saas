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
