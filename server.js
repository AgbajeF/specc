require('dotenv').config();
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
          content: `Write a complete, production-ready PRD for the following feature.

## Feature Brief
Feature name: ${featureName}
Product type: ${productType || 'Not specified'}
Target user: ${targetUser}
Problem to solve: ${problemDescription}

## Clarifications
${clarificationText}

## Instructions
Write this like a senior PM who actually cares — specific, direct, and useful. Use plain language. Don't pad with fluff, don't hedge everything, and don't repeat the brief back at the reader. Every sentence should earn its place.

---

# ${featureName} — Product Requirements Document

## 1. Problem Statement
[What problem are we solving, for whom, and why now? Include current pain points.]

## 2. Goals & Success Metrics
[3–5 concrete, measurable goals. Format as: Goal → Metric → Target]

## 3. Non-Goals (Out of Scope)
[What this feature explicitly does NOT do. Be ruthless.]

## 4. User Stories
[Format: As a [user type], I want to [action] so that [outcome]. Include 4–6 stories.]

## 5. Functional Requirements
[Numbered list of specific, testable requirements. Group by area if needed.]

## 6. Acceptance Criteria
[Bullet checklist: "Done means..." — what must be true before this ships?]

## 7. Edge Cases & Error States
[What could go wrong? How should the product handle it?]

## 8. Open Questions
[Unresolved decisions that need an answer before or during development.]

## 9. PM Coaching Notes
[1–3 honest observations: risks, things to watch out for, ways this could fail. Be direct.]

## 10. Confidence Score
[Rate your confidence in this PRD: X/10. Explain what would raise or lower it.]

---

Write the full PRD now.`
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
