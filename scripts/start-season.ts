async function main() {
  const response = await fetch('http://localhost:3000/api/seasons/manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'start_season' })
  })
  
  if (!response.ok) {
    console.error('Failed to start season:', await response.text())
    process.exit(1)
  }
  
  console.log('Season started:', await response.json())
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })


