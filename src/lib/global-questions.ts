import type { DimensionKey } from '@/lib/constants';

// Universal wording from the NexterLaw Global Snapshot spec (unchanged from the live app).
export const GLOBAL_QUESTION_OVERRIDES: Partial<Record<DimensionKey, string>> = {
  compliance: "Can you demonstrate compliance with your jurisdiction's legal requirements for AI use?",
  literacy: 'Does your team have training on AI capabilities and limitations?',
  explainability: 'Can you explain how AI assisted a legal decision (to a client or court)?',
  accountability: 'Is there a designated person responsible for AI oversight?',
  rights: 'Do you have processes to respect client data rights (deletion, opt-out, etc.)?',
  transparency: 'Do you disclose AI use to clients?',
  reliability: 'Do you test AI outputs before using them in client work?',
  usageGovernance: 'Do you have a written policy on which AI tools are permitted?',
  security: 'Do you have data security and confidentiality controls for AI?',
  traceability: 'Can you audit which AI was used on a given matter?',
};
