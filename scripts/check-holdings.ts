// scripts/check-holdings.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // test2@example.com 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { email: 'test2@example.com' },
      select: { id: true, email: true, balance: true }
    })

    if (!user) {
      console.log('❌ User not found')
      process.exit(1)
    }

    console.log(`\n👤 User: ${user.email} (ID: ${user.id})`)
    console.log(`💰 Balance: ${Number(user.balance).toLocaleString('ko-KR')} 원\n`)

    // Holdings 조회
    const holdings = await prisma.holding.findMany({
      where: { userId: user.id }
    })

    console.log(`📊 Total Holdings: ${holdings.length}\n`)

    if (holdings.length === 0) {
      console.log('❌ No holdings found')
    } else {
      holdings.forEach((h) => {
        console.log(`Symbol: ${h.symbol}`)
        console.log(`  Amount: ${h.amount}`)
        console.log(`---`)
      })
    }

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
