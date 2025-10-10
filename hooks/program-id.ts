import { PublicKey } from '@solana/web3.js'

export function getProgramId(): PublicKey {
  const programIdString = process.env.NEXT_PUBLIC_PROGRAM_ID
  if (!programIdString) {
    throw new Error('NEXT_PUBLIC_PROGRAM_ID is not set')
  }
  return new PublicKey(programIdString)
}

export const PROGRAM_ID: PublicKey = (() => {
  try {
    return getProgramId()
  } catch (e) {
    // Rethrow to surface misconfiguration early in development
    throw e
  }
})()


