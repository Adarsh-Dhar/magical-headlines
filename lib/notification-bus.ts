import { EventEmitter } from "events"

type NotificationEvent = {
  userWallet: string
  payload: any
}

class NotificationBus extends EventEmitter {}
export const notificationBus = new NotificationBus()

export function emitNotification(userWallet: string, payload: any) {
  const key = `notify:${userWallet}`
  notificationBus.emit(key, { userWallet, payload } as NotificationEvent)
}

export function subscribeNotifications(
  userWallet: string,
  handler: (ev: NotificationEvent) => void,
) {
  const key = `notify:${userWallet}`
  notificationBus.on(key, handler)
  return () => notificationBus.off(key, handler)
}


