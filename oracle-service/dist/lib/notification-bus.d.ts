import { EventEmitter } from "events";
type NotificationEvent = {
    userWallet: string;
    payload: any;
};
declare class NotificationBus extends EventEmitter {
}
export declare const notificationBus: NotificationBus;
export declare function emitNotification(userWallet: string, payload: any): void;
export declare function subscribeNotifications(userWallet: string, handler: (ev: NotificationEvent) => void): () => NotificationBus;
export {};
//# sourceMappingURL=notification-bus.d.ts.map