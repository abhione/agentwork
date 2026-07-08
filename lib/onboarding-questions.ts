/**
 * Onboarding Questions Bank
 * 
 * Role-specific questions to customize AI Employee context.
 * Questions are filtered by persona category and presented in a wizard flow.
 */

export type OnboardingStep = 1 | 2 | 3 | 4;

export interface OnboardingQuestion {
  id: string;
  step: OnboardingStep;
  categories: string[];  // Which persona categories this applies to. Empty = all.
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'url';
  label: string;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  options?: { value: string; label: string }[];
}

export interface OnboardingAnswers {
  [questionId: string]: string | string[];
}

// Step 1: Job Context (role-specific)
// Step 2: Working Style (universal)
// Step 3: Knowledge Base (optional)
// Step 4: Guardrails (universal)

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  // ============================================
  // STEP 1: JOB CONTEXT — Role-specific
  // ============================================
  
  // Universal job context
  {
    id: 'website_url',
    step: 1,
    categories: [],
    type: 'url',
    label: 'Company website',
    placeholder: 'https://acme.com',
    helpText: "Drop your URL and I'll read your site to pre-fill the answers below.",
  },
  {
    id: 'company_name',
    step: 1,
    categories: [],
    type: 'text',
    label: "What's your company name?",
    placeholder: 'Acme Corp',
    required: true,
  },
  {
    id: 'product_description',
    step: 1,
    categories: [],
    type: 'textarea',
    label: "What does your company do? (1-2 sentences)",
    placeholder: 'We make AI-powered scheduling software for healthcare clinics...',
    required: true,
    helpText: "This helps me understand what I'm working on.",
  },
  
  // Sales-specific
  {
    id: 'icp_description',
    step: 1,
    categories: ['Sales'],
    type: 'textarea',
    label: "Who's your ideal customer?",
    placeholder: 'VP of Operations at mid-size healthcare clinics (50-500 employees)',
    required: true,
    helpText: "Job title, company size, industry — the more specific the better.",
  },
  {
    id: 'pain_points',
    step: 1,
    categories: ['Sales'],
    type: 'textarea',
    label: "What problems does your product solve?",
    placeholder: 'Manual scheduling takes 10+ hours/week, double-bookings, no-shows...',
    required: true,
  },
  {
    id: 'competitors',
    step: 1,
    categories: ['Sales', 'Research'],
    type: 'textarea',
    label: "Who are your main competitors?",
    placeholder: 'Calendly, Acuity, traditional pen-and-paper',
  },
  {
    id: 'sales_motion',
    step: 1,
    categories: ['Sales'],
    type: 'select',
    label: "What's your sales motion?",
    options: [
      { value: 'plg', label: 'Product-led growth (self-serve)' },
      { value: 'smb', label: 'SMB sales (quick cycles)' },
      { value: 'mid_market', label: 'Mid-market (1-3 month cycles)' },
      { value: 'enterprise', label: 'Enterprise (3-12 month cycles)' },
    ],
  },
  {
    id: 'outreach_channels',
    step: 1,
    categories: ['Sales'],
    type: 'multiselect',
    label: "Which outreach channels should I use?",
    options: [
      { value: 'email', label: 'Cold email' },
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'phone', label: 'Cold calling' },
      { value: 'social', label: 'Social media' },
    ],
  },
  
  // Customer Success
  {
    id: 'success_metrics',
    step: 1,
    categories: ['Customer Success'],
    type: 'textarea',
    label: "What does 'success' look like for your customers?",
    placeholder: 'Reduced scheduling time by 50%, fewer no-shows, happier patients...',
    required: true,
  },
  {
    id: 'churn_reasons',
    step: 1,
    categories: ['Customer Success'],
    type: 'textarea',
    label: "Top reasons customers leave?",
    placeholder: 'Poor onboarding, missing features, price...',
  },
  {
    id: 'customer_journey',
    step: 1,
    categories: ['Customer Success'],
    type: 'textarea',
    label: "What's your typical customer onboarding flow?",
    placeholder: 'Week 1: Setup, Week 2: Training, Week 3: Go-live...',
  },
  
  // Research
  {
    id: 'research_focus',
    step: 1,
    categories: ['Research'],
    type: 'textarea',
    label: "What areas do you need researched?",
    placeholder: 'Market trends in healthcare SaaS, competitor feature analysis...',
    required: true,
  },
  {
    id: 'trusted_sources',
    step: 1,
    categories: ['Research'],
    type: 'textarea',
    label: "What sources do you trust most?",
    placeholder: 'Gartner, CB Insights, company filings, industry publications...',
  },
  {
    id: 'research_consumers',
    step: 1,
    categories: ['Research'],
    type: 'text',
    label: "Who will use the research output?",
    placeholder: 'Executive team, product managers, investors...',
  },
  
  // Recruiting
  {
    id: 'typical_roles',
    step: 1,
    categories: ['Recruiting'],
    type: 'textarea',
    label: "What roles are you typically hiring for?",
    placeholder: 'Senior engineers, product managers, sales reps...',
    required: true,
  },
  {
    id: 'company_culture',
    step: 1,
    categories: ['Recruiting'],
    type: 'text',
    label: "Describe your company culture in 3-5 words",
    placeholder: 'Fast-paced, collaborative, remote-first',
  },
  {
    id: 'hiring_nonnegotiables',
    step: 1,
    categories: ['Recruiting'],
    type: 'textarea',
    label: "What are your non-negotiable requirements?",
    placeholder: 'Must be US-based, need 5+ years experience, specific certifications...',
  },
  
  // Marketing / Content
  {
    id: 'brand_voice',
    step: 1,
    categories: ['Marketing'],
    type: 'textarea',
    label: "How would you describe your brand voice?",
    placeholder: 'Professional but friendly, data-driven, slightly irreverent...',
    required: true,
  },
  {
    id: 'target_audience',
    step: 1,
    categories: ['Marketing'],
    type: 'textarea',
    label: "Who's your target audience for content?",
    placeholder: 'Healthcare administrators, clinic owners, practice managers...',
    required: true,
  },
  {
    id: 'content_platforms',
    step: 1,
    categories: ['Marketing'],
    type: 'multiselect',
    label: "Which platforms do you publish on?",
    options: [
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'twitter', label: 'Twitter/X' },
      { value: 'blog', label: 'Company blog' },
      { value: 'newsletter', label: 'Email newsletter' },
      { value: 'youtube', label: 'YouTube' },
    ],
  },
  
  // Operations
  {
    id: 'ops_tools',
    step: 1,
    categories: ['Operations'],
    type: 'textarea',
    label: "What tools do you use for operations?",
    placeholder: 'Notion, Slack, Salesforce, Zapier, Google Sheets...',
    required: true,
  },
  {
    id: 'recurring_tasks',
    step: 1,
    categories: ['Operations'],
    type: 'textarea',
    label: "What repetitive tasks take up the most time?",
    placeholder: 'Weekly reports, data entry, status updates, invoice processing...',
    required: true,
  },
  
  // ============================================
  // STEP 2: WORKING STYLE — Universal
  // ============================================
  
  {
    id: 'communication_style',
    step: 2,
    categories: [],
    type: 'select',
    label: "How do you prefer updates?",
    options: [
      { value: 'detailed', label: 'Detailed updates with context' },
      { value: 'summary', label: 'Brief summaries, details on request' },
      { value: 'results_only', label: 'Just the results, skip the process' },
    ],
    required: true,
  },
  {
    id: 'checkin_frequency',
    step: 2,
    categories: [],
    type: 'select',
    label: "How often should I check in?",
    options: [
      { value: 'realtime', label: 'Real-time as things happen' },
      { value: 'daily', label: 'Daily standup/summary' },
      { value: 'weekly', label: 'Weekly recap' },
      { value: 'blocked_only', label: 'Only when blocked or done' },
    ],
    required: true,
  },
  {
    id: 'autonomy_level',
    step: 2,
    categories: [],
    type: 'select',
    label: "How much autonomy should I have?",
    options: [
      { value: 'high', label: 'High — make decisions, ask forgiveness not permission' },
      { value: 'medium', label: 'Medium — decide routine stuff, check on big moves' },
      { value: 'low', label: 'Low — check with me before most actions' },
    ],
    required: true,
    helpText: "I'll always confirm before external communications or irreversible actions.",
  },
  {
    id: 'timezone',
    step: 2,
    categories: [],
    type: 'select',
    label: "What's your timezone?",
    options: [
      { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
      { value: 'America/Denver', label: 'Mountain (MT)' },
      { value: 'America/Chicago', label: 'Central (CT)' },
      { value: 'America/New_York', label: 'Eastern (ET)' },
      { value: 'Europe/London', label: 'UK (GMT/BST)' },
      { value: 'Europe/Berlin', label: 'Central Europe (CET)' },
      { value: 'Asia/Tokyo', label: 'Japan (JST)' },
      { value: 'other', label: 'Other' },
    ],
    required: true,
  },
  {
    id: 'working_hours',
    step: 2,
    categories: [],
    type: 'text',
    label: "Your typical working hours?",
    placeholder: '9am-6pm, or "async" if flexible',
  },
  {
    id: 'urgent_handling',
    step: 2,
    categories: [],
    type: 'textarea',
    label: "How should I handle urgent issues?",
    placeholder: 'Tag me immediately, try to solve first then escalate, use specific channel...',
  },
  
  // ============================================
  // STEP 3: KNOWLEDGE BASE — Optional
  // ============================================
  
  {
    id: 'key_documents',
    step: 3,
    categories: [],
    type: 'textarea',
    label: "Any key documents or resources I should know about?",
    placeholder: 'Link to pitch deck, product one-pager, competitor analysis, brand guidelines...',
    helpText: "Paste URLs or describe where to find them. I'll reference these in my work.",
  },
  {
    id: 'templates',
    step: 3,
    categories: ['Sales', 'Marketing', 'Recruiting'],
    type: 'textarea',
    label: "Any templates or examples I should follow?",
    placeholder: 'Paste your best outreach email, favorite social post, call script...',
    helpText: "Examples help me match your existing style.",
  },
  {
    id: 'tools_access',
    step: 3,
    categories: [],
    type: 'textarea',
    label: "What tools will I have access to?",
    placeholder: 'CRM (Salesforce), email (Gmail), calendar, Slack...',
  },
  
  // ============================================
  // STEP 4: GUARDRAILS — Universal
  // ============================================
  
  {
    id: 'never_do',
    step: 4,
    categories: [],
    type: 'textarea',
    label: "What should I NEVER do?",
    placeholder: "Never promise discounts, don't share pricing without approval, no competitor bashing...",
    helpText: "Hard rules I'll always follow.",
  },
  {
    id: 'approval_required',
    step: 4,
    categories: [],
    type: 'textarea',
    label: "What needs your approval before I act?",
    placeholder: 'Sending external emails, scheduling meetings, making commitments...',
  },
  {
    id: 'compliance_notes',
    step: 4,
    categories: [],
    type: 'textarea',
    label: "Any compliance or legal constraints?",
    placeholder: 'HIPAA requirements, NDA considerations, geographic restrictions...',
  },
  {
    id: 'other_context',
    step: 4,
    categories: [],
    type: 'textarea',
    label: "Anything else I should know?",
    placeholder: 'Team dynamics, ongoing initiatives, sensitive topics...',
  },
];

/**
 * Get questions for a specific persona category and step
 */
export function getQuestionsForPersona(category: string, step?: OnboardingStep): OnboardingQuestion[] {
  return ONBOARDING_QUESTIONS.filter(q => {
    // Filter by step if provided
    if (step !== undefined && q.step !== step) return false;
    
    // Include if question applies to all categories (empty array)
    if (q.categories.length === 0) return true;
    
    // Include if question applies to this category
    return q.categories.includes(category);
  });
}

/**
 * Get all questions for a step, regardless of category
 */
export function getQuestionsForStep(step: OnboardingStep): OnboardingQuestion[] {
  return ONBOARDING_QUESTIONS.filter(q => q.step === step);
}

/**
 * Get step metadata
 */
export const STEP_META: Record<OnboardingStep, { title: string; description: string }> = {
  1: {
    title: 'Job Context',
    description: "Tell me about your business and what you need help with.",
  },
  2: {
    title: 'Working Style',
    description: "How should I communicate and operate?",
  },
  3: {
    title: 'Knowledge Base',
    description: "Resources and context to do my best work.",
  },
  4: {
    title: 'Guardrails',
    description: "Rules and boundaries I should follow.",
  },
};

/**
 * Calculate completion for a step
 */
export function getStepCompletion(
  answers: OnboardingAnswers,
  category: string,
  step: OnboardingStep
): { answered: number; required: number; total: number } {
  const questions = getQuestionsForPersona(category, step);
  const required = questions.filter(q => q.required);
  
  let answeredCount = 0;
  let requiredAnswered = 0;
  
  for (const q of questions) {
    const answer = answers[q.id];
    const hasAnswer = Array.isArray(answer) ? answer.length > 0 : !!answer?.toString().trim();
    if (hasAnswer) {
      answeredCount++;
      if (q.required) requiredAnswered++;
    }
  }
  
  return {
    answered: answeredCount,
    required: requiredAnswered,
    total: questions.length,
  };
}
