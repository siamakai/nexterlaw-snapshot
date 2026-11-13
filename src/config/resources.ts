// Resources the 90-day plan can link to (courses, Skool, webinar recording, podcast).
// The AI picks resource ids from this list only; titles here are the real Nexter assets.
// URLs come from env vars [CONFIRM #9]; podcast episodes fall back to the YouTube channel.
// Prices are never shown (spec §3).

import type { DimensionKey } from '@/lib/constants';
import { linkOrContact } from './site';
import { LINKS } from './next-steps';

export type ResourceType = 'course' | 'community' | 'webinar' | 'podcast';

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  description: string;
  /** Dimensions this resource helps with (used for fallbacks and the prompt). */
  dimensions: readonly (DimensionKey | 'intake')[];
  urlEnv: string;
  fallbackUrl?: string;
}

const PODCAST_CHANNEL = 'https://www.youtube.com/@NexterAIGroup';

export const RESOURCES: readonly Resource[] = [
  { id: 'course-responsible-ai', type: 'course', title: 'Responsible AI (course)',
    description: 'Ethical AI decision-making from procurement to deployment: evaluating systems, bias, compliance and governance culture.',
    dimensions: ['accountability', 'usageGovernance', 'explainability', 'compliance'], urlEnv: 'RESOURCE_COURSE_RESPONSIBLE_AI_URL' },
  { id: 'course-ai-law', type: 'course', title: 'AI & Law (course)',
    description: 'AI in legal practice: research, drafting, compliance and client management, with ethical rigour.',
    dimensions: ['compliance', 'reliability', 'rights', 'transparency'], urlEnv: 'NEXT_STEP_COURSE_AI_LAW_URL', fallbackUrl: LINKS.courseAiLaw },
  { id: 'course-ai-business', type: 'course', title: 'AI for Business (course)',
    description: 'Practical AI tools for teams, with no technical background needed.',
    dimensions: ['literacy'], urlEnv: 'RESOURCE_COURSE_AI_BUSINESS_URL' },
  { id: 'course-who-owns-intelligence', type: 'course', title: 'Who Owns Intelligence? (course)',
    description: 'AI intellectual property, ownership and creative rights, based on Dr Siamak Goudarzi’s book.',
    dimensions: ['rights'], urlEnv: 'RESOURCE_COURSE_WHO_OWNS_URL' },
  { id: 'skool-club', type: 'community', title: 'Nexter AI Business Club (Skool)',
    description: 'Community lessons and live sessions on putting AI to work safely.',
    dimensions: ['literacy', 'usageGovernance'], urlEnv: 'NEXT_STEP_SKOOL_URL', fallbackUrl: LINKS.skoolClub },
  { id: 'webinar-firm-ready', type: 'webinar', title: 'Webinar recording: Is Your Law Firm Ready for AI?',
    description: 'AI readiness, chatbot intake and automated follow-up for law firms.',
    dimensions: ['literacy', 'intake'], urlEnv: 'RESOURCE_WEBINAR_RECORDING_URL', fallbackUrl: LINKS.webinars },
  { id: 'podcast-kerry-underwood', type: 'podcast', title: 'Podcast: AI as a tool, not a master (Kerry Underwood)',
    description: 'Keeping professional judgement in charge of AI output.',
    dimensions: ['reliability', 'explainability'], urlEnv: 'RESOURCE_PODCAST_UNDERWOOD_URL', fallbackUrl: PODCAST_CHANNEL },
  { id: 'podcast-kevin-withane', type: 'podcast', title: 'Podcast: When your client has ChatGPT (Kevin Withane)',
    description: 'How client use of AI changes expectations and disclosure.',
    dimensions: ['transparency'], urlEnv: 'RESOURCE_PODCAST_WITHANE_URL', fallbackUrl: PODCAST_CHANNEL },
  { id: 'podcast-jane-wainwright', type: 'podcast', title: 'Podcast: Client expectations (Jane Wainwright)',
    description: 'What clients now expect from firms using AI.',
    dimensions: ['transparency'], urlEnv: 'RESOURCE_PODCAST_WAINWRIGHT_URL', fallbackUrl: PODCAST_CHANNEL },
  { id: 'podcast-mohammad-shaire', type: 'podcast', title: 'Podcast: AI implementation in small firms (Mohammad Shaire)',
    description: 'Practical rollout and ownership of AI in smaller practices.',
    dimensions: ['usageGovernance', 'accountability'], urlEnv: 'RESOURCE_PODCAST_SHAIRE_URL', fallbackUrl: PODCAST_CHANNEL },
  { id: 'podcast-mark-maclean', type: 'podcast', title: 'Podcast: Solo firms and AI (Mark Maclean)',
    description: 'Using AI well as a sole practitioner.',
    dimensions: ['literacy'], urlEnv: 'RESOURCE_PODCAST_MACLEAN_URL', fallbackUrl: PODCAST_CHANNEL },
  { id: 'podcast-will-angood', type: 'podcast', title: 'Podcast: The cost of slow follow-up (Will Angood)',
    description: 'Why response time to new enquiries matters.',
    dimensions: ['intake'], urlEnv: 'RESOURCE_PODCAST_ANGOOD_URL', fallbackUrl: PODCAST_CHANNEL },
  { id: 'podcast-elise-buie', type: 'podcast', title: 'Podcast: Human-centred law (Elise Buie)',
    description: 'Keeping clients and people at the centre of AI-assisted practice.',
    dimensions: ['explainability', 'transparency'], urlEnv: 'RESOURCE_PODCAST_BUIE_URL', fallbackUrl: PODCAST_CHANNEL },
  { id: 'podcast-karen-holden', type: 'podcast', title: 'Podcast: Beyond the billable hour (Karen Holden)',
    description: 'How AI changes pricing and the value firms deliver.',
    dimensions: ['usageGovernance'], urlEnv: 'RESOURCE_PODCAST_HOLDEN_URL', fallbackUrl: PODCAST_CHANNEL },
] as const;

export const RESOURCE_IDS = RESOURCES.map(r => r.id);

export function resourceById(id: string): Resource | undefined {
  return RESOURCES.find(r => r.id === id);
}

/** Server-only: the link for a resource, never empty. */
export function resourceHref(r: Resource): string {
  return linkOrContact((process.env[r.urlEnv] ?? '').trim() || r.fallbackUrl || '', r.title);
}
