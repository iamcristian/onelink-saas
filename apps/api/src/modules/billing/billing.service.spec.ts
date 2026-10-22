import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('BillingService', () => {
  let service: BillingService;

  const mockEmailService = {
    sendTeamInvitation: jest.fn().mockResolvedValue({ messageId: 'msg_123' }),
  };

  const mockPlans = [
    {
      id: 'plan_1',
      code: 'FREE',
      name: 'Free Plan',
      priceCents: 0,
      interval: 'MONTHLY',
      features: { maxLinks: 5 },
      isActive: true,
    },
    {
      id: 'plan_2',
      code: 'PRO',
      name: 'Creator Pro',
      priceCents: 200,
      interval: 'MONTHLY',
      features: { maxLinks: 9999 },
      isActive: true,
    },
    {
      id: 'plan_3',
      code: 'ENTERPRISE',
      name: 'Enterprise Studio',
      priceCents: 500,
      interval: 'MONTHLY',
      features: { maxLinks: 9999, teamSeats: 5 },
      isActive: true,
    },
  ];

  const mockPrisma = {
    plan: {
      findMany: jest.fn().mockResolvedValue(mockPlans),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(mockPlans.find((p) => p.code === where.code) || null);
      }),
    },
    subscription: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'sub_new', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'sub_updated', ...data })),
      upsert: jest.fn().mockResolvedValue({ id: 'sub_upserted' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve({ id: where.id, email: 'collab@onelink.bio', name: 'Collab' });
      }),
    },
    teamMember: {
      findFirst: jest.fn().mockResolvedValue(null),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  const mockConfig = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'NEXT_PUBLIC_APP_URL') return 'http://localhost:3000';
      return null;
    }),
  };

  const cacheStore: Record<string, unknown> = {};
  const mockRedis = {
    get: jest.fn().mockImplementation((key: string) => Promise.resolve(cacheStore[key] || null)),
    set: jest.fn().mockImplementation((key: string, val: unknown) => {
      cacheStore[key] = val;
      return Promise.resolve('OK');
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    for (const key in cacheStore) delete cacheStore[key];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: RedisService, useValue: mockRedis },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPlans', () => {
    it('should return active plans from database', async () => {
      const plans = await service.getPlans();
      expect(plans).toHaveLength(3);
      expect(plans[0]?.code).toBe('FREE');
    });
  });

  describe('getUserSubscription', () => {
    it('should return default free plan subscription when user has none', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValueOnce(null);
      const sub = await service.getUserSubscription('user_123');
      expect(sub).toBeDefined();
      expect(sub.status).toBe('ACTIVE');
      expect(sub.plan.code).toBe('FREE');
    });

    it('should return existing subscription if found and not expired', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValueOnce({
        id: 'sub_pro_123',
        userId: 'user_123',
        planId: 'plan_2',
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 86400000 * 30),
        plan: mockPlans[1],
      });

      const sub = await service.getUserSubscription('user_123');
      expect(sub.id).toBe('sub_pro_123');
      expect(sub.plan.code).toBe('PRO');
    });

    it('should automatically downgrade to FREE plan if paid subscription has expired', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValueOnce({
        id: 'sub_pro_expired',
        userId: 'user_123',
        planId: 'plan_2',
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() - 86400000), // expired yesterday
        plan: mockPlans[1],
      });

      const sub = await service.getUserSubscription('user_123');
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub_pro_expired' },
          data: expect.objectContaining({
            planId: 'plan_1',
            currentPeriodEnd: null,
            status: 'ACTIVE',
          }),
        }),
      );
      expect(sub.plan.code).toBe('FREE');
    });
  });

  describe('getFinancialMetrics', () => {
    it('should return founder financial KPIs', async () => {
      const metrics = await service.getFinancialMetrics();
      expect(metrics.mrr).toBe(18450.0);
      expect(metrics.arr).toBe(221400.0);
      expect(metrics.paidSubscriptions).toBe(1520);
      expect(metrics.netChurn).toBe(0.8);
    });
  });

  describe('createCheckoutSession (Simulation mode)', () => {
    it('should successfully create simulated subscription upgrade', async () => {
      const result = await service.createCheckoutSession('user_123', 'creator@test.com', {
        planCode: 'PRO',
        interval: 'MONTHLY',
      });

      expect(result.simulated).toBe(true);
      expect(result.url).toContain('/studio/billing?success=true&plan=PRO');
      expect(mockPrisma.subscription.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if plan does not exist', async () => {
      await expect(
        service.createCheckoutSession('user_123', 'creator@test.com', {
          planCode: 'NONEXISTENT',
          interval: 'MONTHLY',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createPortalSession (Simulation mode)', () => {
    it('should return simulated portal redirect when Stripe key is not configured', async () => {
      const result = await service.createPortalSession('user_123');
      expect(result.simulated).toBe(true);
      expect(result.url).toContain('portal=simulated');
    });
  });

  describe('handleWebhook', () => {
    it('should process simulated invoice.payment_succeeded event', async () => {
      const payload = {
        id: 'evt_test_123',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            amount_paid: 900,
          },
        },
      };

      const result = await service.handleWebhook(JSON.stringify(payload));
      expect(result.received).toBe(true);
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe('getTeamMembers and inviteTeamMember', () => {
    it('should return default team members and seat allocation', async () => {
      const team = await service.getTeamMembers();
      expect(team.maxSeats).toBe(5);
      expect(team.members.length).toBe(4);
      expect(team.usedSeats).toBe(4);
    });

    it('should invite a new team collaborator within seat limits', async () => {
      const result = await service.inviteTeamMember({
        email: 'dev@onelink.bio',
        name: 'Dev Engineer',
        role: 'Safety Admin',
      });

      expect(result.success).toBe(true);
      expect(result.usedSeats).toBe(5);
      expect(result.member.email).toBe('dev@onelink.bio');
    });

    it('should reject invitation when 5/5 seats are exceeded', async () => {
      // First invite fills the 5th seat
      await service.inviteTeamMember({
        email: 'dev5@onelink.bio',
        name: 'Dev 5',
        role: 'Safety Admin',
      });

      // 6th invite should throw BadRequestException
      await expect(
        service.inviteTeamMember({
          email: 'dev6@onelink.bio',
          name: 'Dev 6',
          role: 'Safety Admin',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should revoke a collaborator and free seat', async () => {
      const revoked = await service.revokeTeamMember('mem_4');
      expect(revoked.usedSeats).toBe(3);
    });

    it('should allow an accepted collaborator to voluntarily leave a workspace', async () => {
      // Setup invite in cache
      await mockRedis.set('billing:user_invites:collab@onelink.bio', [
        { id: 'mem_target', ownerUserId: 'owner_99', role: 'Safety Admin', status: 'Active' },
      ]);

      const result = await service.leaveCollaboration('user_collab', 'mem_target');
      expect(result.success).toBe(true);
      expect(result.message).toContain('left the workspace');

      const remainingInvites = await mockRedis.get('billing:user_invites:collab@onelink.bio');
      expect(remainingInvites).toEqual([]);
    });
  });
});
