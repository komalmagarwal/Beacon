# Beacon ⚡
### Startup ecosystem intelligence — personalised to you

Scrapes London startup events, grants, accelerators and investor opportunities. Claude AI personalises the digest to your specific profile. Delivered to your email + WhatsApp.

---

## Setup (15 minutes)

### 1. Clone and install
```bash
cd beacon
npm install
```

### 2. Set up your .env file
```bash
cp .env.example .env
```

Edit `.env` with your credentials:

**Anthropic API key**
- Get it at: https://console.anthropic.com
- Set: `ANTHROPIC_API_KEY=sk-ant-...`

**Gmail (for email delivery)**
- Use a Gmail account
- Enable 2FA, then create an App Password: https://myaccount.google.com/apppasswords
- Set: `EMAIL_FROM`, `EMAIL_PASSWORD`, `EMAIL_TO`

**Twilio (for WhatsApp)**
- Sign up at: https://twilio.com
- Get a free account (free trial works)
- Join the WhatsApp Sandbox: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
- Send "join <your-sandbox-word>" from your WhatsApp to +1 415 523 8886
- Set: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_TO`

### 3. Edit your profile
Open `src/profile.js` and update it to match you:
- Your name, city, stage
- Your sectors and goals
- What you're building

### 4. Run it
```bash
# Run once
npm start

# Run on a schedule (Mon + Thu 8am)
node src/index.js --cron
```

---

## What it does

1. **Scrapes** Lu.ma, Eventbrite, Meetup, Innovate UK, and accelerator sites
2. **Ranks** opportunities by relevance to your profile
3. **Explains** why each one matters to you specifically
4. **Delivers** a digest to your email + WhatsApp

---

## Sources

| Source | What |
|--------|------|
| Lu.ma | Founder dinners, VC events, meetups |
| Eventbrite | Demo days, pitch nights, workshops |
| Meetup | Founder communities |
| Innovate UK | Grants and R&D funding |
| EF / Antler / Seedcamp | Accelerator deadlines |

---

## Roadmap

- [ ] More sources: LinkedIn Events, VC websites, university pages
- [ ] Multi-user support (Airtable backend)
- [ ] Landing page + onboarding flow
- [ ] 5-day trial + Stripe payments
- [ ] Web dashboard

---

Built with Node.js · Claude API · Cheerio · Nodemailer · Twilio
