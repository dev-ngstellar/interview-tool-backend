export interface AptitudeSeedOption {
  optionText: string;
  isCorrect: boolean;
  order: number;
}

export interface AptitudeSeedQuestion {
  order: number;
  questionText: string;
  marks: number;
  options: AptitudeSeedOption[];
}

export const ROUND_1_APTITUDE_QUESTIONS: AptitudeSeedQuestion[] = [
  {
    order: 1,
    questionText:
      'If NG Stellar spends $5,000 on a LinkedIn ad campaign that generates 500 clicks and 10 leads, what is the Cost Per Lead (CPL)?',
    marks: 1.0,
    options: [
      { optionText: '$50', isCorrect: false, order: 1 },
      { optionText: '$100', isCorrect: false, order: 2 },
      { optionText: '$500', isCorrect: true, order: 3 },
      { optionText: '$5,000', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 2,
    questionText:
      'Arrange these stages of the B2B marketing funnel in the correct order: Conversion, Awareness, Consideration, Advocacy.',
    marks: 1.0,
    options: [
      { optionText: 'Awareness → Consideration → Conversion → Advocacy', isCorrect: true, order: 1 },
      { optionText: 'Consideration → Awareness → Conversion → Advocacy', isCorrect: false, order: 2 },
      { optionText: 'Awareness → Conversion → Consideration → Advocacy', isCorrect: false, order: 3 },
      { optionText: 'Awareness → Advocacy → Consideration → Conversion', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 3,
    questionText:
      "If a client's website conversion rate drops from 4% to 2% after a redesign, what is the percentage decrease in conversions?",
    marks: 1.0,
    options: [
      { optionText: '25%', isCorrect: false, order: 1 },
      { optionText: '40%', isCorrect: false, order: 2 },
      { optionText: '50%', isCorrect: true, order: 3 },
      { optionText: '75%', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 4,
    questionText:
      'A project requires 3 developers to complete in 6 days. How long will it take 2 developers to finish the same project, assuming equal efficiency?',
    marks: 1.0,
    options: [
      { optionText: '4 days', isCorrect: false, order: 1 },
      { optionText: '6 days', isCorrect: false, order: 2 },
      { optionText: '8 days', isCorrect: false, order: 3 },
      { optionText: '9 days', isCorrect: true, order: 4 },
    ],
  },
  {
    order: 5,
    questionText:
      'Identify the outlier in this set of marketing channels: SEO, PPC, Email Marketing, Networking, Influencer Marketing. Why?',
    marks: 1.0,
    options: [
      { optionText: 'SEO — it is not a marketing channel', isCorrect: false, order: 1 },
      { optionText: 'PPC — it cannot generate leads', isCorrect: false, order: 2 },
      { optionText: 'Networking — it is primarily an offline/direct relationship-building channel', isCorrect: true, order: 3 },
      { optionText: 'Influencer Marketing — it is only used for B2C companies', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 6,
    questionText:
      'Logic: If all “Transformation Advisory” firms use data analytics, and NG Stellar is a “Transformation Advisory” firm, what can you conclude about NG Stellar?',
    marks: 1.0,
    options: [
      { optionText: 'NG Stellar may use data analytics, but there is no basis to conclude it does', isCorrect: false, order: 1 },
      { optionText: 'NG Stellar uses data analytics', isCorrect: true, order: 2 },
      { optionText: 'NG Stellar only provides data analytics services', isCorrect: false, order: 3 },
      { optionText: 'NG Stellar must be a software development company', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 7,
    questionText:
      'In a market where 60% of leads come from referrals and 40% from digital ads, if we generate 200 leads, how many come from digital ads?',
    marks: 1.0,
    options: [
      { optionText: '40', isCorrect: false, order: 1 },
      { optionText: '60', isCorrect: false, order: 2 },
      { optionText: '80', isCorrect: true, order: 3 },
      { optionText: '120', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 8,
    questionText:
      'Critical Thinking: You are managing a tight deadline for a client case study. Two team members disagree on the technical details. How do you resolve this?',
    marks: 1.0,
    options: [
      { optionText: 'Choose the opinion of the more senior team member without checking', isCorrect: false, order: 1 },
      { optionText: 'Ignore the disagreement and submit the case study', isCorrect: false, order: 2 },
      { optionText: 'Review the facts, clarify the requirement, involve the appropriate technical expert, and agree on the accurate version', isCorrect: true, order: 3 },
      { optionText: 'Ask the client to decide which technical detail is correct', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 9,
    questionText:
      'Pattern recognition: 2, 6, 12, 20, 30, ?',
    marks: 1.0,
    options: [
      { optionText: '36', isCorrect: false, order: 1 },
      { optionText: '40', isCorrect: false, order: 2 },
      { optionText: '42', isCorrect: true, order: 3 },
      { optionText: '44', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 10,
    questionText:
      'Data Interpretation: If 30% of website traffic is from mobile and the mobile bounce rate is higher than desktop, what is the most logical first step to investigate?',
    marks: 1.0,
    options: [
      { optionText: 'Immediately stop all mobile traffic', isCorrect: false, order: 1 },
      { optionText: 'Check mobile page speed, usability, layout and technical performance', isCorrect: true, order: 2 },
      { optionText: 'Increase desktop advertising budget', isCorrect: false, order: 3 },
      { optionText: 'Delete the mobile version of the website', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 11,
    questionText:
      "If NG Stellar's SEO efforts increase organic website traffic from 8,000 to 11,000 visitors in a month, what is the percentage increase in traffic?",
    marks: 1.0,
    options: [
      { optionText: '25%', isCorrect: false, order: 1 },
      { optionText: '30%', isCorrect: false, order: 2 },
      { optionText: '37.5%', isCorrect: true, order: 3 },
      { optionText: '42.5%', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 12,
    questionText:
      'A sustainability audit is completed by 4 consultants working together in 8 hours. If 2 more consultants of equal efficiency join, how many hours will the audit now take?',
    marks: 1.0,
    options: [
      { optionText: '4 hours', isCorrect: false, order: 1 },
      { optionText: '5 hours 20 minutes', isCorrect: true, order: 2 },
      { optionText: '6 hours', isCorrect: false, order: 3 },
      { optionText: '12 hours', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 13,
    questionText:
      "NG Stellar's marketing budget is split in the ratio 3:2:1 across digital ads, content marketing, and events. If the total budget is 60,000, how much is allocated to content marketing?",
    marks: 1.0,
    options: [
      { optionText: '10,000', isCorrect: false, order: 1 },
      { optionText: '15,000', isCorrect: false, order: 2 },
      { optionText: '20,000', isCorrect: true, order: 3 },
      { optionText: '30,000', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 14,
    questionText:
      'In the AIDA marketing model (Awareness, Interest, Desire, Action), a campaign reaches 10,000 people at the Awareness stage. If only 2% convert all the way to Action, how many people complete the funnel?',
    marks: 1.0,
    options: [
      { optionText: '20', isCorrect: false, order: 1 },
      { optionText: '100', isCorrect: false, order: 2 },
      { optionText: '200', isCorrect: true, order: 3 },
      { optionText: '2,000', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 15,
    questionText:
      'Prioritization: A client wants a low-cost solution, a highly customized software build, and a tight delivery deadline — all at once. Which of these three constraints would you prioritize first, and why?',
    marks: 1.0,
    options: [
      { optionText: 'Cost, because budget should always override other considerations', isCorrect: false, order: 1 },
      { optionText: 'Customization, because features are always more important than delivery', isCorrect: false, order: 2 },
      { optionText: 'Delivery deadline, because missing a critical deadline can directly affect business outcomes', isCorrect: false, order: 3 },
      { optionText: 'There is no single priority; clarify business impact and negotiate the trade-offs before committing', isCorrect: true, order: 4 },
    ],
  },
];
