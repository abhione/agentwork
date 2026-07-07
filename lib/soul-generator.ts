/**
 * Soul Generator
 * 
 * Takes onboarding answers and generates customized SOUL.md, AGENTS.md, and MEMORY.md
 * for a deployed AI Employee.
 */

import type { Talent } from './talents';
import type { OnboardingAnswers } from './onboarding-questions';

interface GeneratedFiles {
  'SOUL.md': string;
  'AGENTS.md': string;
  'MEMORY.md': string;
  'memory/NOW.md': string;
}

/**
 * Generate all agent workspace files from talent + onboarding answers
 */
export function generateAgentFiles(talent: Talent, answers: OnboardingAnswers): GeneratedFiles {
  const agentName = talent.name.split(' ')[0]; // First name only
  const companyName = (answers.company_name as string) || 'the company';
  const today = new Date().toISOString().split('T')[0];
  
  return {
    'SOUL.md': generateSoulMd(talent, answers, agentName, companyName),
    'AGENTS.md': generateAgentsMd(talent, answers, agentName),
    'MEMORY.md': generateMemoryMd(talent, answers, companyName, today),
    'memory/NOW.md': generateNowMd(agentName),
  };
}

function generateSoulMd(
  talent: Talent,
  answers: OnboardingAnswers,
  agentName: string,
  companyName: string
): string {
  const sections: string[] = [];
  
  // Header
  sections.push(`# SOUL.md - Who You Are

*Your name is ${agentName}. You are ${talent.role} at ${companyName}.*`);

  // Base persona soul prompt
  sections.push(talent.soulPrompt);

  // Divider
  sections.push(`---

## My Specific Context`);

  // Company context
  const aboutCompany: string[] = [];
  if (answers.company_name) aboutCompany.push(`- **Company:** ${answers.company_name}`);
  if (answers.product_description) aboutCompany.push(`- **What we do:** ${answers.product_description}`);
  if (answers.website_url) aboutCompany.push(`- **Website:** ${answers.website_url}`);
  
  if (aboutCompany.length > 0) {
    sections.push(`### About ${companyName}
${aboutCompany.join('\n')}`);
  }

  // Role-specific context
  const roleContext: string[] = [];
  
  // Sales
  if (answers.icp_description) roleContext.push(`### Target Customer (ICP)
${answers.icp_description}`);
  if (answers.pain_points) roleContext.push(`### Problems We Solve
${answers.pain_points}`);
  if (answers.competitors) roleContext.push(`### Competitive Landscape
${answers.competitors}`);
  if (answers.sales_motion) roleContext.push(`### Sales Motion
${formatSelectAnswer(answers.sales_motion as string, {
    plg: 'Product-led growth — users self-serve, I nurture and convert',
    smb: 'SMB sales — quick cycles, volume play',
    mid_market: 'Mid-market — 1-3 month sales cycles, relationship building',
    enterprise: 'Enterprise — long cycles, multi-threaded, strategic',
  })}`);
  if (answers.outreach_channels) {
    const channels = answers.outreach_channels as string[];
    roleContext.push(`### My Outreach Channels
${channels.map(c => `- ${formatChannel(c)}`).join('\n')}`);
  }
  
  // Customer Success
  if (answers.success_metrics) roleContext.push(`### What Customer Success Looks Like
${answers.success_metrics}`);
  if (answers.churn_reasons) roleContext.push(`### Why Customers Leave (So I Can Prevent It)
${answers.churn_reasons}`);
  if (answers.customer_journey) roleContext.push(`### Customer Journey
${answers.customer_journey}`);
  
  // Research
  if (answers.research_focus) roleContext.push(`### Research Focus Areas
${answers.research_focus}`);
  if (answers.trusted_sources) roleContext.push(`### Trusted Sources
${answers.trusted_sources}`);
  if (answers.research_consumers) roleContext.push(`### Research Audience
${answers.research_consumers}`);
  
  // Recruiting
  if (answers.typical_roles) roleContext.push(`### Roles I'm Hiring For
${answers.typical_roles}`);
  if (answers.company_culture) roleContext.push(`### Our Culture
${answers.company_culture}`);
  if (answers.hiring_nonnegotiables) roleContext.push(`### Non-Negotiable Requirements
${answers.hiring_nonnegotiables}`);
  
  // Marketing
  if (answers.brand_voice) roleContext.push(`### Brand Voice
${answers.brand_voice}`);
  if (answers.target_audience) roleContext.push(`### Target Audience
${answers.target_audience}`);
  if (answers.content_platforms) {
    const platforms = answers.content_platforms as string[];
    roleContext.push(`### Content Platforms
${platforms.map(p => `- ${formatPlatform(p)}`).join('\n')}`);
  }
  
  // Operations
  if (answers.ops_tools) roleContext.push(`### Tools I Use
${answers.ops_tools}`);
  if (answers.recurring_tasks) roleContext.push(`### Tasks to Automate
${answers.recurring_tasks}`);
  
  if (roleContext.length > 0) {
    sections.push(roleContext.join('\n\n'));
  }

  // Working style section
  const workingStyle: string[] = [];
  
  sections.push(`---

## Working With My Human`);

  if (answers.communication_style) {
    workingStyle.push(`### Communication Style
${formatSelectAnswer(answers.communication_style as string, {
      detailed: 'Detailed updates with full context — I explain my thinking',
      summary: 'Brief summaries — details available on request',
      results_only: 'Just results — skip the process, show the outcome',
    })}`);
  }
  
  if (answers.checkin_frequency) {
    workingStyle.push(`### Check-in Cadence
${formatSelectAnswer(answers.checkin_frequency as string, {
      realtime: 'Real-time updates as things happen',
      daily: 'Daily standup/summary',
      weekly: 'Weekly recap',
      blocked_only: 'Only when blocked or task complete',
    })}`);
  }
  
  if (answers.autonomy_level) {
    workingStyle.push(`### Autonomy Level
${formatSelectAnswer(answers.autonomy_level as string, {
      high: 'High autonomy — I make decisions and ask forgiveness not permission',
      medium: 'Medium autonomy — routine decisions are mine, big moves need a check',
      low: 'Low autonomy — I check before most actions',
    })}`);
  }
  
  if (answers.timezone) {
    workingStyle.push(`### Timezone
${formatTimezone(answers.timezone as string)}`);
  }
  
  if (answers.working_hours) {
    workingStyle.push(`### Working Hours
${answers.working_hours}`);
  }
  
  if (answers.urgent_handling) {
    workingStyle.push(`### Urgent Issue Handling
${answers.urgent_handling}`);
  }
  
  if (workingStyle.length > 0) {
    sections.push(workingStyle.join('\n\n'));
  }

  // Guardrails section
  const guardrails: string[] = [];
  
  if (answers.never_do || answers.approval_required || answers.compliance_notes) {
    sections.push(`---

## Guardrails`);
  }
  
  if (answers.never_do) {
    guardrails.push(`### ❌ Never Do
${formatAsBullets(answers.never_do as string)}`);
  }
  
  if (answers.approval_required) {
    guardrails.push(`### ✋ Requires Approval
${formatAsBullets(answers.approval_required as string)}`);
  }
  
  if (answers.compliance_notes) {
    guardrails.push(`### ⚖️ Compliance Notes
${answers.compliance_notes}`);
  }
  
  if (guardrails.length > 0) {
    sections.push(guardrails.join('\n\n'));
  }

  // Footer
  sections.push(`---

*This file defines who I am. It was generated during onboarding and can be updated as I learn and grow.*`);

  return sections.join('\n\n');
}

function generateAgentsMd(
  talent: Talent,
  answers: OnboardingAnswers,
  agentName: string
): string {
  const companyName = (answers.company_name as string) || 'the company';
  
  let mission = '';
  switch (talent.category) {
    case 'Sales':
      mission = `Book qualified meetings with ideal customers and build pipeline for ${companyName}.`;
      break;
    case 'Customer Success':
      mission = `Ensure customers achieve their goals with ${companyName}'s product and grow with us.`;
      break;
    case 'Research':
      mission = `Provide actionable intelligence that drives strategic decisions at ${companyName}.`;
      break;
    case 'Recruiting':
      mission = `Find and attract exceptional talent to join ${companyName}.`;
      break;
    case 'Marketing':
      mission = `Create compelling content that grows ${companyName}'s audience and pipeline.`;
      break;
    case 'Operations':
      mission = `Eliminate toil and create operational leverage across ${companyName}.`;
      break;
    case 'Executive Support':
      mission = `Maximize productivity and strategic focus for ${companyName}'s leadership.`;
      break;
    default:
      mission = `Deliver exceptional work and drive results for ${companyName}.`;
  }

  const sections: string[] = [];
  
  sections.push(`# AGENTS.md - My Workspace

## Identity
- **Name:** ${agentName}
- **Role:** ${talent.role}
- **Emoji:** ${talent.emoji}
- **Company:** ${companyName}

## My Mission
${mission}`);

  // Key resources
  const resources: string[] = [];
  if (answers.website_url) resources.push(`- Company website: ${answers.website_url}`);
  if (answers.key_documents) resources.push(`- Key documents: ${answers.key_documents}`);
  if (answers.tools_access) resources.push(`- Tools I have access to: ${answers.tools_access}`);
  
  if (resources.length > 0) {
    sections.push(`## Key Resources
${resources.join('\n')}`);
  }

  // Templates/examples
  if (answers.templates) {
    sections.push(`## Reference Templates
${answers.templates}`);
  }

  // Standard workspace instructions
  sections.push(`## Every Session
1. Read \`SOUL.md\` — this is who I am
2. Read \`memory/NOW.md\` — what was happening last
3. Check recent messages for context

## Memory
- Daily notes go in \`memory/YYYY-MM-DD.md\`
- Important learnings go in \`MEMORY.md\`
- Keep \`memory/NOW.md\` updated during active work

## Safety
- Don't exfiltrate private data
- Ask before sending external communications
- When in doubt, ask`);

  // Other context
  if (answers.other_context) {
    sections.push(`## Additional Context
${answers.other_context}`);
  }

  sections.push(`---

*This is my workspace. Generated during onboarding.*`);

  return sections.join('\n\n');
}

function generateMemoryMd(
  talent: Talent,
  answers: OnboardingAnswers,
  companyName: string,
  today: string
): string {
  const sections: string[] = [];
  
  sections.push(`# MEMORY.md - Long-Term Memory

## About Me
- **Role:** ${talent.role}
- **Company:** ${companyName}
- **Hired:** ${today}`);

  // Company context
  if (answers.product_description || answers.icp_description || answers.competitors) {
    sections.push(`## Company Context`);
    if (answers.product_description) sections.push(`- **Product:** ${answers.product_description}`);
    if (answers.icp_description) sections.push(`- **ICP:** ${answers.icp_description}`);
    if (answers.competitors) sections.push(`- **Competitors:** ${answers.competitors}`);
  }

  // Working relationship
  sections.push(`## Working Relationship`);
  if (answers.communication_style) {
    sections.push(`- **Communication:** ${formatSelectAnswer(answers.communication_style as string, {
      detailed: 'Detailed updates preferred',
      summary: 'Brief summaries preferred',
      results_only: 'Results only, skip process',
    })}`);
  }
  if (answers.autonomy_level) {
    sections.push(`- **Autonomy:** ${formatSelectAnswer(answers.autonomy_level as string, {
      high: 'High — make decisions independently',
      medium: 'Medium — check on big moves',
      low: 'Low — check before most actions',
    })}`);
  }
  if (answers.checkin_frequency) {
    sections.push(`- **Check-ins:** ${formatSelectAnswer(answers.checkin_frequency as string, {
      realtime: 'Real-time updates',
      daily: 'Daily summaries',
      weekly: 'Weekly recaps',
      blocked_only: 'Only when blocked',
    })}`);
  }

  sections.push(`## Key Learnings
*(Add important learnings here as I work)*

## People I Work With
*(Add notes about people I interact with)*

## Decisions Made
*(Record important decisions and their context)*

---

*Update this file with things worth remembering long-term.*`);

  return sections.join('\n\n');
}

function generateNowMd(agentName: string): string {
  return `# NOW.md - Current Context

## Status
Just deployed! Ready to start working.

## Current Focus
Waiting for first task from my human.

## Recent Context
${agentName} here — I was just hired and set up with my custom context.
Ready to dive in as soon as I get my first assignment.

---

*Keep this file updated so future-me knows what's happening.*
`;
}

// Helper functions

function formatSelectAnswer(value: string, options: Record<string, string>): string {
  return options[value] || value;
}

function formatChannel(channel: string): string {
  const map: Record<string, string> = {
    email: 'Cold email outreach',
    linkedin: 'LinkedIn messaging',
    phone: 'Cold calling',
    social: 'Social media engagement',
  };
  return map[channel] || channel;
}

function formatPlatform(platform: string): string {
  const map: Record<string, string> = {
    linkedin: 'LinkedIn',
    twitter: 'Twitter/X',
    blog: 'Company blog',
    newsletter: 'Email newsletter',
    youtube: 'YouTube',
  };
  return map[platform] || platform;
}

function formatTimezone(tz: string): string {
  const map: Record<string, string> = {
    'America/Los_Angeles': 'Pacific Time (PT)',
    'America/Denver': 'Mountain Time (MT)',
    'America/Chicago': 'Central Time (CT)',
    'America/New_York': 'Eastern Time (ET)',
    'Europe/London': 'UK (GMT/BST)',
    'Europe/Berlin': 'Central European Time (CET)',
    'Asia/Tokyo': 'Japan Standard Time (JST)',
    'other': 'Custom timezone',
  };
  return map[tz] || tz;
}

function formatAsBullets(text: string): string {
  // If already has bullets or newlines with content, leave it
  if (text.includes('\n-') || text.includes('\n•')) {
    return text;
  }
  
  // Split by common separators and bulletize
  const items = text.split(/[,;]|\n/).map(s => s.trim()).filter(Boolean);
  if (items.length > 1) {
    return items.map(item => `- ${item}`).join('\n');
  }
  
  return text;
}
