// scripts/check-assets.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const assets = await prisma.asset.findMany({
      select: { id: true, symbol: true, name: true }
    })

    console.log(`\n📊 Total Assets: ${assets.length}\n`)

    if (assets.length === 0) {
      console.log('❌ No assets found')
    } else {
      assets.forEach((a) => {
        console.log(`${a.symbol} - ${a.name} (ID: ${a.id})`)
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
