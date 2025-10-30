/**
 * Oracle Client Module
 * Provides access to the MagicBlock AI Oracle from Next.js API routes
 */

let magicBlockAIOracleInstance: any = null;

export async function getMagicBlockAIOracle() {
  // Only import when needed to avoid initialization errors in API routes
  if (!magicBlockAIOracleInstance) {
    try {
      const importedModule = await import("../oracle-service/src/magicblock-ai-oracle");
      magicBlockAIOracleInstance = importedModule.magicBlockAIOracle;
    } catch (error) {
      console.error("Failed to import MagicBlock AI Oracle:", error);
      return null;
    }
  }
  
  return magicBlockAIOracleInstance;
}

/**
 * Calculate trend index using MagicBlock AI Oracle
 * Returns null if MagicBlock is not configured or fails
 */
export async function calculateTrendIndex(tokenId: string) {
  try {
    const oracle = await getMagicBlockAIOracle();
    
    if (!oracle) {
      console.warn("MagicBlock AI Oracle not configured");
      return null;
    }
    
    const response = await oracle.calculateTrendIndex(tokenId);
    
    if (!response.success || !response.result) {
      console.error("MagicBlock calculation failed:", response.error);
      return null;
    }
    
    return response;
  } catch (error) {
    console.error("Error calling MagicBlock AI Oracle:", error);
    return null;
  }
}

