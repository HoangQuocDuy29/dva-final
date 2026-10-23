import bcrypt from 'bcrypt';
import { prisma, bootstrapSuperAdminAndUsers, ensurePostgreSQLSeeded } from '../lib/prisma';

const SUPERADMIN_EMAIL = 'quocduyhoang42@gmail.com';
const SUPERADMIN_PASSWORD = 'dva@2025';
const SALT_ROUNDS = 10;

async function main() {
  console.log('🔐 Starting bcrypt password re-hash & PostgreSQL User update...');

  // 1. Explicitly hash SUPERADMIN password with bcrypt and upsert into PostgreSQL User table
  const superAdminHash = await bcrypt.hash(SUPERADMIN_PASSWORD, SALT_ROUNDS);

  const superAdmin = await prisma.user.upsert({
    where: { email: SUPERADMIN_EMAIL },
    update: {
      passwordHash: superAdminHash,
      role: 'SUPERADMIN',
    },
    create: {
      id: 'user-superadmin',
      email: SUPERADMIN_EMAIL,
      passwordHash: superAdminHash,
      fullName: 'Hoang Quoc Duy',
      phoneNumber: '0902090671',
      role: 'SUPERADMIN',
    },
  });

  // 2. Ensure all default/existing accounts and seed tables in PostgreSQL are synced & have valid bcrypt hashes
  await ensurePostgreSQLSeeded();
  await bootstrapSuperAdminAndUsers();

  // 3. Verify SUPERADMIN login hash in PostgreSQL
  const verifiedUser = await prisma.user.findUniqueOrThrow({
    where: { email: SUPERADMIN_EMAIL },
  });
  const isMatch = await bcrypt.compare(SUPERADMIN_PASSWORD, verifiedUser.passwordHash);

  console.log('===============================================================');
  console.log('✅ SUPERADMIN updated in PostgreSQL successfully!');
  console.log(`📧 Email:         ${verifiedUser.email}`);
  console.log(`👑 Role:          ${verifiedUser.role}`);
  console.log(`🔑 Password Hash: ${verifiedUser.passwordHash}`);
  console.log(`✔️  Bcrypt Verify: ${isMatch ? 'PASSED (Ready to login)' : 'FAILED'}`);
  console.log('===============================================================');
}

main()
  .catch((err) => {
    console.error('❌ Error updating SUPERADMIN password hash:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
