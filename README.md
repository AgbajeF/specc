# Specc — AI PRD Generator

> Describe a feature. Get asked the right questions. Walk away with a PRD your team can actually ship from.

Most PRD templates are just fancy documents waiting to be filled in wrong. Specc is different — it has a conversation with you first, identifies what you haven't thought through yet, and then writes the document. The result is a structured, 10-section PRD that reflects real decisions, not generic boilerplate.

Built by a PM, for PMs.

---

## How it works

**1. Describe your feature**
No forms. Just a chat. Tell Specc what you're building — rough is fine.

**2. Answer a few targeted questions**
Before writing anything, Specc asks 3 clarifying questions based on your specific idea. These are the gaps that would have caused a revision cycle later.

**3. Get your PRD — live, as it's written**
The document streams in real time across 10 structured sections. Copy it, download it as Markdown, or export to PDF.

---

## What's in the PRD

| Section | What it covers |
|---|---|
| Problem Statement | The pain, who feels it, and why it matters now |
| Goals & Success Metrics | Measurable outcomes — not vibes |
| Non-Goals | What this feature explicitly doesn't do |
| User Stories | As a [user], I want to… |
| Functional Requirements | Specific, testable requirements |
| Acceptance Criteria | What "done" actually looks like |
| Edge Cases & Error States | What could go wrong and how to handle it |
| Open Questions | Decisions that need answers before dev starts |
| PM Coaching Notes | Honest risks and things to watch out for |
| Confidence Score | How solid this PRD is, and what would improve it |

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

Writing PRDs from scratch is slow. Using a template without context produces documents that don't reflect the actual complexity of the problem. The gap between "we need a feature" and "here's a document engineering can work from" is where a lot of product velocity gets lost.

Specc is an attempt to close that gap — not by automating away the PM's judgment, but by making sure that judgment gets captured in the document.

---

## Author

**Farouk Agbaje** — Product Manager, New York, NY

[Portfolio](https://AgbajeF.github.io) · [GitHub](https://github.com/AgbajeF) · [LinkedIn](https://linkedin.com/in/faroukagbaje)
