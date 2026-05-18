import Groq from 'groq-sdk';
import { FOUNDER_PROFILE } from './profile.js';

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateDigest(opportunities) {
  console.log('🤖 Generating personalised digest with Groq...');

  const profile = `
Name: ${FOUNDER_PROFILE.name}
City: ${FOUNDER_PROFILE.city}
Stage: ${FOUNDER_PROFILE.stage}
Sectors: ${FOUNDER_PROFILE.sectors.join(', ')}
Background: ${FOUNDER_PROFILE.background}
Goals: ${FOUNDER_PROFILE.goals.join(', ')}
Building: ${FOUNDER_PROFILE.building}
Opportunity types wanted: ${FOUNDER_PROFILE.opportunityTypes.join(', ')}
`.trim();

  const oppsText = opportunities
    .slice(0, 25)
    .map((o, i) => `${i + 1}. "${o.title}" | Type: ${o.type} | Date: ${o.date} | Org: ${o.org} | Source: ${o.source} | URL: ${o.url} | Desc: ${o.desc}`)
    .join('\n');

  const prompt = `You are Beacon — an AI that helps startup founders discover the most relevant opportunities in their ecosystem.

Founder profile:
${profile}

Scraped opportunities this week (${opportunities.length} total):
${oppsText}

Your job:
1. Select the TOP 8 most relevant opportunities for this specific founder
2. For each, explain in 2-3 sentences WHY it matters to them personally — reference their background, stage, sector, goals
3. Give one specific action they should take
4. Score relevance: high / medium / low

Respond ONLY with valid JSON array:
[
  {
    "title": "opportunity title",
    "type": "type",
    "date": "date",
    "org": "organiser",
    "url": "url",
    "source": "source",
    "relevance": "high|medium|low",
    "reasoning": "personalised 2-3 sentence explanation",
    "action": "specific next step"
  }
]

Only return the JSON. No markdown, no preamble, no extra text.`;

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.choices[0].message.content;
  const clean = text.replace(/```json|```/g, '').trim();
  const results = JSON.parse(clean);

  console.log(`  ✓ Generated digest with ${results.length} personalised recommendations`);
  return results;
}

export function formatEmailHTML(digest, profile) {
  const high = digest.filter(d => d.relevance === 'high');
  const medium = digest.filter(d => d.relevance === 'medium');
  const low = digest.filter(d => d.relevance === 'low');
  const sorted = [...high, ...medium, ...low];

  const badge = (rel) => {
    const map = { high: '#3B6D11;background:#EAF3DE', medium: '#854F0B;background:#FAEEDA', low: '#5F5E57;background:#F1EFE8' };
    return `<span style="font-size:11px;padding:3px 8px;border-radius:999px;font-weight:600;color:${map[rel] || map.low}">${rel} match</span>`;
  };

  const cards = sorted.map(opp => `
    <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:16px;background:#fff;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
        <strong style="font-size:15px;color:#111;">${opp.title}</strong>
        ${badge(opp.relevance)}
      </div>
      <div style="font-size:12px;color:#6b7280;margin-bottom:12px;">
        📅 ${opp.date} &nbsp;·&nbsp; 🏢 ${opp.org} &nbsp;·&nbsp; 🏷 ${opp.type}
      </div>
      <div style="font-size:13px;color:#374151;line-height:1.6;border-left:3px solid #7F77DD;padding-left:12px;margin-bottom:12px;">
        ${opp.reasoning}
      </div>
      <div style="font-size:12px;color:#534AB7;font-weight:600;margin-bottom:10px;">
        → ${opp.action}
      </div>
      <a href="${opp.url}" style="font-size:12px;color:#534AB7;text-decoration:none;">View opportunity ↗</a>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;">
    <div style="text-align:center;padding:32px 0 24px;">
      <div style="font-size:24px;font-weight:700;color:#111;letter-spacing:-0.5px;">beacon</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px;">your startup ecosystem intelligence</div>
    </div>
    <div style="background:#EEEDFE;border-radius:12px;padding:20px;margin-bottom:24px;">
      <div style="font-size:14px;color:#3C3489;font-weight:600;">Hey ${profile.name} 👋</div>
      <div style="font-size:13px;color:#534AB7;margin-top:6px;line-height:1.6;">
        Here are your top opportunities this week — ${high.length} high match, ${medium.length} medium, ${low.length} low.
      </div>
    </div>
    ${cards}
    <div style="text-align:center;padding:24px 0;border-top:1px solid #e5e7eb;margin-top:8px;">
      <div style="font-size:12px;color:#9ca3af;">Beacon · London startup ecosystem intelligence</div>
    </div>
  </div>
</body>
</html>`;
}

export function formatWhatsApp(digest) {
  const high = digest.filter(d => d.relevance === 'high');
  const all = [...high, ...digest.filter(d => d.relevance !== 'high')].slice(0, 5);
  const lines = all.map((opp) => {
    const emoji = opp.relevance === 'high' ? '🔥' : opp.relevance === 'medium' ? '⭐' : '📌';
    return `${emoji} *${opp.title}*\n${opp.date} · ${opp.org}\n${opp.reasoning.substring(0, 120)}...\n→ ${opp.action}\n${opp.url}`;
  });
  return `*Beacon* 🚀\nYour London startup opportunities this week:\n\n${lines.join('\n\n---\n\n')}`;
}