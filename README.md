# Specc — AI PRD Generator

> Describe a feature — or ask what to build. Get asked the right questions. Walk away with a PRD your team can actually ship from.

Most PRD templates are just fancy documents waiting to be filled in wrong. Specc is different — it has a conversation with you first, identifies what you haven't thought through yet, and then writes the document. The output is sized to what your feature actually needs: a simple internal tool might get 4 focused sections, a complex consumer feature might get 8. No padding, no sections included just to look thorough.

Already know what you're building? Specc takes you straight into the spec. Not sure yet? Ask "what should I add to my product?" and Specc shifts into discovery mode — asks the right questions, offers opinionated ideas, and when you land on something, picks up the spec flow from there. No mode switching, no configuration. It just reads the room.

Built by a PM, for PMs.

---

## How it works

**1. Describe your feature — or ask what to build**
No forms, no dropdowns, no suggestion chips. Describe what you're building, or ask "what features should I add to my product?" Specc detects the intent automatically. If you're vague, it'll ask a targeted follow-up. If you're in discovery mode, it'll ask about your users and pain points before surfacing ideas.

**2. Name it — or let Specc suggest one**
Specc asks if you already have a name. If you do, great. If not, it generates 5 options based on your description — pick one, or use it as a starting point. Takes 10 seconds either way.

**3. Answer a few targeted questions**
Before writing anything, Specc asks clarifying questions based on your specific idea. These are the gaps that would have caused a revision cycle later.

**4. Get your PRD — live, as it's written**
Output starts streaming within seconds. Specc writes only the sections your feature actually warrants — no bloat. Copy it, download as Markdown, or export to PDF when it's done.

---

## What's in the PRD

Specc doesn't force a fixed template. It picks the sections your feature actually needs — no more, no less. Here's the full menu it draws from:

| Section | What it covers | Always included? |
|---|---|---|
| Problem Statement | The pain, who feels it, and why it matters now | Yes |
| Goals & Success Metrics | Measurable outcomes — not vibes | Yes |
| Non-Goals | What this feature explicitly doesn't do | Only if scope creep is a risk |
| User Stories | As a [user], I want to… | Only if meaningful journeys exist |
| Functional Requirements | Specific, testable requirements | Yes |
| Acceptance Criteria | What "done" actually looks like | Yes |
| Edge Cases & Error States | What could go wrong and how to handle it | Only if real complexity exists |
| Dependencies & Assumptions | What must be true for this to ship | Only if relevant |
| Open Questions | Decisions that need answers before dev starts | If any exist |
| PM Notes | Honest risks and ways this could fail | Yes |
| Confidence Score | How solid this PRD is, and what would improve it | Yes |

---

## Stack

- **Backend:** Node.js + Express
- **AI:** Anthropic Claude API (`claude-opus-4-5`) with prompt caching and real-time streaming
- **Frontend:** Vanilla JS, HTML/CSS — no framework, no build step
- **Export:** Copy to clipboard, Markdown download, Print/PDF

---

## Running locally

**Prerequisites:** Node.js 18+, an [Anthropic API key](https://console.anthropic.com)

```bash
git clone https://github.com/AgbajeF/specc.git
cd specc
npm install
```

Create a `.env` file:

```
ANTHROPIC_API_KEY=your_key_here
PORT=3000
```

Start the server:

```bash
npm start
```

Open `http://localhost:3000` and start a conversation.

---

## Why I built this

Writing PRDs from scratch is slow. Using a template without context produces documents that don't reflect the actual complexity of the problem. And most AI writing tools just fill in a fixed template — which means you get 10 sections whether your feature warrants 4 or 12, and half of them are padded with generic copy.

The gap between "we need a feature" and "here's a document engineering can work from" is where a lot of product velocity gets lost.

Specc is an attempt to close that gap — not by automating away the PM's judgment, but by making sure that judgment gets captured in the right level of detail. A quick internal tool should get a tight, focused doc. A complex consumer feature should get the full treatment. The output should match the feature, not the template.

---

## Author

**Farouk Agbaje** — Product Manager, New York, NY

[Portfolio](https://AgbajeF.github.io) · [GitHub](https://github.com/AgbajeF) · [LinkedIn](https://linkedin.com/in/faroukagbaje)
