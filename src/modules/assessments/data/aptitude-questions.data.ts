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
      'A retailer buys an item for Rs. 400 and marks it up by 25%. If he then offers a 10% discount on the marked price, what is the final selling price?',
    marks: 1.0,
    options: [
      { optionText: 'Rs. 440', isCorrect: false, order: 1 },
      { optionText: 'Rs. 450', isCorrect: true, order: 2 },
      { optionText: 'Rs. 460', isCorrect: false, order: 3 },
      { optionText: 'Rs. 480', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 2,
    questionText:
      'Find the next number in the series: 3, 7, 15, 31, 63, ?',
    marks: 1.0,
    options: [
      { optionText: '125', isCorrect: false, order: 1 },
      { optionText: '127', isCorrect: true, order: 2 },
      { optionText: '129', isCorrect: false, order: 3 },
      { optionText: '131', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 3,
    questionText:
      'A train 150 meters long passes an electric pole in 10 seconds. What is the speed of the train in kilometers per hour (km/h)?',
    marks: 1.0,
    options: [
      { optionText: '45 km/h', isCorrect: false, order: 1 },
      { optionText: '50 km/h', isCorrect: false, order: 2 },
      { optionText: '54 km/h', isCorrect: true, order: 3 },
      { optionText: '60 km/h', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 4,
    questionText:
      'Person A can complete a project in 12 days, and Person B can complete the same project in 24 days. Working together, in how many days will they complete the project?',
    marks: 1.0,
    options: [
      { optionText: '6 days', isCorrect: false, order: 1 },
      { optionText: '8 days', isCorrect: true, order: 2 },
      { optionText: '9 days', isCorrect: false, order: 3 },
      { optionText: '10 days', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 5,
    questionText:
      'Two numbers are in the ratio 3 : 5. If 8 is added to each number, the new ratio becomes 2 : 3. What is the sum of the original two numbers?',
    marks: 1.0,
    options: [
      { optionText: '56', isCorrect: false, order: 1 },
      { optionText: '64', isCorrect: true, order: 2 },
      { optionText: '72', isCorrect: false, order: 3 },
      { optionText: '80', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 6,
    questionText:
      'If the price of a raw material increases by 25%, by what percentage must a factory reduce its consumption so that total expenditure remains unchanged?',
    marks: 1.0,
    options: [
      { optionText: '18%', isCorrect: false, order: 1 },
      { optionText: '20%', isCorrect: true, order: 2 },
      { optionText: '22.5%', isCorrect: false, order: 3 },
      { optionText: '25%', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 7,
    questionText:
      'The average score of a marketing team across 5 assessment modules is 72. When the score of a 6th module is included, the overall average increases to 75. What was the score in the 6th module?',
    marks: 1.0,
    options: [
      { optionText: '85', isCorrect: false, order: 1 },
      { optionText: '88', isCorrect: false, order: 2 },
      { optionText: '90', isCorrect: true, order: 3 },
      { optionText: '92', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 8,
    questionText:
      'At what annual rate of simple interest will an investment double itself in exactly 8 years?',
    marks: 1.0,
    options: [
      { optionText: '10%', isCorrect: false, order: 1 },
      { optionText: '12%', isCorrect: false, order: 2 },
      { optionText: '12.5%', isCorrect: true, order: 3 },
      { optionText: '15%', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 9,
    questionText:
      'In a certain cryptographic coding system, if "LEADER" is coded by advancing each letter by 8 positions (L→20, E→13, A→9...), how is the word "LIGHT" coded under the same rule?',
    marks: 1.0,
    options: [
      { optionText: '20-17-15-16-28', isCorrect: true, order: 1 },
      { optionText: '19-16-14-15-27', isCorrect: false, order: 2 },
      { optionText: '20-16-15-16-27', isCorrect: false, order: 3 },
      { optionText: '21-17-15-16-29', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 10,
    questionText:
      'A manager is currently four times as old as an intern. In 20 years, the manager will be twice as old as the intern. What is the current age of the manager?',
    marks: 1.0,
    options: [
      { optionText: '36 years', isCorrect: false, order: 1 },
      { optionText: '40 years', isCorrect: true, order: 2 },
      { optionText: '44 years', isCorrect: false, order: 3 },
      { optionText: '48 years', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 11,
    questionText:
      'Statements: All managers are leaders. Some leaders are innovators. Conclusions: I. Some managers are innovators. II. All innovators are leaders. Which conclusion logically follows?',
    marks: 1.0,
    options: [
      { optionText: 'Only conclusion I follows', isCorrect: false, order: 1 },
      { optionText: 'Only conclusion II follows', isCorrect: false, order: 2 },
      { optionText: 'Both conclusions follow', isCorrect: false, order: 3 },
      { optionText: 'Neither conclusion follows', isCorrect: true, order: 4 },
    ],
  },
  {
    order: 12,
    questionText:
      'An interview panel contains 4 marketing specialists, 5 sales heads, and 3 analytics experts. If one panelist is selected at random, what is the probability that the person is NOT an analytics expert?',
    marks: 1.0,
    options: [
      { optionText: '1/4', isCorrect: false, order: 1 },
      { optionText: '1/2', isCorrect: false, order: 2 },
      { optionText: '2/3', isCorrect: false, order: 3 },
      { optionText: '3/4', isCorrect: true, order: 4 },
    ],
  },
  {
    order: 13,
    questionText:
      'A company’s quarterly campaign conversions are: Q1: 120, Q2: 150, Q3: 180, Q4: 150. What is the percentage growth in conversions from Q1 to Q3?',
    marks: 1.0,
    options: [
      { optionText: '33.33%', isCorrect: false, order: 1 },
      { optionText: '40%', isCorrect: false, order: 2 },
      { optionText: '50%', isCorrect: true, order: 3 },
      { optionText: '60%', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 14,
    questionText:
      'In what ratio must coffee powder priced at Rs. 62 per kg be mixed with premium coffee powder at Rs. 72 per kg to produce a blend worth Rs. 64.50 per kg?',
    marks: 1.0,
    options: [
      { optionText: '2 : 1', isCorrect: false, order: 1 },
      { optionText: '3 : 1', isCorrect: true, order: 2 },
      { optionText: '3 : 2', isCorrect: false, order: 3 },
      { optionText: '4 : 3', isCorrect: false, order: 4 },
    ],
  },
  {
    order: 15,
    questionText:
      'In a group of 100 marketing candidates, 60 are proficient in Digital Campaigns, 50 in Brand Strategy, and 20 are proficient in both. How many candidates are proficient in neither?',
    marks: 1.0,
    options: [
      { optionText: '10', isCorrect: true, order: 1 },
      { optionText: '15', isCorrect: false, order: 2 },
      { optionText: '20', isCorrect: false, order: 3 },
      { optionText: '30', isCorrect: false, order: 4 },
    ],
  },
];
