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
  // Q1: Preposition / Fill in the Blank (Correct: C)
  {
    order: 1,
    questionText:
      "Fill in the blank: Our marketing team is responsible ___ developing campaigns that improve brand visibility.",
    marks: 1.0,
    options: [
      { optionText: "at", isCorrect: false, order: 1 },
      { optionText: "on", isCorrect: false, order: 2 },
      { optionText: "for", isCorrect: true, order: 3 },
      { optionText: "with", isCorrect: false, order: 4 },
    ],
  },
  // Q2: Subject–Verb Agreement (Correct: B)
  {
    order: 2,
    questionText: "Choose the grammatically correct sentence.",
    marks: 1.0,
    options: [
      {
        optionText: "The marketing team have completed the campaign.",
        isCorrect: false,
        order: 1,
      },
      {
        optionText: "The marketing team has completed the campaign.",
        isCorrect: true,
        order: 2,
      },
      {
        optionText: "The marketing team has complete the campaign.",
        isCorrect: false,
        order: 3,
      },
      {
        optionText: "The marketing team completing the campaign.",
        isCorrect: false,
        order: 4,
      },
    ],
  },
  // Q3: Tense / Business Context (Correct: A)
  {
    order: 3,
    questionText:
      "Fill in the blank: We ___ the client’s requirements before preparing the proposal.",
    marks: 1.0,
    options: [
      { optionText: "discussed", isCorrect: true, order: 1 },
      { optionText: "discussing", isCorrect: false, order: 2 },
      { optionText: "has discussed", isCorrect: false, order: 3 },
      { optionText: "discuss yesterday", isCorrect: false, order: 4 },
    ],
  },
  // Q4: Professional Client Communication (Correct: C)
  {
    order: 4,
    questionText: "Choose the most professional sentence for a client email.",
    marks: 1.0,
    options: [
      { optionText: "Send the details ASAP.", isCorrect: false, order: 1 },
      {
        optionText: "You need to send the details immediately.",
        isCorrect: false,
        order: 2,
      },
      {
        optionText:
          "Could you please share the required details at your earliest convenience?",
        isCorrect: true,
        order: 3,
      },
      {
        optionText: "Send me the details quickly.",
        isCorrect: false,
        order: 4,
      },
    ],
  },
  // Q5: Conjunction / Context (Correct: B)
  {
    order: 5,
    questionText:
      "Fill in the blank: The campaign was successful ___ the team had clearly defined its target audience.",
    marks: 1.0,
    options: [
      { optionText: "although", isCorrect: false, order: 1 },
      { optionText: "because", isCorrect: true, order: 2 },
      { optionText: "unless", isCorrect: false, order: 3 },
      { optionText: "whereas", isCorrect: false, order: 4 },
    ],
  },
  // Q6: Marketing Vocabulary (Correct: A)
  {
    order: 6,
    questionText:
      "Choose the correct use of the word “strategy” in a marketing context.",
    marks: 1.0,
    options: [
      {
        optionText: "We need a clear strategy to reach our target audience.",
        isCorrect: true,
        order: 1,
      },
      {
        optionText: "We need to strategy our target audience.",
        isCorrect: false,
        order: 2,
      },
      {
        optionText: "The strategy is a person who handles sales.",
        isCorrect: false,
        order: 3,
      },
      {
        optionText: "Strategy means posting anything without planning.",
        isCorrect: false,
        order: 4,
      },
    ],
  },
  // Q7: Subject–Verb Agreement (Correct: B)
  {
    order: 7,
    questionText:
      "Choose the sentence with the correct subject–verb agreement.",
    marks: 1.0,
    options: [
      {
        optionText: "Social media platforms helps businesses reach customers.",
        isCorrect: false,
        order: 1,
      },
      {
        optionText: "Social media platforms help businesses reach customers.",
        isCorrect: true,
        order: 2,
      },
      {
        optionText: "Social media platform help businesses reaches customers.",
        isCorrect: false,
        order: 3,
      },
      {
        optionText:
          "Social media platforms helping businesses reach customers.",
        isCorrect: false,
        order: 4,
      },
    ],
  },
  // Q8: Correct Phrase / Preposition (Correct: A)
  {
    order: 8,
    questionText:
      "Fill in the blank: The proposal was prepared ___ the client’s specific business requirements.",
    marks: 1.0,
    options: [
      { optionText: "according to", isCorrect: true, order: 1 },
      { optionText: "according", isCorrect: false, order: 2 },
      { optionText: "accordance to", isCorrect: false, order: 3 },
      { optionText: "according with", isCorrect: false, order: 4 },
    ],
  },
  // Q9: Vocabulary — Raise vs Rise (Correct: B)
  {
    order: 9,
    questionText:
      "Choose the best word to complete the sentence:\n\n“The campaign aims to ___ brand awareness among potential customers.”",
    marks: 1.0,
    options: [
      { optionText: "rise", isCorrect: false, order: 1 },
      { optionText: "raise", isCorrect: true, order: 2 },
      { optionText: "arise", isCorrect: false, order: 3 },
      { optionText: "rising", isCorrect: false, order: 4 },
    ],
  },
  // Q10: Professional Business Writing (Correct: C)
  {
    order: 10,
    questionText:
      "Choose the sentence that is most appropriate for a professional LinkedIn post.",
    marks: 1.0,
    options: [
      {
        optionText:
          "Our new campaign is super awesome and everyone must check it out!!!",
        isCorrect: false,
        order: 1,
      },
      {
        optionText: "Check this out guys, this is the best campaign ever.",
        isCorrect: false,
        order: 2,
      },
      {
        optionText:
          "We are pleased to share our latest campaign, focused on helping businesses strengthen their digital presence.",
        isCorrect: true,
        order: 3,
      },
      {
        optionText: "This campaign is the coolest thing we have done.",
        isCorrect: false,
        order: 4,
      },
    ],
  },
  // Q11: Subject–Verb Agreement / Conditional (Correct: B)
  {
    order: 11,
    questionText:
      "Fill in the blank: If the client ___ the proposal today, the team can begin the next stage tomorrow.",
    marks: 1.0,
    options: [
      { optionText: "approve", isCorrect: false, order: 1 },
      { optionText: "approves", isCorrect: true, order: 2 },
      { optionText: "approving", isCorrect: false, order: 3 },
      { optionText: "approved yesterday", isCorrect: false, order: 4 },
    ],
  },
  // Q12: Affect vs Effect (Correct: B)
  {
    order: 12,
    questionText:
      "Choose the sentence with the correct use of “affect” and “effect.”",
    marks: 1.0,
    options: [
      {
        optionText: "The new campaign had a positive affect on sales.",
        isCorrect: false,
        order: 1,
      },
      {
        optionText: "The new campaign had a positive effect on sales.",
        isCorrect: true,
        order: 2,
      },
      {
        optionText:
          "The new campaign effected sales positively because of its affect.",
        isCorrect: false,
        order: 3,
      },
      {
        optionText: "The campaign has an effect the customer’s decision.",
        isCorrect: false,
        order: 4,
      },
    ],
  },
  // Q13: Sentence Correction (Correct: C)
  {
    order: 13,
    questionText:
      "Identify the best correction for:\n\n“We are looking forward to discuss your marketing requirements.”",
    marks: 1.0,
    options: [
      {
        optionText:
          "We are looking forward to discuss your marketing requirements.",
        isCorrect: false,
        order: 1,
      },
      {
        optionText:
          "We are looking forward for discussing your marketing requirements.",
        isCorrect: false,
        order: 2,
      },
      {
        optionText:
          "We are looking forward to discussing your marketing requirements.",
        isCorrect: true,
        order: 3,
      },
      {
        optionText: "We look forward to discussed your marketing requirements.",
        isCorrect: false,
        order: 4,
      },
    ],
  },
  // Q14: Conjunction / Professional Communication (Correct: C)
  {
    order: 14,
    questionText:
      "Fill in the blank: The marketing executive should communicate with the client clearly ___ professionally.",
    marks: 1.0,
    options: [
      { optionText: "but", isCorrect: false, order: 1 },
      { optionText: "or", isCorrect: false, order: 2 },
      { optionText: "and", isCorrect: true, order: 3 },
      { optionText: "because", isCorrect: false, order: 4 },
    ],
  },
  // Q15: Reading Comprehension / Marketing Thinking (Correct: C)
  {
    order: 15,
    questionText:
      "Read the statement and choose the best conclusion:\n\n“A company receives many website visitors but very few enquiries. The marketing team should first examine the conversion journey and identify where potential customers are dropping off.”\n\nWhat does this suggest?",
    marks: 1.0,
    options: [
      {
        optionText: "Website traffic is always more important than enquiries.",
        isCorrect: false,
        order: 1,
      },
      {
        optionText:
          "The company should immediately stop all marketing activities.",
        isCorrect: false,
        order: 2,
      },
      {
        optionText:
          "The team should analyze the customer journey and conversion barriers before deciding on changes.",
        isCorrect: true,
        order: 3,
      },
      {
        optionText:
          "The company should remove the enquiry form without analysis.",
        isCorrect: false,
        order: 4,
      },
    ],
  },
];
