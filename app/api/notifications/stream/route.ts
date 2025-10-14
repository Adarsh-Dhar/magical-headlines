import { NextRequest } from "next/server"
import { subscribeNotifications } from "@/lib/notification-bus"
import { isValidWalletAddress } from "@/lib/user-utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get("wallet")

  if (!wallet || !isValidWalletAddress(wallet)) {
    return new Response("Invalid wallet", { status: 400 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(`:ok\n\n`))

      const unsub = subscribeNotifications(wallet, (ev) => {
        const data = JSON.stringify(ev.payload)
        controller.enqueue(encoder.encode(`event: message\ndata: ${data}\n\n`))
      })

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`:ping\n\n`))
      }, 20000)

      const close = () => {
        clearInterval(heartbeat)
        unsub()
        controller.close()
      }

      // @ts-ignore
      req.signal?.addEventListener("abort", close)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}


