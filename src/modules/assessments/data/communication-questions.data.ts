export interface CommunicationSeedOption {
  optionText: string;
  isCorrect: boolean;
  order: number;
}

export interface CommunicationSeedQuestion {
  order: number;
  questionText: string;
  marks: number;
  options: CommunicationSeedOption[];
}

export const ROUND_2_COMMUNICATION_QUESTIONS: CommunicationSeedQuestion[] = [
  // 1. Vocabulary
  {
    order: 1,
    questionText:
      'Choose the word that best completes the sentence: "The candidate presented a ________ argument supported by verifiable market research and customer analytics."',
    marks: 1.0,
    options: [
      { optionText: 'cogent', isCorrect: true, order: 1 },
      { optionText: 'tenuous', isCorrect: false, order: 2 },
      { optionText: 'spurious', isCorrect: false, order: 3 },
      { optionText: 'frivolous', isCorrect: false, order: 4 },
    ],
  },
  // 2. Synonyms
  {
    order: 2,
    questionText:
      'Select the word that is most nearly SYNONYMOUS in meaning with "METICULOUS":',
    marks: 1.0,
    options: [
      { optionText: 'Careless', isCorrect: false, order: 1 },
      { optionText: 'Scrupulous and precise', isCorrect: true, order: 2 },
      { optionText: 'Ambiguous', isCorrect: false, order: 3 },
      { optionText: 'Superficial', isCorrect: false, order: 4 },
    ],
  },
  // 3. Antonyms
  {
    order: 3,
    questionText:
      'Select the word that is most opposite (ANTONYM) in meaning to "TRANSPARENT" in corporate governance:',
    marks: 1.0,
    options: [
      { optionText: 'Candid', isCorrect: false, order: 1 },
      { optionText: 'Opaque', isCorrect: true, order: 2 },
      { optionText: 'Lucid', isCorrect: false, order: 3 },
      { optionText: 'Explicit', isCorrect: false, order: 4 },
    ],
  },
  // 4. Grammar
  {
    order: 4,
    questionText:
      'Identify the sentence with correct subject-verb agreement for executive correspondence:',
    marks: 1.0,
    options: [
      { optionText: 'Neither the manager nor the executive are available for the client review.', isCorrect: false, order: 1 },
      { optionText: 'Neither the manager nor the executive is available for the client review.', isCorrect: true, order: 2 },
      { optionText: 'Neither the manager or the executive were available for the client review.', isCorrect: false, order: 3 },
      { optionText: 'Neither of the executives are present today.', isCorrect: false, order: 4 },
    ],
  },
  // 5. Sentence Correction
  {
    order: 5,
    questionText:
      'Choose the grammatically corrected version of: "Having arrived late for the quarterly briefing, the presentation was already finished by the director."',
    marks: 1.0,
    options: [
      { optionText: 'Having arrived late for the quarterly briefing, the director had already finished the presentation.', isCorrect: true, order: 1 },
      { optionText: 'Arriving late for the quarterly briefing, the presentation has already finished.', isCorrect: false, order: 2 },
      { optionText: 'Because of arriving late for the briefing, it was already finished by the director.', isCorrect: false, order: 3 },
      { optionText: 'The presentation was finished already by director having arrived late.', isCorrect: false, order: 4 },
    ],
  },
  // 6. Prepositions
  {
    order: 6,
    questionText:
      'Fill in the correct prepositions: "The marketing director insisted ________ adhering strictly ________ the compliance guidelines during the brand campaign."',
    marks: 1.0,
    options: [
      { optionText: 'on / to', isCorrect: true, order: 1 },
      { optionText: 'for / with', isCorrect: false, order: 2 },
      { optionText: 'at / by', isCorrect: false, order: 3 },
      { optionText: 'about / in', isCorrect: false, order: 4 },
    ],
  },
  // 7. Articles
  {
    order: 7,
    questionText:
      'Select the option with correct article usage: "________ honest assessment of market trends is ________ unique advantage for ________ enterprise."',
    marks: 1.0,
    options: [
      { optionText: 'An / a / an', isCorrect: true, order: 1 },
      { optionText: 'A / an / an', isCorrect: false, order: 2 },
      { optionText: 'An / an / a', isCorrect: false, order: 3 },
      { optionText: 'The / an / an', isCorrect: false, order: 4 },
    ],
  },
  // 8. Tenses
  {
    order: 8,
    questionText:
      'Choose the appropriate tense form: "By the time the annual audit commences next Friday, our accounting team ________ all outstanding reconciliations."',
    marks: 1.0,
    options: [
      { optionText: 'will have completed', isCorrect: true, order: 1 },
      { optionText: 'had completed', isCorrect: false, order: 2 },
      { optionText: 'completed', isCorrect: false, order: 3 },
      { optionText: 'will be complete', isCorrect: false, order: 4 },
    ],
  },
  // 9. Reading Comprehension
  {
    order: 9,
    questionText:
      'Read the passage: "Consumer behavior in digital omnichannel retail is increasingly driven by zero-friction checkout experiences rather than brand loyalty alone. Retailers that reduced transactional steps by 30% observed a 45% decrease in cart abandonment." According to the passage, what is the primary catalyst for reducing cart abandonment?',
    marks: 1.0,
    options: [
      { optionText: 'Aggressive brand advertising and loyalty points', isCorrect: false, order: 1 },
      { optionText: 'Eliminating friction and minimizing transactional checkout steps', isCorrect: true, order: 2 },
      { optionText: 'Expanding product diversity and pricing tiers', isCorrect: false, order: 3 },
      { optionText: 'Shifting entirely away from mobile e-commerce platforms', isCorrect: false, order: 4 },
    ],
  },
  // 10. Professional Communication
  {
    order: 10,
    questionText:
      'In professional client communications, which response best de-escalates a service delay while maintaining corporate accountability and confidence?',
    marks: 1.0,
    options: [
      { optionText: 'We understand the urgency and sincerely apologize for the delay. Our technical team has resolved the bottleneck, and your deliverable will be finalized by 3:00 PM today.', isCorrect: true, order: 1 },
      { optionText: 'It is not our fault because our vendor had an unexpected server outage yesterday.', isCorrect: false, order: 2 },
      { optionText: 'Delays happen in business all the time, so please wait until tomorrow.', isCorrect: false, order: 3 },
      { optionText: 'You should have informed us earlier if you needed this project so quickly.', isCorrect: false, order: 4 },
    ],
  },
  // 11. Customer Communication
  {
    order: 11,
    questionText:
      'When a high-priority corporate client calls expressing frustration regarding a billing discrepancy on their quarterly invoice, what is the most effective and professional response?',
    marks: 1.0,
    options: [
      { optionText: 'I understand your concern, and I will personally review your transaction log immediately to rectify any discrepancy and update you within two hours.', isCorrect: true, order: 1 },
      { optionText: 'Our automated billing system does not make mistakes, so the invoice must be accurate.', isCorrect: false, order: 2 },
      { optionText: 'Please send an email to our general support queue and wait for three business days.', isCorrect: false, order: 3 },
      { optionText: 'I am not responsible for finance, so you will need to contact our accounting department directly.', isCorrect: false, order: 4 },
    ],
  },
  // 12. Sales Situations
  {
    order: 12,
    questionText:
      "During a B2B product pitch, a prospective client remarks that a competitor's software is 20% cheaper. How should an astute marketing executive address this price objection?",
    marks: 1.0,
    options: [
      { optionText: "Focus on our platform's demonstrated ROI, lower total cost of ownership, and dedicated customer success support.", isCorrect: true, order: 1 },
      { optionText: "Immediately criticize the competitor's software quality and business stability.", isCorrect: false, order: 2 },
      { optionText: 'Tell the client that quality software is always expensive and refuse to discuss pricing further.', isCorrect: false, order: 3 },
      { optionText: 'Agree that our product is overpriced and offer an unauthorized 40% discount on the spot.', isCorrect: false, order: 4 },
    ],
  },
  // 13. Business Scenarios
  {
    order: 13,
    questionText:
      'During a critical product launch, the engineering team reports that a key feature will be delayed by one week. As the marketing lead, which action demonstrates optimal cross-functional collaboration?',
    marks: 1.0,
    options: [
      { optionText: 'Collaboratively assess the impact on marketing campaigns, adjust the launch timeline accordingly, and communicate revised milestones to key stakeholders.', isCorrect: true, order: 1 },
      { optionText: 'Demand that engineering release the unverified feature immediately regardless of stability.', isCorrect: false, order: 2 },
      { optionText: 'Cancel all marketing campaigns entirely and blame the engineering team in an executive email.', isCorrect: false, order: 3 },
      { optionText: 'Proceed with the campaign announcing the delayed feature as if it were already available.', isCorrect: false, order: 4 },
    ],
  },
  // 14. Workplace Communication
  {
    order: 14,
    questionText:
      'When providing constructive feedback to a junior team member regarding errors in a client deliverable, which approach adheres to best practices in professional leadership?',
    marks: 1.0,
    options: [
      { optionText: 'Schedule a private discussion, highlight specific areas for improvement with actionable examples, and offer guidance for revision.', isCorrect: true, order: 1 },
      { optionText: 'Point out the mistakes publicly in front of the entire team during the morning stand-up meeting.', isCorrect: false, order: 2 },
      { optionText: 'Send an angry email marked urgent and copy executive leadership.', isCorrect: false, order: 3 },
      { optionText: 'Silently fix the errors yourself without telling the team member so they do not feel discouraged.', isCorrect: false, order: 4 },
    ],
  },
  // 15. Word Meanings in Corporate Strategy
  {
    order: 15,
    questionText:
      'In strategic business planning, what is the precise meaning of adopting a "PRAGMATIC" approach?',
    marks: 1.0,
    options: [
      { optionText: 'Dealing with matters sensibly and realistically based on practical considerations rather than theoretical ideals.', isCorrect: true, order: 1 },
      { optionText: 'Following rigid dogmatic guidelines regardless of market realities or resource constraints.', isCorrect: false, order: 2 },
      { optionText: 'Adopting uncalculated risks and ignoring historical financial performance.', isCorrect: false, order: 3 },
      { optionText: 'Delaying all organizational decisions until absolute consensus is reached across all departments.', isCorrect: false, order: 4 },
    ],
  },
];
