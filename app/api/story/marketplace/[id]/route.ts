import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Validation schema for updating onMarket status
const updateOnMarketSchema = z.object({
  onMarket: z.boolean()
})

// PUT /api/story/marketplace/[id] - Update onMarket status of a story
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[API] Update onMarket status request received for story:', params.id)
    
    // Check authentication
    const session = await getServerSession(authOptions)
    console.log('[API] Session check:', { hasSession: !!session, userId: session?.user?.id })
    
    if (!session?.user?.id) {
      console.log('[API] No session found, returning 401')
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    console.log('[API] Request body received:', { onMarket: body.onMarket })
    
    const validation = updateOnMarketSchema.safeParse(body)
    
    if (!validation.success) {
      console.log('[API] Validation failed:', validation.error.errors)
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      )
    }
    
    console.log('[API] Validation passed, proceeding with onMarket status update')

    const { onMarket } = validation.data

    // Check if story exists and get current data
    const existingStory = await prisma.story.findUnique({
      where: { id: params.id },
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
            walletAddress: true
          }
        },
        tags: true,
        token: true
      }
    })

    if (!existingStory) {
      console.log('[API] Story not found:', params.id)
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      )
    }

    // Check if user is the submitter of the story
    if (existingStory.submitterId !== session.user.id) {
      console.log('[API] User is not the submitter of this story')
      return NextResponse.json(
        { error: "You can only update stories you submitted" },
        { status: 403 }
      )
    }

    // Update the onMarket status
    console.log('[API] Updating onMarket status...')
    const updatedStory = await prisma.story.update({
      where: { id: params.id },
      data: { onMarket } as any,
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
            walletAddress: true
          }
        },
        tags: true,
        token: true
      }
    })

    console.log('[API] Story onMarket status updated successfully:', updatedStory.id)
    return NextResponse.json(updatedStory, { status: 200 })

  } catch (error) {
    console.error("Error updating story onMarket status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
