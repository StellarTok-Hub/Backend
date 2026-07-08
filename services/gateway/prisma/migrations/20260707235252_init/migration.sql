-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiktok_identities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tiktokUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tiktok_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stellar_wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stellar_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tiktok_identities_tiktokUserId_key" ON "tiktok_identities"("tiktokUserId");

-- CreateIndex
CREATE INDEX "tiktok_identities_userId_idx" ON "tiktok_identities"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "stellar_wallets_publicKey_key" ON "stellar_wallets"("publicKey");

-- CreateIndex
CREATE INDEX "stellar_wallets_userId_idx" ON "stellar_wallets"("userId");

-- AddForeignKey
ALTER TABLE "tiktok_identities" ADD CONSTRAINT "tiktok_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
