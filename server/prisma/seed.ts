// Seed script - İlk verileri yüklemek için
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Sadece boş tablolarda seed yap
  const roleCount = await prisma.role.count();
  const userCount = await prisma.user.count();

  if (roleCount > 0 || userCount > 0) {
    console.log('⚠️  Veritabanında zaten veri var, seed atlanıyor.');
    return;
  }

  // Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'Süper Yönetici' },
    update: {},
    create: {
      name: 'Süper Yönetici',
      description: 'Tüm sisteme tam erişim',
      permissions: ['VIEW_DASHBOARD', 'MANAGE_COMPANIES', 'MANAGE_ENTITIES', 'MANAGE_PROJECTS', 'MANAGE_TRANSACTIONS', 'MANAGE_ROLES', 'VIEW_REPORTS', 'MANAGE_DOCUMENTS']
    }
  });

  const accRole = await prisma.role.upsert({
    where: { name: 'Muhasebe Müdürü' },
    update: {},
    create: {
      name: 'Muhasebe Müdürü',
      description: 'Finansal işlemler ve raporlar',
      permissions: ['VIEW_DASHBOARD', 'MANAGE_ENTITIES', 'MANAGE_TRANSACTIONS', 'VIEW_REPORTS']
    }
  });

  const pmRole = await prisma.role.upsert({
    where: { name: 'Proje Yöneticisi' },
    update: {},
    create: {
      name: 'Proje Yöneticisi',
      description: 'Sadece proje takibi',
      permissions: ['VIEW_DASHBOARD', 'MANAGE_PROJECTS', 'VIEW_REPORTS']
    }
  });

  // Users
  const hashedPassword = await bcrypt.hash('123', 10);
  
  await prisma.user.upsert({
    where: { email: 'ahmet@sirket.com' },
    update: {},
    create: {
      name: 'Ahmet Yılmaz',
      email: 'ahmet@sirket.com',
      password: hashedPassword,
      title: 'Genel Müdür',
      roleId: adminRole.id,
      avatar: 'https://i.pravatar.cc/150?u=u1'
    }
  });

  await prisma.user.upsert({
    where: { email: 'ayse@sirket.com' },
    update: {},
    create: {
      name: 'Ayşe Demir',
      email: 'ayse@sirket.com',
      password: hashedPassword,
      title: 'Muhasebe Uzmanı',
      roleId: accRole.id,
      avatar: 'https://i.pravatar.cc/150?u=u2'
    }
  });

  await prisma.user.upsert({
    where: { email: 'mehmet@sirket.com' },
    update: {},
    create: {
      name: 'Mehmet Can',
      email: 'mehmet@sirket.com',
      password: hashedPassword,
      title: 'Kıdemli Mühendis',
      roleId: pmRole.id,
      avatar: 'https://i.pravatar.cc/150?u=u3'
    }
  });

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

