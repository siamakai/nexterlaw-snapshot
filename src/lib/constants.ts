export const PRACTICE_TYPES = [
  { slug: 'conveyancing-property', label: 'Conveyancing/Property' },
  { slug: 'corporate-ma', label: 'Corporate/M&A' },
  { slug: 'litigation-dispute-resolution', label: 'Litigation/Dispute Resolution' },
  { slug: 'family', label: 'Family' },
  { slug: 'private-client-wills-probate', label: 'Private Client/Wills & Probate' },
  { slug: 'criminal', label: 'Criminal' },
  { slug: 'employment', label: 'Employment' },
  { slug: 'personal-injury', label: 'Personal Injury' },
  { slug: 'immigration', label: 'Immigration' },
  { slug: 'commercial-ip-it', label: 'Commercial/IP/IT' },
  { slug: 'full-service', label: 'Full-service' },
] as const;

export const FIRM_SIZE_OPTIONS = [
  { value: 'MICRO', label: '1–4 fee-earners' },
  { value: 'SMALL', label: '5–20 fee-earners' },
  { value: 'MEDIUM', label: '21–50 fee-earners' },
  { value: 'LARGE', label: '51–200 fee-earners' },
  { value: 'ENTERPRISE', label: '200+ fee-earners' },
] as const;

export const EU_FACING_OPTIONS = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
  { value: 'NOT_SURE', label: 'Not sure' },
] as const;

export const SELF_ASSESSMENT_ANSWERS = [
  { value: 'YES', label: 'Yes' },
  { value: 'NOT_SURE', label: 'Not sure' },
  { value: 'NO', label: 'No' },
] as const;

export const CLEAR_TRUST_DIMENSIONS = [
  {
    key: 'compliance' as const,
    letter: 'C',
    name: 'Compliance',
    description: "Alignment of the firm's AI use with SRA guidance, ICO/UK GDPR obligations, and professional duties",
    question: 'Have you reviewed how your AI use aligns with SRA guidance and UK GDPR?',
  },
  {
    key: 'literacy' as const,
    letter: 'L',
    name: 'Literacy',
    description: 'Whether staff are trained and guided in AI use, or improvising without direction',
    question: 'Have staff received any training or guidance on using AI tools?',
  },
  {
    key: 'explainability' as const,
    letter: 'E',
    name: 'Explainability',
    description: "Whether the firm can explain and supervise how its AI tools reach their outputs",
    question: "Could a partner explain how the firm's AI tools reach their outputs, if asked?",
  },
  {
    key: 'accountability' as const,
    letter: 'A',
    name: 'Accountability',
    description: 'Whether a named person owns AI use and its outcomes within the firm',
    question: 'Is there a named person responsible for AI use in the firm?',
  },
  {
    key: 'rights' as const,
    letter: 'R',
    name: 'Rights',
    description: 'Protection of client confidentiality, consent, and data rights in AI workflows',
    question: 'Do you have rules on entering client-confidential information into AI tools?',
  },
  {
    key: 'transparency' as const,
    letter: 'T',
    name: 'Transparency',
    description: 'Whether the firm discloses AI use to clients where relevant',
    question: 'Do you tell clients when AI has been used in their matter, where relevant?',
  },
  {
    key: 'reliability' as const,
    letter: 'R',
    name: 'Reliability',
    description: 'Whether AI outputs are verified before use (accuracy, hallucination and citation checks)',
    question: 'Are AI outputs checked/verified before being used or sent out?',
  },
  {
    key: 'usageGovernance' as const,
    letter: 'U',
    name: 'Usage governance',
    description: 'Whether a written position exists on which tools and which data are permitted',
    question: 'Do you have a written position on which AI tools staff may use?',
  },
  {
    key: 'security' as const,
    letter: 'S',
    name: 'Security',
    description: 'Knowledge and control of where AI-processed data is stored, sent, and retained',
    question: 'Do you know where the data entered into your AI tools is stored and processed?',
  },
  {
    key: 'traceability' as const,
    letter: 'T',
    name: 'Traceability',
    description: 'Whether the firm keeps records of AI-assisted work sufficient to evidence control to a client, insurer, or regulator',
    question: 'Could you produce a record of AI-assisted work if a client or regulator asked?',
  },
] as const;

export type DimensionKey = (typeof CLEAR_TRUST_DIMENSIONS)[number]['key'];

export const SCORE_BANDS = [
  { label: 'EXPOSED' as const, min: 0, max: 39, displayName: 'Exposed', colour: '#ef4444' },
  { label: 'DEVELOPING' as const, min: 40, max: 69, displayName: 'Developing', colour: '#f59e0b' },
  { label: 'IN_CONTROL' as const, min: 70, max: 100, displayName: 'In Control', colour: '#22c55e' },
];

export const FREE_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.co.uk',
  'outlook.com', 'yahoo.com', 'yahoo.co.uk', 'icloud.com',
  'live.com', 'msn.com', 'aol.com',
];
