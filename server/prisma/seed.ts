import { randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_EMAIL = 'afonso.webdev@gmail.com'

const SERVICES = [
  { name: 'Box Braids', description: 'Tranças quadradas protetoras, clássicas e versáteis.', durationLabel: '3–5h', priceCents: 6000 },
  { name: 'Knotless Braids', description: 'Tranças sem nó inicial, mais leves e confortáveis.', durationLabel: '4–6h', priceCents: 8000 },
  { name: 'Fulani Braids', description: 'Tranças com padrão central e contas decorativas.', durationLabel: '2–4h', priceCents: 5000 },
  { name: 'Cornrows', description: 'Tranças rentes ao couro cabeludo, em padrões variados.', durationLabel: '1–3h', priceCents: 3500 },
  { name: 'Goddess Braids', description: 'Tranças grossas e volumosas, estilo statement.', durationLabel: '2–4h', priceCents: 7000 },
  { name: 'Feed-in Braids', description: 'Tranças com integração gradual, acabamento natural.', durationLabel: '2–3h', priceCents: 4500 },
]

async function main() {
  const existingAdmin = await prisma.admin.findUnique({ where: { email: ADMIN_EMAIL } })
  if (existingAdmin) {
    console.log(`[seed] Admin ${ADMIN_EMAIL} já existe. A password não foi alterada.`)
  } else {
    const tempPassword = randomBytes(9).toString('base64url')
    const passwordHash = await bcrypt.hash(tempPassword, 10)
    await prisma.admin.create({ data: { email: ADMIN_EMAIL, passwordHash } })
    console.log('\n[seed] Conta de admin criada:')
    console.log(`  email:    ${ADMIN_EMAIL}`)
    console.log(`  password: ${tempPassword}`)
    console.log('  (guarda esta password agora, porque não volta a ser mostrada. Troca-a depois de entrares.)\n')
  }

  for (const service of SERVICES) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: {},
      create: service,
    })
  }
  console.log(`[seed] ${SERVICES.length} serviços garantidos.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
