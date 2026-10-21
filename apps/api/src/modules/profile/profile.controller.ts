import {
  Controller,
  Get,
  Patch,
  Put,
  Delete,
  Post,
  Param,
  Body,
  UseGuards,
  UsePipes,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  UpdateProfileSchema,
  UpdateCustomThemeSchema,
  CreateSocialLinkSchema,
  UpdateSocialLinkSchema,
  ReorderSocialLinksSchema,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ProfileService } from './profile.service';
import {
  UpdateProfileDto,
  UpdateCustomThemeDto,
  CreateSocialLinkDto,
  UpdateSocialLinkDto,
  ReorderSocialLinksDto,
} from './dto/profile.dto';

@ApiTags('Profiles & Themes')
@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated creator profile with all links' })
  @ApiResponse({ status: 200, description: 'Profile found' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return await this.profileService.getProfileByUserId(user.id);
  }

  @Get('check-username/:username')
  @ApiOperation({ summary: 'Check if a vanity username handle is valid and available' })
  @ApiResponse({ status: 200, description: 'Availability status' })
  async checkUsername(@Param('username') username: string) {
    return await this.profileService.checkUsernameAvailability(username);
  }

  @Get(':username')
  @ApiOperation({
    summary: 'Public Profile Hot Path: Resolves creator page by vanity username (Redis cached)',
  })
  @ApiResponse({ status: 200, description: 'Public profile payload returned' })
  @ApiResponse({ status: 404, description: 'Profile not found or unpublished' })
  async getPublicProfile(@Param('username') username: string) {
    return await this.profileService.getPublicProfile(username);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ZodValidationPipe(UpdateProfileSchema))
  @ApiOperation({ summary: 'Update profile details (bio, title, themeId, SEO)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.profileService.updateProfile(id, user.id, dto, user.role);
  }

  @Put(':id/custom-theme')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ZodValidationPipe(UpdateCustomThemeSchema))
  @ApiOperation({ summary: 'Upsert custom theme CSS tokens for creator profile' })
  @ApiResponse({ status: 200, description: 'Custom theme configured' })
  async upsertCustomTheme(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomThemeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.profileService.upsertCustomTheme(id, user.id, dto, user.role);
  }

  @Delete(':id/custom-theme')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove custom theme and revert to preset theme' })
  @ApiResponse({ status: 200, description: 'Custom theme removed' })
  async deleteCustomTheme(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.profileService.deleteCustomTheme(id, user.id, user.role);
  }

  // ==========================================================================
  // Social Links Sub-resource Endpoints
  // ==========================================================================

  @Get(':profileId/social-links')
  @ApiOperation({ summary: 'Get all social links for a profile' })
  async getSocialLinks(@Param('profileId', ParseUUIDPipe) profileId: string) {
    return await this.profileService.getSocialLinks(profileId);
  }

  @Post(':profileId/social-links')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ZodValidationPipe(CreateSocialLinkSchema))
  @ApiOperation({ summary: 'Add a new social link icon' })
  @ApiResponse({ status: 201, description: 'Social link created' })
  async createSocialLink(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: CreateSocialLinkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.profileService.createSocialLink(profileId, user.id, dto, user.role);
  }

  @Patch(':profileId/social-links/:linkId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ZodValidationPipe(UpdateSocialLinkSchema))
  @ApiOperation({ summary: 'Update a social link' })
  @ApiResponse({ status: 200, description: 'Social link updated' })
  async updateSocialLink(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Body() dto: UpdateSocialLinkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.profileService.updateSocialLink(linkId, profileId, user.id, dto, user.role);
  }

  @Delete(':profileId/social-links/:linkId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a social link' })
  @ApiResponse({ status: 200, description: 'Social link deleted' })
  async deleteSocialLink(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.profileService.deleteSocialLink(linkId, profileId, user.id, user.role);
  }

  @Put(':profileId/social-links/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ZodValidationPipe(ReorderSocialLinksSchema))
  @ApiOperation({ summary: 'Atomically reorder social links' })
  @ApiResponse({ status: 200, description: 'Social links reordered' })
  async reorderSocialLinks(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: ReorderSocialLinksDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.profileService.reorderSocialLinks(profileId, dto.items, user.id, user.role);
  }
}
