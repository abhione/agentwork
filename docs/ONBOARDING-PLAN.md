# AgentWork Onboarding Flow — Design Plan

## Overview

When a user hires an AI Employee, they currently get a generic soul prompt based on the persona template. The goal is to add a **contextual onboarding flow** that asks job-specific questions to customize the agent's `SOUL.md`, `AGENTS.md`, and working directives.

This transforms a generic "SDR agent" into "YOUR SDR agent who knows your ICP, product, competitors, and working style."

## Flow Architecture

```
Interview → Hire Click → Onboarding Wizard → Deploy w/ Custom Config
                              ↓
                    [Step 1: Job Context]
                    [Step 2: Working Style]
                    [Step 3: Knowledge Base]
                    [Step 4: Guardrails]
                              ↓
                    Generate Custom SOUL.md
                    Generate Custom AGENTS.md
                    Seed initial MEMORY.md
```

## Onboarding Steps

### Step 1: Job Context (Role-Specific)

Questions vary by persona category. Examples:

**SDR / Sales:**
- What's your product/service in one sentence?
- Who's your ideal customer? (title, company size, industry)
- What pain point does your product solve?
- Who are your top 3 competitors?
- What's your current sales motion? (PLG, enterprise, SMB)
- Link to your website/product page

**Customer Success:**
- What product are you supporting?
- What does "success" look like for your customers?
- What are the top 3 reasons customers churn?
- What's your typical customer journey/onboarding flow?
- What tools do you use? (CRM, support tickets, etc.)

**Research Analyst:**
- What industry/market are you focused on?
- What types of research do you typically need?
- What are the key questions you need answered regularly?
- What sources do you trust most?
- Who will consume the research output?

**Recruiter:**
- What roles are you typically hiring for?
- What's your company culture in 3 words?
- What do you consider "top talent" for your roles?
- What's your hiring process look like?
- What are your non-negotiable requirements?

**Content Creator:**
- What's your brand voice? (3-5 adjectives)
- Who's your target audience?
- What platforms do you publish on?
- What content has performed best for you?
- Link to brand guidelines or examples

### Step 2: Working Style

Universal questions:

- How do you prefer to communicate? (detailed updates vs. just results)
- How often should I check in with you? (async, daily standup, only when blocked)
- What decisions can I make autonomously vs. need approval?
- What's your timezone and working hours?
- How should I handle urgent issues?

### Step 3: Knowledge Base (Optional)

- Upload any relevant documents (product one-pagers, competitor research, etc.)
- Link to external resources (Notion, Google Docs, etc.)
- Paste in any specific context (email templates, call scripts, etc.)

### Step 4: Guardrails

- What should I NEVER do? (e.g., "Never promise discounts", "Never share pricing")
- What approvals do I need before external communication?
- Are there any compliance/legal constraints?
- Anything else I should know?

## Generated Files

### SOUL.md Updates

The base persona `soulPrompt` gets extended with:

```markdown
## My Specific Context

### About {Company}
{Product description}

### My Target Audience
{ICP details}

### Competitive Landscape
{Competitor notes}

### What Success Looks Like
{Success metrics/goals}

## Working With {User}

### Communication Style
{Preferences}

### Autonomy Level
{What I can do vs. need approval}

### Availability
{Timezone, hours, check-in cadence}

## Guardrails

### Never Do
{List of prohibited actions}

### Always Confirm Before
{Actions requiring approval}
```

### AGENTS.md Updates

Add a "Mission" section:

```markdown
## My Mission
{Role-specific mission based on onboarding answers}

## Key Resources
{Links/docs provided during onboarding}

## Daily Priorities
{Derived from job context}
```

### MEMORY.md Seed

Pre-populate with:

```markdown
## Company Context
{Product, ICP, competitors from onboarding}

## Working Relationship
{Communication preferences, autonomy level}

## Key Resources
{Links to docs, tools, references}
```

## UI Implementation

### Option A: Multi-Step Modal (Recommended)

Replace current simple hire dialog with a wizard:

```
┌─────────────────────────────────────────────────────┐
│ ← Back                                    Step 2/4  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🎯 Customize Nova for Your Business                │
│                                                     │
│  What's your product in one sentence?               │
│  ┌─────────────────────────────────────────────┐   │
│  │ AI-powered scheduling for healthcare       │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Who's your ideal customer?                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ VP of Operations at mid-size clinics       │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  (3 more questions...)                              │
│                                                     │
│              [Skip for Now]  [Continue →]           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Option B: Post-Deploy Onboarding Chat

Deploy immediately, then have the agent conduct its own onboarding interview:

```
Nova: Hey! I'm excited to get started. Before I dive in, 
      I'd love to understand your business better.
      
      What does your company do in one sentence?

User: We make AI scheduling for healthcare clinics.

Nova: Got it! And who's your ideal customer - the person 
      you want me reaching out to?

User: VP of Operations at mid-size medical practices

Nova: Perfect. I'm updating my context now... 
      [Updates SOUL.md, MEMORY.md]
      
      Two more quick questions...
```

**Pros:** More natural, agent can clarify/follow-up, less UI work
**Cons:** Slower to "real work", relies on agent quality

### Recommendation: Hybrid

1. **Minimal wizard (3-4 key questions)** during hire flow
2. **Agent self-onboarding** on first conversation for deeper context
3. Agent can prompt for missing info as it encounters gaps

## Technical Implementation

### New Files

```
lib/onboarding-questions.ts    # Question bank by persona category
lib/soul-generator.ts          # Takes answers → generates SOUL.md
components/onboarding-wizard.tsx  # Multi-step form UI
```

### API Changes

```typescript
// lib/boxclaws.ts - deployBox update
interface DeployOptions {
  name: string;
  persona: string;
  model: string;
  provider: string;
  // NEW:
  onboardingAnswers?: OnboardingAnswers;
}

// Box Claws generates files using answers
function generateAgentFiles(persona, answers) {
  // Merge base persona with custom context
}
```

### Box Claws Changes

```
src/soul-generator.ts          # New file: generates customized SOUL.md
src/personas.ts                # Update generateAgentFiles to accept answers
```

## Question Bank Structure

```typescript
interface OnboardingQuestion {
  id: string;
  step: 1 | 2 | 3 | 4;
  category: string[];  // Which persona categories this applies to
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'url' | 'file';
  label: string;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
}

const QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'product_description',
    step: 1,
    category: ['Sales', 'Marketing', 'Customer Success'],
    type: 'textarea',
    label: "What's your product/service?",
    placeholder: "AI-powered scheduling software for healthcare...",
    required: true,
    helpText: "One paragraph is perfect. This helps me understand what I'm selling/supporting."
  },
  // ...
];
```

## Success Metrics

- **Completion rate:** % of hires that complete onboarding
- **Time to first task:** How long until agent completes meaningful work
- **Relevance score:** User rates how well agent understood their context (1-5)
- **Customization depth:** Average # of questions answered

## Phase 1 Scope (MVP)

1. Add 4-step wizard to hire dialog
2. Implement question bank for top 4 persona categories
3. Generate customized SOUL.md from answers
4. Seed MEMORY.md with company context
5. Store onboarding answers for re-deployment

## Phase 2

1. Agent self-onboarding for deeper context
2. Document upload / URL scraping
3. Import from existing tools (CRM, Notion, etc.)
4. Onboarding templates (save & reuse across agents)

---

## Files to Create/Modify

### New Files
- `lib/onboarding-questions.ts` — Question bank
- `lib/soul-generator.ts` — Custom SOUL.md generation
- `components/onboarding-wizard.tsx` — Multi-step form

### Modified Files
- `components/hire-dialog.tsx` — Integrate wizard
- `lib/boxclaws.ts` — Pass answers to deploy
- `lib/talents.ts` — Add persona category for question filtering

### Box Claws Changes
- `src/personas.ts` — Update `generateAgentFiles` to accept onboarding answers
- `src/soul-generator.ts` — New file for customized generation

---

*Ready to build. Start with onboarding-questions.ts.*
