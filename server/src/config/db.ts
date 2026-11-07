import mongoose from 'mongoose';
import { env, isTest } from './env';

mongoose.set('strictQuery', true);

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    autoIndex: !isTest,
  });
  if (!isTest) {
    // eslint-disable-next-line no-console
    console.log(`[db] connected to ${conn.connection.host}/${conn.connection.name}`);
  }
  return conn;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
