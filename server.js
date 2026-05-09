require('dotenv').config({ override: true, path: require('path').join(__dirname, '.env') });
const express = require('express');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── System prompt (cached) ────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Specc — a sharp, experienced PM who's shipped real products and has the scars to prove it. You talk like a smart colleague, not a consultant. No jargon for the sake of it, no corporate fluff.

You're direct, a little opinionated, and you'd rather give someone an honest "this needs more thought" than a polished non-answer. You ask the right questions before writing anything, and when you do write, every sentence earns its place.

You never make things up. If something is unclear or underdefined, you say so plainly. You always think about what could go wrong, what success actually looks like, and what "done" means in practice.`;

// ─── Route: Feature discovery conversation ────────────────────────────────
app.post('/api/discover', async (req, res) => {
  const { history } = req.body;
  if (!history || !Array.isArray(history)) {
    return res.status(400).json({ error: 'Missing conversation history' });
  }

  const DISCOVERY_PROMPT = `You are Specc in discovery mode — helping a PM figure out what to build next.

Your job is to have a real conversation: ask smart questions, listen carefully, and then offer opinionated feature ideas grounded in what you've learned. You're not a search engine listing options — you're a sharp colleague who has opinions and will push back.

**Conversation flow:**
- **Early turns (turns 1–2):** Ask focused questions to understand the product, users, and pain points. One or two questions per turn — don't interrogate. Show you're thinking, not just collecting.
- **Once you have enough context:** Offer 3–4 specific feature ideas. Each should have a name, a one-sentence description, and a brief "why this, why now" rationale. Be opinionated — say which one you'd build first and why.
- **Iteration:** If they push back, ask for something different, or want to explore one idea deeper — do it. This is a conversation, not a presentation.
- **When they pick one:** Confirm you understand what they've chosen, give a brief summary of the feature, and signal readiness to move into the spec phase.

**Tone:** Direct. Collegial. A little opinionated. You'd rather say "I think this one is clearly the strongest" than hedge everything.

**Output format:** You must ALWAYS respond with a JSON object:
{
  "reply": "Your conversational response here — markdown is fine for lists/bold",
  "featureChosen": null,
  "featureSummary": null
}

When the user has clearly committed to a specific feature (they said yes, confirmed, picked one — not just asked about it), set:
{
  "reply": "Great, [feature name] it is. Here's what we're building: [1-2 sentence summary]. Let's get into the spec.",
  "featureChosen": "[Feature Name]",
  "featureSummary": "[Clear 1-2 sentence description of the feature and its core value]"
}

Never set featureChosen unless the user has explicitly confirmed a choice. Keep exploring until then.`;

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: `${DISCOVERY_PROMPT}\n\n---\n\nHere is the conversation so far:\n\n${history.map(m => `${m.role === 'user' ? 'PM' : 'Specc'}: ${m.content}`).join('\n\n')}\n\nRespond as Specc. Return only the JSON object.`
        }
      ]
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse response');
    const parsed = JSON.parse(jsonMatch[0]);

    // Validate shape
    res.json({
      reply: parsed.reply || '',
      featureChosen: parsed.featureChosen || null,
      featureSummary: parsed.featureSummary || null
    });
  } catch (err) {
    console.error('Discover error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate discovery response' });
  }
});

// ─── Helper: derive fallback names from description text ─────────────────
function fallbackNamesFromDescription(description) {
  const stopWords = new Set(['that','this','with','from','have','will','they','their','when','what','your','which','about','would','could','should','users','user','feature','build','want','need','make','into','also','just','like','some','more','than','then','very','been','were','does','doing','built','adding','where','there','these','those','over','under','after','before','through']);
  const words = description
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()))
    .slice(0, 8);
  const cap = w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  const names = [];
  if (words[0]) names.push(cap(words[0]) + ' Hub');
  if (words[0] && words[1]) names.push(cap(words[0]) + ' ' + cap(words[1]));
  if (words[1]) names.push('Quick' + cap(words[1]));
  if (words[0]) names.push(cap(words[0]) + ' Flow');
  if (words[2]) names.push(cap(words[2]) + ' View');
  // Ensure we always return at least 3
  while (names.length < 3) names.push('Feature ' + (names.length + 1));
  return names.slice(0, 5);
}

// ─── Route: Generate feature name suggestions ─────────────────────────────
app.post('/api/name', async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: 'Missing description' });

  const namePrompt = (desc) => `A PM just described a feature they're building: "${desc}"

Suggest 5 short, sharp names for this feature. Think like a product team naming something for a roadmap or design ticket — not a marketing campaign. Names should be:
- 1–3 words max
- Mix of descriptive (what it does) and evocative (how it feels)
- Natural to say out loud in a standup
- No buzzwords, no "AI-powered" or "Smart" unless it's genuinely the right word

Return ONLY a valid JSON object with no other text:
{ "names": ["Name1", "Name2", "Name3", "Name4", "Name5"] }`;

  // Attempt 1: call Claude and parse JSON
  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 256,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: namePrompt(description) }]
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.names && parsed.names.length > 0) {
        return res.json({ names: parsed.names });
      }
    }
  } catch (err) {
    console.warn('Name attempt 1 failed:', err.message);
  }

  // Attempt 2: retry with a stricter, shorter prompt
  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 128,
      messages: [{
        role: 'user',
        content: `Give 5 short product feature names for: "${description.slice(0, 200)}". Reply with ONLY this JSON: {"names":["A","B","C","D","E"]}`
      }]
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.names && parsed.names.length > 0) {
        return res.json({ names: parsed.names });
      }
    }
  } catch (err) {
    console.warn('Name attempt 2 failed:', err.message);
  }

  // Last resort: derive names from description words — always returns something
  console.warn('Name generation falling back to local derivation');
  res.json({ names: fallbackNamesFromDescription(description) });
});

// ─── Route: Generate clarifying questions ─────────────────────────────────
app.post('/api/clarify', async (req, res) => {
  const { featureName, problemDescription, targetUser, productType } = req.body;

  if (!featureName || !problemDescription || !targetUser) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [
        {
          role: 'user',
          content: `I want to build a feature called "${featureName}".

Product type: ${productType || 'Not specified'}
Target user: ${targetUser}
Problem to solve: ${problemDescription}

Before writing the PRD, ask me exactly 3 clarifying questions that will most meaningfully improve the quality of the final document. Focus on the most critical unknowns — things that would fundamentally change the requirements.

Format your response as a JSON object with this exact structure:
{
  "questions": [
    { "id": 1, "question": "...", "why": "This matters because..." },
    { "id": 2, "question": "...", "why": "This matters because..." },
    { "id": 3, "question": "...", "why": "This matters because..." }
  ],
  "initialAssessment": "1-2 sentence candid reaction — the kind you'd share with a teammate, not a stakeholder. Be real."
}`
        }
      ]
    });

    const text = message.content[0].text;
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse response');
    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);
  } catch (err) {
    console.error('Clarify error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate questions' });
  }
});

// ─── Route: Generate full PRD ──────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const {
    featureName,
    problemDescription,
    targetUser,
    productType,
    clarifications  // array of { question, answer }
  } = req.body;

  if (!featureName || !problemDescription || !targetUser) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const clarificationText = clarifications && clarifications.length > 0
    ? clarifications.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n')
    : 'No additional clarifications provided.';

  // Set headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await client.messages.stream({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [
        {
          role: 'user',
          content: `Write a PRD for the following feature.

## Feature Brief
Feature name: ${featureName}
Product type: ${productType || 'Not specified'}
Target user: ${targetUser}
Problem to solve: ${problemDescription}

## Clarifications
${clarificationText}

## Instructions
Write this like a senior PM who actually cares. Be specific, direct, and useful. Plain language throughout. Don't pad, don't hedge everything, don't repeat the brief back at the reader.

**Most importantly: only include sections that this feature actually warrants.** A simple internal tool might need 4 sections. A complex consumer feature might need 8. Let the feature decide — don't force every section just to look thorough. A tight, honest 5-section PRD beats a bloated 10-section one every time.

Here are the sections available to you. Pick the ones that add real value for this specific feature:

- **Problem Statement** — what's broken, for whom, and why it matters now
- **Goals & Success Metrics** — concrete, measurable outcomes (not vibes)
- **Non-Goals** — what this explicitly doesn't do (only include if scope creep is a real risk)
- **User Stories** — as a [user], I want to... (include if the feature has meaningful user journeys)
- **Functional Requirements** — specific, testable requirements
- **Acceptance Criteria** — what "done" actually looks like
- **Edge Cases & Error States** — what could go wrong (include if the feature has real complexity)
- **Dependencies & Assumptions** — things that must be true for this to ship (include if relevant)
- **Open Questions** — unresolved decisions that need answers before dev starts (always include if any exist)
- **PM Notes** — honest risks, ways this could fail, things to watch (always include)
- **Confidence Score** — X/10 with a plain explanation of what would raise or lower it (always include)

Start with the title, then write only the sections that matter. Number them as you go.`
        }
      ]
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Generate error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Specc is running at http://localhost:${PORT}\n`);
});
