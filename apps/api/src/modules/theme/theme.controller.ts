import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThemeService } from './theme.service';

@ApiTags('Themes')
@Controller('themes')
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @Get()
  @ApiOperation({ summary: 'Get all curated preset themes' })
  @ApiResponse({ status: 200, description: 'List of preset themes' })
  async getAllThemes() {
    return await this.themeService.getAllThemes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get theme details by UUID' })
  @ApiResponse({ status: 200, description: 'Theme details' })
  @ApiResponse({ status: 404, description: 'Theme not found' })
  async getThemeById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.themeService.getThemeById(id);
  }
}
