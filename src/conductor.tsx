import 'dotenv/config';
import './../scripts/the-telegraph'; // This boots the Telegram Bot listener immediately
import { dispatchTailor } from '../scripts/the-tailor';
import { dispatchPostmaster } from '../scripts/the-postmaster';

console.log(`\n🎼 The Amanuensis Conductor is online. All systems synchronized.`);
console.log(`📡 Sentry: Listening for incoming Telegram transmissions...`);

// --- THE HEARTBEAT MONITORS ---
// We use a simple lock system to prevent the functions from running twice 
// if a generation takes longer than the interval.

let isTailorRunning = false;
let isPostmasterRunning = false;

// 1. The Tailor Heartbeat (Checks every 30 seconds)
setInterval(async () => {
  if (isTailorRunning) return;
  
  isTailorRunning = true;
  try {
    await dispatchTailor();
  } catch (error) {
    console.error("Tailor Loop Error:", error);
  } finally {
    isTailorRunning = false;
  }
}, 30 * 1000);

// 2. The Postmaster Heartbeat (Checks every 45 seconds)
setInterval(async () => {
  if (isPostmasterRunning) return;
  
  isPostmasterRunning = true;
  try {
    await dispatchPostmaster();
  } catch (error) {
    console.error("Postmaster Loop Error:", error);
  } finally {
    isPostmasterRunning = false;
  }
}, 45 * 1000);

console.log(`⏱️ Heartbeats established. Monitoring the Vault...\n`);