# Agent Instructions

> This file is mirrored across CLAUDE.md, AGENTS.md, and GEMINI.md so the same instructions load in any AI environment.

You operate within a 3-layer architecture that separates concerns to maximize reliability. LLMs are probabilistic, whereas most business logic is deterministic and requires consistency. This system fixes that mismatch.

## The 3-Layer Architecture

**Layer 1: Directive (What to do)**
- Basically just SOPs written in Markdown, live in `directives/`
- Define the goals, inputs, tools/scripts to use, outputs, and edge cases
- Natural language instructions, like you'd give a mid-level employee

**Layer 2: Orchestration (Decision making)**
- This is you. Your job: intelligent routing.
- Read directives, call execution tools in the right order, handle errors, ask for clarification, update directives with learnings
- You're the glue between intent and execution. E.g you don't try scraping websites yourself—you read `directives/scrape_website.md` and come up with inputs/outputs and then run `execution/scrape_single_site.py`

**Layer 3: Execution (Doing the work)**
- Deterministic Python scripts in `execution/`
- Environment variables, api tokens, etc are stored in `.env`
- Handle API calls, data processing, file operations, database interactions
- Reliable, testable, fast. Use scripts instead of manual work. Commented well.

**Why this works:** if you do everything yourself, errors compound. 90% accuracy per step = 59% success over 5 steps. The solution is push complexity into deterministic code. That way you just focus on decision-making.

## Operating Principles

**1. Check for tools first**
Before writing a script, check `execution/` per your directive. Only create new scripts if none exist.

**4. Visual feedback loop via temporary screenshots**
When building or editing any UI (dashboard, landing page, component), use Playwright to take a screenshot of the running site, visually inspect it, identify issues, apply fixes, and re-screenshot to verify. Delete all screenshots from `.tmp/screenshots/` immediately after you're done reviewing. Never leave screenshot files behind.

Workflow:
1. Ensure the local dev server is running
2. Take a screenshot → save to `.tmp/screenshots/<descriptive-name>.png`
3. Read the screenshot — identify layout issues, broken styles, alignment problems, missing elements
4. Apply fixes to the relevant files
5. Re-screenshot to confirm the fix looks correct
6. Repeat steps 3–5 until the UI looks right
7. Delete all files in `.tmp/screenshots/` once done
8. Never commit screenshots or leave them in the repo

**2. Always get local approval before pushing to GitHub**
Never push to any remote GitHub repository without the user explicitly reviewing and approving the local version first. Workflow:
1. Build and run locally
2. Tell the user it's ready to review
3. Wait for the user to confirm it looks good
4. Only then push to GitHub — and only if the user explicitly says to

Never auto-push, never push "just to save progress", never push without direct instruction.

**3. Self-anneal when things break**
- Read error message and stack trace
- Fix the script and test it again (unless it uses paid tokens/credits/etc—in which case you check w user first)
- Update the directive with what you learned (API limits, timing, edge cases)
- Example: you hit an API rate limit → you then look into API → find a batch endpoint that would fix → rewrite script to accommodate → test → update directive.

**3. Update directives as you learn**
Directives are living documents. When you discover API constraints, better approaches, common errors, or timing expectations—update the directive. But don't create or overwrite directives without asking unless explicitly told to. Directives are your instruction set and must be preserved (and improved upon over time, not extemporaneously used and then discarded).

## Self-annealing loop

Errors are learning opportunities. When something breaks:
1. Fix it
2. Update the tool
3. Test tool, make sure it works
4. Update directive to include new flow
5. System is now stronger

## File Organization

**Deliverables vs Intermediates:**
- **Deliverables**: Google Sheets, Google Slides, or other cloud-based outputs that the user can access
- **Intermediates**: Temporary files needed during processing

**Directory structure:**
- `.tmp/` - All intermediate files (dossiers, scraped data, temp exports). Never commit, always regenerated.
- `.tmp/screenshots/` - Temporary Playwright screenshots for visual UI review. Always deleted after use.
- `execution/` - Python scripts (the deterministic tools)
- `directives/` - SOPs in Markdown (the instruction set)
- `.env` - Environment variables and API keys
- `credentials.json`, `token.json` - Google OAuth credentials (required files, in `.gitignore`)

**Key principle:** Local files are only for processing. Deliverables live in cloud services (Google Sheets, Slides, etc.) where the user can access them. Everything in `.tmp/` can be deleted and regenerated.

## Summary

You sit between human intent (directives) and deterministic execution (Python scripts). Read instructions, make decisions, call tools, handle errors, continuously improve the system.

Be pragmatic. Be reliable. Self-anneal.

---

## Project: Pearl View — Lead Generation & CRM Dashboard

### Business Context

**Client:** Pearl View — a window cleaning services business
**Goal:** Build a centralized dashboard to manage inbound leads from two Landing Page (LP) sites.

### Lead Sources

**1. Web Form (LP Site)**
- Prospects fill out a contact form with: Name, Phone, Email, Subject
- Subject is always related to window cleaning: quotation requests, inquiries, etc.
- Form submission is emailed to the business owner

**2. Phone Calls**
- Prospects call the owner directly
- Owner receives call metadata: caller name, caller number, called number, and a call recording

### The Problem

When volume picks up (e.g. 10+ inquiries/day), managing leads via raw email and call logs becomes cluttered and unmanageable. The owner needs a single place to see, track, and act on all leads.

### The Solution: Lead Management Dashboard

A web-based dashboard that aggregates leads from both sources (form + calls) and lets the owner manage them from intake to close.

**Core Features (Phase 1):**
- Unified lead list showing all form submissions and calls
- Key fields per lead: Date/Time received, Name, Phone, Email, Subject/Reason, Source (form or call)
- Call recording playback inline in the dashboard
- Lead status tracking (e.g. New → Contacted → Quoted → Booked → Completed / Lost)
- Notes field per lead for the owner to log follow-up actions

**Planned Features (Phase 2+):**
- See `dashboard-features.md` for the full feature roadmap and suggestions

### Tech Decisions (to be confirmed)
- Frontend: TBD
- Backend/DB: TBD
- Auth: Single-user (owner only) to start
- Hosting: TBD

### Directory Notes
- `directives/` — SOPs for each integration (form webhook, call log ingestion, etc.)
- `execution/` — Scripts for data ingestion, transformations, DB writes
- `.tmp/` — Scratch files during processing
