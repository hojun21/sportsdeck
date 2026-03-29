import cron from "node-cron";
import { retrieveMatch } from "./retrieveMatch";

let isStart = false;

export function startCronJobs() {
    if (isStart) return;
    isStart = true;

    // Runs immediately when starting up
    retrieveMatch()
        .then(() => console.log("Initial match retrieval complete"))
        .catch(err => console.error("Initial retrieval failed:", err));

    cron.schedule("0 */6 * * *", async () => {
    try {
        await retrieveMatch();
        console.log("Matches updated");
    } catch (error) {
        console.error("Cron job error:", error);
    }
    });

}