import { prisma } from "@/lib/prisma"

export interface User {
  id: string
  name: string | null
  walletAddress: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Get or create a user by wallet address
 * @param walletAddress - The wallet address to look up or create
 * @param name - Optional name for the user
 * @returns The user object
 */
export async function getOrCreateUser(walletAddress: string, name?: string): Promise<User> {
  // First try to find existing user
  let user = await prisma.user.findUnique({
    where: { walletAddress }
  })

  // If user doesn't exist, create them
  if (!user) {
    user = await prisma.user.create({
      data: {
        walletAddress,
        name: name || `Wallet User ${walletAddress.slice(0, 8)}`
      }
    })
  }

  return user
}

/**
 * Get a user by wallet address
 * @param walletAddress - The wallet address to look up
 * @returns The user object or null if not found
 */
export async function getUserByWalletAddress(walletAddress: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { walletAddress }
  })
}

/**
 * Get a user by ID
 * @param id - The user ID to look up
 * @returns The user object or null if not found
 */
export async function getUserById(id: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { id }
  })
}

/**
 * Update user information
 * @param walletAddress - The wallet address of the user to update
 * @param data - The data to update
 * @returns The updated user object
 */
export async function updateUser(walletAddress: string, data: { name?: string }): Promise<User> {
  return await prisma.user.update({
    where: { walletAddress },
    data
  })
}

/**
 * Validate wallet address format (basic Solana address validation)
 * @param walletAddress - The wallet address to validate
 * @returns True if valid, false otherwise
 */
export function isValidWalletAddress(walletAddress: string): boolean {
  // Basic Solana address validation - base58 encoded, 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  return base58Regex.test(walletAddress)
}
