import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient, BgType, BtnStyle, ThreatType, SecurityFlagStatus, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://dev_user:dev_password@localhost:5432/linktree_dev?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const PRESET_THEMES = [
  {
    name: 'Minimal Dark',
    bgType: BgType.SOLID,
    bgValue: '#09090b',
    btnStyle: BtnStyle.FILLED,
    btnColor: '#18181b',
    btnTextColor: '#fafafa',
    fontFamily: 'Inter',
    textColor: '#ffffff',
    isDefault: true,
  },
  {
    name: 'Alpine Snow',
    bgType: BgType.SOLID,
    bgValue: '#f8fafc',
    btnStyle: BtnStyle.FILLED,
    btnColor: '#ffffff',
    btnTextColor: '#0f172a',
    fontFamily: 'Inter',
    textColor: '#0f172a',
    isDefault: false,
  },
  {
    name: 'Sunset Aurora',
    bgType: BgType.GRADIENT,
    bgValue: 'linear-gradient(135deg, #180d24 0%, #2e0854 50%, #4a154b 100%)',
    btnStyle: BtnStyle.FILLED,
    btnColor: '#ffffff',
    btnTextColor: '#1a0933',
    fontFamily: 'Inter',
    textColor: '#ffffff',
    isDefault: false,
  },
  {
    name: 'Forest Emerald',
    bgType: BgType.GRADIENT,
    bgValue: 'linear-gradient(135deg, #022018 0%, #064e3b 100%)',
    btnStyle: BtnStyle.FILLED,
    btnColor: '#ffffff',
    btnTextColor: '#064e3b',
    fontFamily: 'Inter',
    textColor: '#ecfdf5',
    isDefault: false,
  },
  {
    name: 'Midnight Ocean',
    bgType: BgType.GRADIENT,
    bgValue: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)',
    btnStyle: BtnStyle.FILLED,
    btnColor: '#1e293b',
    btnTextColor: '#38bdf8',
    fontFamily: 'Inter',
    textColor: '#f8fafc',
    isDefault: false,
  },
  {
    name: 'Cyberpunk Neon',
    bgType: BgType.GRADIENT,
    bgValue: 'linear-gradient(135deg, #09090b 0%, #020617 100%)',
    btnStyle: BtnStyle.OUTLINE,
    btnColor: '#06b6d4',
    btnTextColor: '#22d3ee',
    fontFamily: 'Space Grotesk',
    textColor: '#f8fafc',
    isDefault: false,
  },
  {
    name: 'Bento Linen',
    bgType: BgType.SOLID,
    bgValue: '#faf8f5',
    btnStyle: BtnStyle.FILLED,
    btnColor: '#1c1917',
    btnTextColor: '#faf8f5',
    fontFamily: 'Inter',
    textColor: '#1c1917',
    isDefault: false,
  },
  {
    name: 'Solar Gold',
    bgType: BgType.SOLID,
    bgValue: '#0c0a09',
    btnStyle: BtnStyle.FILLED,
    btnColor: '#eab308',
    btnTextColor: '#000000',
    fontFamily: 'Space Grotesk',
    textColor: '#fef08a',
    isDefault: false,
  },
];

const DEFAULT_PLANS = [
  {
    code: 'FREE',
    name: 'Free Plan',
    priceCents: 0,
    features: {
      maxLinks: 5,
      removeBranding: false,
      analyticsRetentionDays: 7,
      directMonetizationFeePercent: 10,
      scheduledLinks: false,
      passwordProtection: false,
      ageRestriction: false,
      analyticsExport: false,
      webhooks: false,
    },
  },
  {
    code: 'PRO',
    name: 'Creator Pro',
    priceCents: 200,
    features: {
      maxLinks: 9999,
      removeBranding: true,
      customThemes: true,
      analyticsRetentionDays: 90,
      directMonetizationFeePercent: 0,
      scheduledLinks: true,
      passwordProtection: false,
      ageRestriction: false,
      analyticsExport: false,
      webhooks: false,
    },
  },
  {
    code: 'ENTERPRISE',
    name: 'Enterprise Studio',
    priceCents: 500,
    features: {
      maxLinks: 9999,
      removeBranding: true,
      customThemes: true,
      analyticsRetentionDays: 365,
      directMonetizationFeePercent: 0,
      scheduledLinks: true,
      passwordProtection: true,
      ageRestriction: true,
      analyticsExport: true,
      webhooks: true,
      teamSeats: 5,
    },
  },
];

async function main() {
  console.log('🌱 Seeding preset themes...');

  for (const theme of PRESET_THEMES) {
    const existing = await prisma.theme.findFirst({
      where: { name: theme.name },
    });

    if (!existing) {
      await prisma.theme.create({ data: theme });
      console.log(`  ✓ Created theme: ${theme.name}`);
    } else {
      await prisma.theme.update({
        where: { id: existing.id },
        data: theme,
      });
      console.log(`  ✓ Synchronized theme with calibrated contrast: ${theme.name}`);
    }
  }

  console.log('🌱 Seeding subscription plans...');

  for (const plan of DEFAULT_PLANS) {
    const stripePriceId =
      plan.code === 'PRO'
        ? process.env.STRIPE_PRICE_ID_CREATOR_PRO_MONTHLY || null
        : plan.code === 'ENTERPRISE'
          ? process.env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY || null
          : null;

    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        priceCents: plan.priceCents,
        features: plan.features,
        ...(stripePriceId ? { stripePriceId } : {}),
      },
      create: {
        ...plan,
        stripePriceId,
      },
    });
    console.log(`  ✓ Synchronized plan: ${plan.name} (${plan.code}) [Stripe: ${stripePriceId || 'None'}]`);
  }

  console.log('🌱 Seeding demo platform owner profile (Cristian Arando)...');

  const defaultTheme = await prisma.theme.findFirst({
    where: { isDefault: true },
  });

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'cris@onelink.bio' },
        { email: 'alex@onelink.bio' },
      ],
    },
    include: { profile: { include: { links: true } } },
  });

  if (!existingUser) {
    const user = await prisma.user.create({
      data: {
        email: 'cris@onelink.bio',
        // Password123! hashed with bcrypt (salt 10)
        passwordHash: '$2b$10$hij3KtJtnDeggt4E.ZQohe.rd/TAeQ8yzmBPROKoiMrH1FA5DLbwK',
        name: 'Cristian Arando',
        role: Role.OWNER,
        profile: {
          create: {
            username: 'crisarando',
            title: 'Cristian Arando',
            bio: 'Scaling distributed systems & building clean developer tools.',
            avatarUrl:
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
            themeId: defaultTheme?.id,
            isPublished: true,
            links: {
              create: [
                {
                  title: 'Latest Video: 10M req/sec Under the Hood',
                  url: 'https://youtube.com/watch?v=sysarch',
                  type: 'LINK',
                  position: 0,
                  isActive: true,
                },
                {
                  title: 'Free System Design Architecture Guide',
                  url: 'https://crisarando.gumroad.com/l/sysdesign',
                  type: 'LINK',
                  position: 1,
                  isActive: true,
                },
                {
                  title: 'COURSES & NEWSLETTER',
                  url: '#',
                  type: 'HEADER',
                  position: 2,
                  isActive: true,
                },
                {
                  title: 'Join 15k Engineers on Substack',
                  url: 'https://newsletter.crisarando.dev',
                  type: 'LINK',
                  position: 3,
                  isActive: true,
                },
                {
                  title: 'Support my work (Buy Me a Coffee)',
                  url: 'https://buymeacoffee.com/crisarando',
                  type: 'LINK',
                  position: 4,
                  isActive: true,
                },
              ],
            },
            socialLinks: {
              create: [
                {
                  platform: 'GITHUB',
                  url: 'https://github.com',
                  position: 0,
                  isActive: true,
                },
                {
                  platform: 'YOUTUBE',
                  url: 'https://youtube.com',
                  position: 1,
                  isActive: true,
                },
                {
                  platform: 'TWITTER',
                  url: 'https://x.com',
                  position: 2,
                  isActive: true,
                },
                {
                  platform: 'LINKEDIN',
                  url: 'https://linkedin.com',
                  position: 3,
                  isActive: true,
                },
              ],
            },
          },
        },
      },
    });
    console.log(`  ✓ Created Platform Owner user & profile: @crisarando (${user.email})`);
  } else {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        email: 'cris@onelink.bio',
        name: 'Cristian Arando',
        role: Role.OWNER,
        passwordHash: '$2b$10$hij3KtJtnDeggt4E.ZQohe.rd/TAeQ8yzmBPROKoiMrH1FA5DLbwK',
      },
    });
    if (existingUser.profile) {
      await prisma.profile.update({
        where: { id: existingUser.profile.id },
        data: {
          username: 'crisarando',
          title: 'Cristian Arando',
        },
      });

      for (const l of existingUser.profile.links || []) {
        if (l.url && l.url.includes('alexrivera')) {
          await prisma.link.update({
            where: { id: l.id },
            data: { url: l.url.replace(/alexrivera/g, 'crisarando') },
          });
        }
      }
    }
    console.log(`  ✓ Updated Platform Owner @crisarando (cris@onelink.bio).`);
  }

  // Ensure Cristian Arando Google accounts retain OWNER role
  await prisma.user.updateMany({
    where: {
      OR: [
        { email: 'crisarando10@gmail.com' },
        { email: 'crisarandosyse@gmail.com' },
      ],
    },
    data: { role: Role.OWNER },
  });

  // Seed sample analytics for @crisarando if none exist
  const ownerUser = await prisma.user.findUnique({
    where: { email: 'cris@onelink.bio' },
    include: { profile: true },
  });
  const ownerProfileId = ownerUser?.profile?.id;

  if (ownerProfileId) {
    const existingViews = await prisma.pageView.count({
      where: { profileId: ownerProfileId },
    });

    if (existingViews === 0) {
      console.log('Seeding 30-day analytics telemetry for @crisarando...');
      const profileId = ownerProfileId;
      const profileLinks = await prisma.link.findMany({ where: { profileId } });

    const referrers = [
      'https://www.instagram.com',
      'https://www.tiktok.com',
      'https://youtube.com',
      'https://x.com',
      'https://www.google.com',
      'Direct',
    ];
    const devices = ['mobile', 'mobile', 'mobile', 'desktop', 'desktop', 'tablet'];
    const browsers = ['Chrome', 'Safari', 'Safari', 'Firefox', 'Edge'];
    const oss = ['iOS', 'iOS', 'Android', 'macOS', 'Windows'];

    const pageViewsToInsert = [];
    const clickEventsToInsert = [];

    const now = Date.now();
    for (let day = 29; day >= 0; day--) {
      const dayTimestamp = now - day * 24 * 60 * 60 * 1000;
      const dailyViews = 25 + Math.floor(Math.random() * 35);
      for (let v = 0; v < dailyViews; v++) {
        const offset = Math.floor(Math.random() * 24 * 60 * 60 * 1000);
        const timestamp = new Date(dayTimestamp + offset);
        const ref = referrers[Math.floor(Math.random() * referrers.length)];
        const dev = devices[Math.floor(Math.random() * devices.length)];
        const br = browsers[Math.floor(Math.random() * browsers.length)];
        const os = oss[Math.floor(Math.random() * oss.length)];

        pageViewsToInsert.push({
          profileId,
          timestamp,
          referrer: ref,
          device: dev,
          browser: br,
          os: os,
          country: 'US',
        });

        if (profileLinks.length > 0 && Math.random() < 0.35) {
          const targetLink = profileLinks[Math.floor(Math.random() * profileLinks.length)];
          clickEventsToInsert.push({
            linkId: targetLink.id,
            profileId,
            timestamp: new Date(timestamp.getTime() + 1500),
            referrer: ref,
            device: dev,
            browser: br,
            os: os,
            country: 'US',
          });
        }
      }
    }

    await prisma.pageView.createMany({ data: pageViewsToInsert });
    await prisma.clickEvent.createMany({ data: clickEventsToInsert });
    console.log(`  ✓ Inserted ${pageViewsToInsert.length} page views and ${clickEventsToInsert.length} click events.`);
    }
  }

  // =========================================================================
  // Seed Super Admin Account & Sentinel AI Moderation Queue
  // =========================================================================
  console.log('🛡️ Seeding Super Admin & Sentinel Security Queue...');

  // 1. Super Admin Account
  const adminEmail = 'admin@onelink.bio';
  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    include: { profile: true },
  });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: '$2b$10$hij3KtJtnDeggt4E.ZQohe.rd/TAeQ8yzmBPROKoiMrH1FA5DLbwK',
        name: 'Cris Super Admin',
        role: Role.SUPER_ADMIN,
        profile: {
          create: {
            username: 'admin',
            title: 'Cris Super Admin',
            bio: 'Platform Security & Operations Lead',
            themeId: defaultTheme?.id,
            isPublished: true,
          },
        },
      },
      include: { profile: true },
    });
    console.log(`  ✓ Created Super Admin user & profile: @admin (${adminEmail})`);
  } else if (!adminUser.profile) {
    await prisma.profile.create({
      data: {
        userId: adminUser.id,
        username: 'admin',
        title: 'Cris Super Admin',
        bio: 'Platform Security & Operations Lead',
        themeId: defaultTheme?.id,
        isPublished: true,
      },
    });
    console.log(`  ✓ Created missing profile for Super Admin: @admin (${adminEmail})`);
  }

  // 2. Sample Suspect Creator Users
  const cryptoUserEmail = 'drainer@crypto-scam.xyz';
  let cryptoUser = await prisma.user.findUnique({ where: { email: cryptoUserEmail } });
  if (!cryptoUser) {
    cryptoUser = await prisma.user.create({
      data: {
        email: cryptoUserEmail,
        passwordHash: '$2b$10$hij3KtJtnDeggt4E.ZQohe.rd/TAeQ8yzmBPROKoiMrH1FA5DLbwK',
        name: 'Crypto Free Airdrops',
        role: Role.CREATOR,
        isBanned: true,
        profile: {
          create: {
            username: 'cryptopromos',
            title: 'Claim $10,000 Free Airdrop',
            bio: 'Official crypto giveaway portal.',
            isPublished: false,
          },
        },
      },
    });
  }

  const phishingUserEmail = 'deals@daily-promos.top';
  let phishingUser = await prisma.user.findUnique({ where: { email: phishingUserEmail } });
  if (!phishingUser) {
    phishingUser = await prisma.user.create({
      data: {
        email: phishingUserEmail,
        passwordHash: '$2b$10$hij3KtJtnDeggt4E.ZQohe.rd/TAeQ8yzmBPROKoiMrH1FA5DLbwK',
        name: 'Daily Promo Deals',
        role: Role.CREATOR,
        isBanned: false,
        profile: {
          create: {
            username: 'deals_daily',
            title: 'Deals & Giftcards',
            bio: 'Discount codes and wallet vouchers.',
            isPublished: true,
          },
        },
      },
    });
  }

  // 3. Security Flags
  const existingFlagsCount = await prisma.securityFlag.count();
  if (existingFlagsCount === 0) {
    await prisma.securityFlag.createMany({
      data: [
        {
          userId: cryptoUser.id,
          submittedUrl: 'http://metamask-security-auth.xyz/drain',
          riskScore: 0.94,
          threatType: ThreatType.CRYPTO_DRAINER,
          aiConfidence: 0.984,
          ipAddress: '185.220.101.4',
          status: SecurityFlagStatus.BLOCKED_AUTO,
          resolutionNotes: 'Detected: Punycode Spoofing + Crypto Drainer heuristics',
        },
        {
          userId: phishingUser.id,
          submittedUrl: 'https://paypal-account-verify-login.top/account',
          riskScore: 0.88,
          threatType: ThreatType.PHISHING,
          aiConfidence: 0.912,
          ipAddress: '194.26.29.112',
          status: SecurityFlagStatus.BLOCKED_AUTO,
          resolutionNotes: 'Detected: Brand Keyword Hijack (PayPal)',
        },
        {
          userId: cryptoUser.id,
          submittedUrl: 'http://free-steam-wallet-nitro.ru/gift?id=8271',
          riskScore: 0.92,
          threatType: ThreatType.MALWARE,
          aiConfidence: 0.965,
          ipAddress: '45.142.214.88',
          status: SecurityFlagStatus.PENDING_REVIEW,
          resolutionNotes: 'Detected: Free nitro discord gift credential stealer',
        },
        {
          userId: cryptoUser.id,
          submittedUrl: 'https://binance-airdrop-claim-rewards.cc/connect',
          riskScore: 0.96,
          threatType: ThreatType.CRYPTO_DRAINER,
          aiConfidence: 0.978,
          ipAddress: '103.152.220.14',
          status: SecurityFlagStatus.BANNED,
          resolutionNotes: 'Wallet drainer contract detected',
        },
        {
          userId: phishingUser.id,
          submittedUrl: 'https://suspicious-shortlink-redirection.net/token',
          riskScore: 0.65,
          threatType: ThreatType.SPAM,
          aiConfidence: 0.720,
          ipAddress: '91.240.118.23',
          status: SecurityFlagStatus.RESOLVED_BENIGN,
          resolutionNotes: 'Verified affiliate redirect, unblocked by admin',
        },
      ],
    });
    console.log('  ✓ Seeded 5 high-fidelity SecurityFlag threat queue records.');
  }

  // 4. Global Domain Blocklist
  const existingBlocklistCount = await prisma.domainBlocklist.count();
  if (existingBlocklistCount === 0) {
    await prisma.domainBlocklist.createMany({
      data: [
        {
          domainPattern: '*.xyz',
          reason: 'High concentration of malicious Web3 drainer contracts',
          addedById: adminUser.id,
        },
        {
          domainPattern: '*.top',
          reason: 'Rampant brand credential phishing',
          addedById: adminUser.id,
        },
        {
          domainPattern: '*.ru/gift*',
          reason: 'Nitro gift spam bots and credential stealers',
          addedById: adminUser.id,
        },
        {
          domainPattern: 'drainer-*.cc',
          reason: 'Known crypto wallet drainer templates',
          addedById: adminUser.id,
        },
      ],
    });
    console.log('  ✓ Seeded 4 global domain blocklist patterns.');
  }

  console.log('✅ Seeding completed.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
