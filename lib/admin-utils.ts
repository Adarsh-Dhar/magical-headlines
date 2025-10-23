/**
 * Admin authentication utilities for season management
 */

/**
 * Check if a wallet address is the oracle admin
 * @param walletAddress - The wallet address to check
 * @returns true if the wallet is the oracle admin, false otherwise
 */
export function isAdmin(walletAddress: string | null | undefined): boolean {
  if (!walletAddress) return false;
  
  const adminAddress = process.env.NEXT_PUBLIC_ORACLE_ADMIN_ADDRESS;
  if (!adminAddress) {
    console.warn('NEXT_PUBLIC_ORACLE_ADMIN_ADDRESS not configured');
    return false;
  }
  
  return walletAddress === adminAddress;
}

/**
 * Get the oracle admin address from environment
 * @returns The oracle admin address or null if not configured
 */
export function getAdminAddress(): string | null {
  return process.env.NEXT_PUBLIC_ORACLE_ADMIN_ADDRESS || null;
}
