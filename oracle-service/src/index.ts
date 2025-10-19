// In your main oracle service file (e.g., index.ts)
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { NewsPlatform } from "../../contract/target/types/news_platform";
import IDL from "../../contract/target/idl/news_platform.json";
import { handleNewArticle } from "./article";

import { getConnection, getProgramId } from "./config";

const PROGRAM_ID = getProgramId();
const connection = getConnection();

// Main function to start the listener
async function main() {
    console.log("Starting oracle listener...");

    connection.onProgramAccountChange(
        PROGRAM_ID,
        (change) => {
            console.log("New account activity detected!");
            handleNewArticle(change.accountId, change.accountInfo.data);
        },
        "confirmed"
    );
}

main();