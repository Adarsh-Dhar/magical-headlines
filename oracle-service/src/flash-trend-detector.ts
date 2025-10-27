import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class FlashTrendDetector {
  private velocityThreshold = 5.0; // Points per second
  private recentTriggers = new Map<string, Date>();
  private cooldownMs = 120000; // 2 minutes between flash markets
  
  async detectVelocitySpike(tokenId: string): Promise<{
    detected: boolean;
    velocity: number;
  }> {
    const history = await prisma.trendIndexHistory.findMany({
      where: { tokenId },
      orderBy: { timestamp: 'desc' },
      take: 3,
    });
    
    if (history.length < 3) {
      return { detected: false, velocity: 0 };
    }
    
    // Calculate recent velocity (last 2 data points)
    const timeDiff = (history[0].timestamp.getTime() - history[1].timestamp.getTime()) / 1000;
    const scoreDiff = history[0].score - history[1].score;
    const velocity = timeDiff > 0 ? scoreDiff / timeDiff : 0;
    
    // Check cooldown
    const lastTrigger = this.recentTriggers.get(tokenId);
    if (lastTrigger && Date.now() - lastTrigger.getTime() < this.cooldownMs) {
      return { detected: false, velocity };
    }
    
    // Detect spike
    if (Math.abs(velocity) > this.velocityThreshold) {
      this.recentTriggers.set(tokenId, new Date());
      return { detected: true, velocity };
    }
    
    return { detected: false, velocity };
  }
  
  async createFlashMarket(tokenId: string, initialVelocity: number): Promise<any> {
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
      include: {
        trendIndexHistory: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });
    
    if (!token) throw new Error('Token not found');
    
    const endTime = new Date(Date.now() + 60000); // 60 seconds
    
    return await prisma.flashTrendMarket.create({
      data: {
        parentTokenId: tokenId,
        trendSnapshot: token.trendFactorWeights || {},
        startTimestamp: new Date(),
        endTimestamp: endTime,
        initialVelocity,
        isActive: true,
      }
    });
  }
}

