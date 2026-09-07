import type { ForgeConfig } from '@sanskar225/core';
import type { GeneratedFile } from '../types.js';

export function generateDatabaseFiles(config: ForgeConfig, basePath: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const { database, auth } = config;

  if (!database || database.provider === 'none') {
    return files;
  }

  const isPostgres = database.provider === 'postgresql';
  const isMongo = database.provider === 'mongodb';
  const hasAuth = auth && auth.strategy !== 'none';

  // 1. Prisma (PostgreSQL / MongoDB)
  if (database.orm === 'prisma') {
    const datasourceProvider = isPostgres ? 'postgresql' : 'mongodb';
    const idField = isPostgres
      ? 'id        String   @id @default(uuid())'
      : 'id        String   @id @default(auto()) @map("_id") @db.ObjectId';

    const schemaPrisma = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${datasourceProvider}"
  url      = env("DATABASE_URL")
}

${
  hasAuth
    ? `model User {
  ${idField}
  email        String   @unique
  passwordHash String
  name         String?
  role         String   @default("USER")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  refreshTokens RefreshToken[]

  @@map("users")
}

model RefreshToken {
  ${idField}
  token     String   @unique
  userId    String   ${isMongo ? '@db.ObjectId' : ''}
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@map("refresh_tokens")
}`
    : `model SampleItem {
  ${idField}
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("sample_items")
}`
}
`;

    files.push({
      path: `${basePath}/prisma/schema.prisma`,
      content: schemaPrisma,
    });

    const clientTs = `import { PrismaClient } from '@prisma/client';
import { logger } from '../observability/logger.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database via Prisma');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to database');
    throw error;
  }
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw\`SELECT 1\`;
    return true;
  } catch {
    return false;
  }
}
`;
    files.push({
      path: `${basePath}/src/db/client.ts`,
      content: clientTs,
    });
  }

  // 2. Drizzle (PostgreSQL)
  if (database.orm === 'drizzle' && isPostgres) {
    const drizzleConfig = `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/app_db',
  },
});
`;
    files.push({
      path: `${basePath}/drizzle.config.ts`,
      content: drizzleConfig,
    });

    const schemaTs = `import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  role: text('role').default('USER').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: text('token').notNull().unique(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
`;
    files.push({
      path: `${basePath}/src/db/schema.ts`,
      content: schemaTs,
    });

    const drizzleClient = `import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { logger } from '../observability/logger.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/app_db';
const client = postgres(connectionString);

export const db = drizzle(client, { schema });

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await client\`SELECT 1\`;
    return true;
  } catch {
    return false;
  }
}
`;
    files.push({
      path: `${basePath}/src/db/client.ts`,
      content: drizzleClient,
    });
  }

  // 3. Mongoose (MongoDB)
  if (database.orm === 'mongoose' && isMongo) {
    const mongooseClient = `import mongoose from 'mongoose';
import { logger } from '../observability/logger.js';

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/app_db';
  try {
    await mongoose.connect(uri);
    logger.info('Connected to MongoDB via Mongoose');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to MongoDB');
    throw error;
  }
}

export async function checkDatabaseHealth(): Promise<boolean> {
  return mongoose.connection.readyState === 1;
}
`;
    files.push({
      path: `${basePath}/src/db/client.ts`,
      content: mongooseClient,
    });

    if (hasAuth) {
      const userModel = `import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String },
    role: { type: String, default: 'USER' },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
`;
      files.push({
        path: `${basePath}/src/models/user.model.ts`,
        content: userModel,
      });
    }
  }

  return files;
}
