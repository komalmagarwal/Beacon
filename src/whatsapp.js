import twilio from 'twilio';

export async function sendWhatsApp(message) {
  console.log('💬 Sending WhatsApp...');

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  // Split into chunks if message is too long (WhatsApp limit ~4096 chars)
  const chunks = splitMessage(message, 3000);

  for (const chunk of chunks) {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.TWILIO_WHATSAPP_TO,
      body: chunk
    });
  }

  console.log(`  ✓ WhatsApp sent to ${process.env.TWILIO_WHATSAPP_TO}`);
}

function splitMessage(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxLen));
    i += maxLen;
  }
  return chunks;
}
