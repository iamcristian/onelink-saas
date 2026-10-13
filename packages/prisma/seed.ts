import { PrismaClient, BgType, BtnStyle } from '@prisma/client';

const prisma = new PrismaClient();

const PRESET_THEMES = [
  {
    name: 'Minimal Dark',
    bgType: BgType.SOLID,
    bgValue: '#09090b',
    btnStyle: BtnStyle.FILLED,
    btnColor: '#27272a',
    btnTextColor: '#ffffff',
    fontFamily: 'Inter',
    textColor: '#ffffff',
    isDefault: true,
  },
  {
    name: 'Clean Light',
    bgType: BgType.SOLID,
    bgValue: '#fafafa',
    btnStyle: BtnStyle.OUTLINE,
    btnColor: '#18181b',
    btnTextColor: '#18181b',
    fontFamily: 'Inter',
    textColor: '#09090b',
    isDefault: false,
  },
  {
    name: 'Sunset Glow',
    bgType: BgType.GRADIENT,
    bgValue: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
    btnStyle: BtnStyle.ROUNDED,
    btnColor: 'rgba(255, 255, 255, 0.2)',
    btnTextColor: '#ffffff',
    fontFamily: 'Inter',
    textColor: '#ffffff',
    isDefault: false,
  },
  {
    name: 'Midnight Ocean',
    bgType: BgType.GRADIENT,
    bgValue: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
    btnStyle: BtnStyle.SHADOW,
    btnColor: '#3b82f6',
    btnTextColor: '#ffffff',
    fontFamily: 'Inter',
    textColor: '#ffffff',
    isDefault: false,
  },
  {
    name: 'Forest Emerald',
    bgType: BgType.SOLID,
    bgValue: '#064e3b',
    btnStyle: BtnStyle.FILLED,
    btnColor: '#047857',
    btnTextColor: '#ecfdf5',
    fontFamily: 'Inter',
    textColor: '#ecfdf5',
    isDefault: false,
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
      console.log(`  - Theme already exists: ${theme.name}`);
    }
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
