"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationBus = void 0;
exports.emitNotification = emitNotification;
exports.subscribeNotifications = subscribeNotifications;
const events_1 = require("events");
class NotificationBus extends events_1.EventEmitter {
}
exports.notificationBus = new NotificationBus();
function emitNotification(userWallet, payload) {
    const key = `notify:${userWallet}`;
    exports.notificationBus.emit(key, { userWallet, payload });
}
function subscribeNotifications(userWallet, handler) {
    const key = `notify:${userWallet}`;
    exports.notificationBus.on(key, handler);
    return () => exports.notificationBus.off(key, handler);
}
//# sourceMappingURL=notification-bus.js.map