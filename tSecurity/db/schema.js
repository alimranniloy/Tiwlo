export const ensureTSecuritySchema = async (prisma) => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TSecurityGatewayChallenge" (
      "id" TEXT PRIMARY KEY,
      "serverPublicKey" TEXT NOT NULL,
      "serverPrivateKey" TEXT NOT NULL,
      "salt" TEXT NOT NULL,
      "requestIp" TEXT,
      "userAgent" TEXT,
      "metadata" JSONB,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "usedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TSecurityGatewayTicket" (
      "id" TEXT PRIMARY KEY,
      "tokenHash" TEXT NOT NULL UNIQUE,
      "action" TEXT NOT NULL,
      "verdict" TEXT NOT NULL,
      "riskScore" INTEGER NOT NULL DEFAULT 0,
      "reasons" JSONB,
      "payloadCiphertext" JSONB,
      "emailHash" TEXT,
      "phoneHash" TEXT,
      "deviceHash" TEXT,
      "ipAddress" TEXT,
      "ipSubnet" TEXT,
      "country" TEXT,
      "metadata" JSONB,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "usedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TSecurityBlockEvent" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT,
      "email" TEXT,
      "phone" TEXT,
      "ipAddress" TEXT,
      "ipSubnet" TEXT,
      "country" TEXT,
      "deviceHash" TEXT,
      "eventType" TEXT NOT NULL DEFAULT 'gateway',
      "status" TEXT NOT NULL DEFAULT 'blocked',
      "reason" TEXT NOT NULL,
      "reasons" JSONB,
      "riskScore" INTEGER NOT NULL DEFAULT 0,
      "requestId" TEXT,
      "payloadHash" TEXT,
      "blockedUntil" TIMESTAMP(3),
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TSecurityCooldown" (
      "id" TEXT PRIMARY KEY,
      "keyType" TEXT NOT NULL,
      "keyHash" TEXT NOT NULL UNIQUE,
      "keyValue" TEXT,
      "reason" TEXT NOT NULL,
      "blockEventId" TEXT,
      "blockedUntil" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "UserDeviceSession" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "fingerprintHash" TEXT NOT NULL,
      "fingerprintHint" TEXT,
      "deviceName" TEXT,
      "browser" TEXT,
      "os" TEXT,
      "userAgent" TEXT,
      "ipAddress" TEXT,
      "ipPrefix" TEXT,
      "country" TEXT,
      "region" TEXT,
      "city" TEXT,
      "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "loginCount" INTEGER NOT NULL DEFAULT 1,
      "lastEvent" TEXT NOT NULL DEFAULT 'login',
      "unusual" BOOLEAN NOT NULL DEFAULT false,
      "unusualReasons" JSONB,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserDeviceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  await Promise.all([
    prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TSecurityGatewayChallenge_expiresAt_idx" ON "TSecurityGatewayChallenge" ("expiresAt")'),
    prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TSecurityGatewayTicket_action_createdAt_idx" ON "TSecurityGatewayTicket" ("action", "createdAt")'),
    prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TSecurityGatewayTicket_subnet_createdAt_idx" ON "TSecurityGatewayTicket" ("ipSubnet", "createdAt")'),
    prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TSecurityGatewayTicket_emailHash_idx" ON "TSecurityGatewayTicket" ("emailHash")'),
    prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TSecurityBlockEvent_createdAt_idx" ON "TSecurityBlockEvent" ("createdAt")'),
    prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TSecurityBlockEvent_reason_idx" ON "TSecurityBlockEvent" ("reason")'),
    prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TSecurityBlockEvent_email_idx" ON "TSecurityBlockEvent" ("email")'),
    prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TSecurityBlockEvent_phone_idx" ON "TSecurityBlockEvent" ("phone")'),
    prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TSecurityBlockEvent_deviceHash_idx" ON "TSecurityBlockEvent" ("deviceHash")'),
    prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TSecurityCooldown_blockedUntil_idx" ON "TSecurityCooldown" ("blockedUntil")'),
    prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "UserDeviceSession_userId_fingerprintHash_key" ON "UserDeviceSession" ("userId", "fingerprintHash")'),
    prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "UserDeviceSession_userId_lastSeenAt_idx" ON "UserDeviceSession" ("userId", "lastSeenAt")'),
    prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "UserDeviceSession_unusual_lastSeenAt_idx" ON "UserDeviceSession" ("unusual", "lastSeenAt")')
  ]);
};
