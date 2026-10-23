import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  UsePipes,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@repo/prisma';
import {
  CreateCheckoutSessionSchema,
  InviteCollaboratorSchema,
  UpdateTeamMemberRoleSchema,
} from '@repo/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BillingService } from './billing.service';
import {
  CreateCheckoutSessionDto,
  InviteCollaboratorDto,
  UpdateTeamMemberRoleDto,
  InvoiceRecordDto,
} from './dto/billing.dto';

@ApiTags('SaaS Owner Billing & Subscriptions')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get active subscription plans and pricing catalog' })
  @ApiResponse({ status: 200, description: 'Plans catalog returned' })
  async getPlans() {
    return await this.billingService.getPlans();
  }

  @Get('subscription/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user active subscription and limits' })
  @ApiResponse({ status: 200, description: 'User subscription found' })
  async getMySubscription(@CurrentUser() user: AuthenticatedUser) {
    return await this.billingService.getUserSubscription(user.id);
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get SaaS Founder financial KPIs & ARR/MRR metrics' })
  @ApiResponse({ status: 200, description: 'Financial metrics returned' })
  async getFinancialMetrics() {
    return await this.billingService.getFinancialMetrics();
  }

  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ZodValidationPipe(CreateCheckoutSessionSchema))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Checkout Session or execute simulated upgrade' })
  @ApiResponse({ status: 200, description: 'Checkout session URL returned' })
  async createCheckoutSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return await this.billingService.createCheckoutSession(user.id, user.email, dto);
  }

  @Post('create-portal-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Customer Billing Portal session' })
  @ApiResponse({ status: 200, description: 'Portal URL returned' })
  async createPortalSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body('returnUrl') returnUrl?: string,
  ) {
    return await this.billingService.createPortalSession(user.id, returnUrl);
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get official billing invoices and downloadable PDF tax receipts' })
  @ApiResponse({ status: 200, description: 'List of invoices returned' })
  async getInvoices(@CurrentUser() user: AuthenticatedUser): Promise<InvoiceRecordDto[]> {
    return await this.billingService.getInvoices(user.id);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe Webhook event ingestion endpoint' })
  @ApiResponse({ status: 200, description: 'Event acknowledged' })
  async handleWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature?: string,
  ) {
    const rawBody = (req as RawBodyRequest<any>).rawBody ?? req.body;
    return await this.billingService.handleWebhook(rawBody, signature);
  }

  @Post('confirm-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify Stripe checkout session and activate subscription' })
  @ApiResponse({ status: 200, description: 'Subscription activated' })
  async confirmSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body('sessionId') sessionId: string,
  ) {
    return await this.billingService.confirmCheckoutSession(user.id, sessionId);
  }

  @Get('events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get real-time Stripe invoicing & webhook events feed' })
  @ApiResponse({ status: 200, description: 'Events ledger returned' })
  async getEventsLedger() {
    return await this.billingService.getEventsLedger();
  }

  @Get('team')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get team members, seats quota, and collaborator roles' })
  @ApiResponse({ status: 200, description: 'Team list returned' })
  async getTeamMembers(@CurrentUser() user: AuthenticatedUser) {
    return await this.billingService.getTeamMembers(user.id);
  }

  @Post('team/invite')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ZodValidationPipe(InviteCollaboratorSchema))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite a new team collaborator to workspace' })
  @ApiResponse({ status: 201, description: 'Collaborator invited' })
  async inviteTeamMember(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteCollaboratorDto,
  ) {
    return await this.billingService.inviteTeamMember(user.id, dto);
  }

  @Delete('team/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke team collaborator access' })
  @ApiResponse({ status: 200, description: 'Collaborator revoked' })
  async revokeTeamMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') memberId: string,
  ) {
    return await this.billingService.revokeTeamMember(user.id, memberId);
  }

  @Patch('team/:id/role')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ZodValidationPipe(UpdateTeamMemberRoleSchema))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a team collaborator role with hierarchy validation' })
  @ApiResponse({ status: 200, description: 'Collaborator role updated' })
  async updateTeamMemberRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') memberId: string,
    @Body() dto: UpdateTeamMemberRoleDto,
  ) {
    return await this.billingService.updateTeamMemberRole(user.id, memberId, dto.role);
  }

  @Get('collaborations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get workspaces where current user is invited or collaborating' })
  @ApiResponse({ status: 200, description: 'User collaborations returned' })
  async getCollaborations(@CurrentUser() user: AuthenticatedUser) {
    return await this.billingService.getUserCollaborations(user.id);
  }

  @Post('collaborations/accept/:memberId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept invitation to collaborate on an Enterprise workspace' })
  @ApiResponse({ status: 200, description: 'Invitation accepted' })
  async acceptCollaboration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
  ) {
    return await this.billingService.acceptCollaboration(user.id, memberId);
  }

  @Post('collaborations/decline/:memberId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Decline invitation to collaborate on a workspace' })
  @ApiResponse({ status: 200, description: 'Invitation declined' })
  async declineCollaboration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
  ) {
    return await this.billingService.declineCollaboration(user.id, memberId);
  }

  @Post('collaborations/leave/:memberId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Voluntarily leave a collaborated workspace' })
  @ApiResponse({ status: 200, description: 'Workspace left successfully' })
  async leaveCollaboration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
  ) {
    return await this.billingService.leaveCollaboration(user.id, memberId);
  }
}
