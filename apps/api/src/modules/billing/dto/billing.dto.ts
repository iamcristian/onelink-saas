import { CreateCheckoutSessionInput, InviteCollaboratorInput, PlanInterval } from '@repo/shared';

export class CreateCheckoutSessionDto implements CreateCheckoutSessionInput {
  planCode!: string;
  interval!: PlanInterval;
  successUrl?: string;
  cancelUrl?: string;
}

export class InviteCollaboratorDto implements InviteCollaboratorInput {
  email!: string;
  name!: string;
  role!: string;
}

export class UpdateTeamMemberRoleDto {
  role!: string;
}

export class InvoiceRecordDto {
  id!: string;
  number!: string;
  amountCents!: number;
  currency!: string;
  status!: string;
  date!: string;
  hostedInvoiceUrl!: string | null;
  pdfUrl!: string | null;
  planName!: string;
}

