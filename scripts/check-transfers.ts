// scripts/check-transfers.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // 모든 Transfer 조회
    const transfers = await prisma.transfer.findMany({
      include: {
        user: { select: { email: true } },
        asset: { select: { symbol: true, name: true } }
      },
      orderBy: { requestedAt: 'desc' },
      take: 20
    })

    console.log(`\n📊 Total Transfers: ${transfers.length}\n`)

    if (transfers.length === 0) {
      console.log('❌ No transfers found in database')
    } else {
      transfers.forEach((t) => {
        console.log(`ID: ${t.id}`)
        console.log(`  User: ${t.user.email}`)
        console.log(`  Type: ${t.type}`)
        console.log(`  Asset: ${t.asset.symbol}`)
        console.log(`  Amount: ${t.amount.toString()}`)
        console.log(`  Status: ${t.status}`)
        console.log(`  Requested: ${t.requestedAt}`)
        console.log(`  Address: ${t.address || 'N/A'}`)
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
