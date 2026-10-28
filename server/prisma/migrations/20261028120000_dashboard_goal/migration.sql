-- The admin Início's monthly revenue goal (0 = not set).
CREATE TABLE "DashboardGoal" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "monthlyCents" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardGoal_pkey" PRIMARY KEY ("id")
);
