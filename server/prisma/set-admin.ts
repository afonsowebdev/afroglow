import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const [email, password] = process.argv.slice(2)
  if (!email || !password) {
    console.error('Uso: npm run set-admin -- <email> <password>')
    process.exitCode = 1
    return
  }
  if (password.length < 8) {
    console.error('A password deve ter pelo menos 8 caracteres.')
    process.exitCode = 1
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  })

  console.log(`[set-admin] Password definida para ${admin.email}.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
