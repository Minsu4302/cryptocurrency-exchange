// scripts/add-balance.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'test2@example.com'
  const addAmount = 100000000000 // 1000억

  try {
    // 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, balance: true }
    })

    if (!user) {
      console.error(`❌ User not found: ${email}`)
      process.exit(1)
    }

    console.log(`📊 Current balance: ${user.balance.toString()} 원`)

    // 잔액 추가
    const updated = await prisma.user.update({
      where: { email },
      data: {
        balance: {
          increment: addAmount
        }
      },
      select: { id: true, email: true, balance: true }
    })

    console.log(`✅ Balance updated!`)
    console.log(`   Email: ${updated.email}`)
    console.log(`   Previous: ${user.balance.toString()} 원`)
    console.log(`   Added: ${addAmount.toLocaleString('ko-KR')} 원`)
    console.log(`   New balance: ${updated.balance.toString()} 원`)
    console.log(`   Formatted: ${Number(updated.balance).toLocaleString('ko-KR')} 원`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
