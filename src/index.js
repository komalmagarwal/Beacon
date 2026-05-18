import 'dotenv/config';
import { scrapeAll } from './scraper.js';
import { generateDigest, formatEmailHTML, formatWhatsApp } from './digest.js';
import { sendEmail } from './email.js';
import { sendWhatsApp } from './whatsapp.js';
import { FOUNDER_PROFILE } from './profile.js';
import cron from 'node-cron';

async function runBeacon() {
  console.log('\n⚡ BEACON — startup ecosystem intelligence');
  console.log('==========================================\n');

  try {
    // 1. Scrape all sources
    const opportunities = await scrapeAll();

    if (opportunities.length === 0) {
      console.log('⚠️  No opportunities scraped. Check your network connection.');
      return;
    }

    // 2. Generate personalised digest
    const digest = await generateDigest(opportunities);

    // 3. Format outputs
    const emailHTML = formatEmailHTML(digest, FOUNDER_PROFILE);
    const whatsappMsg = formatWhatsApp(digest);

    // 4. Deliver
    const deliveryResults = await Promise.allSettled([
      sendEmail(emailHTML, `🚀 Your Beacon digest — ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`),
      sendWhatsApp(whatsappMsg)
    ]);

    deliveryResults.forEach((result, i) => {
      const channel = i === 0 ? 'Email' : 'WhatsApp';
      if (result.status === 'rejected') {
        console.log(`  ⚠️  ${channel} failed: ${result.reason?.message}`);
        console.log(`     Make sure ${channel === 'Email' ? 'EMAIL_FROM, EMAIL_PASSWORD, EMAIL_TO' : 'TWILIO_*'} are set in .env`);
      }
    });

    console.log('\n✅ Beacon digest complete!\n');
    console.log('--- WhatsApp preview ---');
    console.log(whatsappMsg.substring(0, 500) + '...\n');

  } catch (err) {
    console.error('❌ Beacon error:', err.message);
    if (err.message.includes('API')) {
      console.error('   Check your ANTHROPIC_API_KEY in .env');
    }
  }
}

// Check command line args
const args = process.argv.slice(2);

if (args.includes('--once') || args.includes('-o')) {
  // Run once immediately
  runBeacon();
} else if (args.includes('--cron')) {
  // Run on a schedule — every Monday and Thursday at 8am
  console.log('⏰ Beacon scheduled: running every Monday and Thursday at 8:00 AM');
  cron.schedule('0 8 * * 1,4', runBeacon);
  runBeacon(); // also run immediately
} else {
  // Default: run once
  runBeacon();
}
