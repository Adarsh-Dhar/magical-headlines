import NextAuth, { type DefaultSession, NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      walletAddress?: string | null
    } & DefaultSession["user"]
  }
}

const credentialsSchema = z.object({
  email: z.string().email().optional(),
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  name: z.string().min(1).optional(),
})

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        walletAddress: { label: "Wallet Address", type: "text" },
        name: { label: "Name", type: "text" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null
        const { email, walletAddress, name } = parsed.data

        if (!email && !walletAddress) return null

        const user = await prisma.user.upsert({
          where: email ? { email } : { walletAddress: walletAddress! },
          update: {},
          create: {
            email: email ?? null,
            walletAddress: walletAddress ?? ("" as never),
            name: name ?? null,
          },
        })

        return { id: user.id, email: user.email ?? undefined, name: user.name ?? undefined, image: user.image ?? undefined }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.walletAddress = (user as any).walletAddress ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.walletAddress = token.walletAddress as string | null
      }
      return session
    },
  },
}

export default NextAuth(authOptions)


