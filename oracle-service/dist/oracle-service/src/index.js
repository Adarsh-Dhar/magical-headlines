"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const article_1 = require("./article");
const config_1 = require("./config");
const PROGRAM_ID = (0, config_1.getProgramId)();
const connection = (0, config_1.getConnection)();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Starting oracle listener...");
        connection.onProgramAccountChange(PROGRAM_ID, (change) => {
            console.log("New account activity detected!");
            (0, article_1.handleNewArticle)(change.accountId, change.accountInfo.data);
        }, "confirmed");
    });
}
main();
//# sourceMappingURL=index.js.map