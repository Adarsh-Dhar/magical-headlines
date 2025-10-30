import { prisma } from "../lib/prisma"

async function main() {
  const current = await prisma.season.findFirst({ where: { isActive: true } })
  if (!current) {
    console.log("No active season.")
    return
  }
  const now = new Date()
  if (now < new Date(current.endTimestamp)) {
    console.log(`Season ${current.seasonId} still active, not ended yet.`)
    return
  }
  const response = await fetch('http://localhost:3000/api/seasons/manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'end_season' })
  })
  if (!response.ok) {
    console.error('Failed to end season:', await response.text())
    process.exit(1)
  }
  console.log('Season ended:', await response.json())
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })


