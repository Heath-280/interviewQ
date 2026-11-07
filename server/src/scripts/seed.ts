import { connectDatabase, disconnectDatabase } from '../config/db';
import { env } from '../config/env';
import { User } from '../models/User';

async function seed(): Promise<void> {
  await connectDatabase();

  const existing = await User.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    existing.role = 'admin';
    await existing.save();
    // eslint-disable-next-line no-console
    console.log(`Admin already exists: ${existing.email} (role ensured: admin)`);
  } else {
    await User.create({
      name: env.ADMIN_NAME,
      email: env.ADMIN_EMAIL.toLowerCase(),
      passwordHash: env.ADMIN_PASSWORD,
      role: 'admin',
    });
    // eslint-disable-next-line no-console
    console.log(`Created admin account: ${env.ADMIN_EMAIL}`);
    // eslint-disable-next-line no-console
    console.log(`Password: ${env.ADMIN_PASSWORD}  (change this immediately)`);
  }

  await disconnectDatabase();
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
