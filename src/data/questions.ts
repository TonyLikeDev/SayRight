import type { Level } from "./lessons";

export type Question = {
  id: string;
  topic: string;
  level: Level;
  question: string;
  sample: string;
  phrases: string[];
};

export const QUESTIONS: Question[] = [
  // Daily life
  {
    id: "dl-morning",
    topic: "Daily life",
    level: "beginner",
    question: "What do you usually do in the morning?",
    sample:
      "I usually wake up at seven and make a cup of coffee. Then I take a quick shower and check my messages before work.",
    phrases: ["I usually...", "First, I...", "After that, I..."],
  },
  {
    id: "dl-weekend",
    topic: "Daily life",
    level: "beginner",
    question: "How do you like to spend your weekends?",
    sample:
      "I like to relax at home and sleep in a little. On Sunday afternoons, I often meet my friends for lunch.",
    phrases: ["On weekends, I like to...", "I often...", "Sometimes I..."],
  },
  {
    id: "dl-neighborhood",
    topic: "Daily life",
    level: "intermediate",
    question: "Can you describe the neighborhood where you live?",
    sample:
      "I live in a quiet neighborhood close to the city center. There are a lot of small cafes and a park where people walk their dogs. The only downside is that parking can be difficult.",
    phrases: ["I live in...", "There are a lot of...", "The only downside is..."],
  },
  {
    id: "dl-stress",
    topic: "Daily life",
    level: "advanced",
    question: "What do you do to relax when you feel stressed?",
    sample:
      "When I feel stressed, I usually go for a long walk and listen to music. It helps me clear my head and see things more calmly. I also try to put my phone away for a while.",
    phrases: ["When I feel stressed, I...", "It helps me...", "I also try to..."],
  },

  // Work
  {
    id: "work-job",
    topic: "Work",
    level: "beginner",
    question: "What do you do for work?",
    sample:
      "I work as a software developer at a small company. I spend most of my day writing code and fixing problems.",
    phrases: ["I work as a...", "I spend most of my day...", "My job is to..."],
  },
  {
    id: "work-like",
    topic: "Work",
    level: "intermediate",
    question: "What do you like most about your job?",
    sample:
      "What I like most is working with my team. Everyone is friendly, and we always help each other solve problems.",
    phrases: ["What I like most is...", "I really enjoy...", "The best part is..."],
  },
  {
    id: "work-remote",
    topic: "Work",
    level: "intermediate",
    question: "Do you prefer working from home or in an office? Why?",
    sample:
      "I prefer working from home because I save a lot of time on commuting. However, I go to the office once a week to see my coworkers.",
    phrases: ["I prefer... because...", "However,...", "On the other hand,..."],
  },
  {
    id: "work-challenge",
    topic: "Work",
    level: "advanced",
    question: "Tell me about a challenge you faced at work and how you handled it.",
    sample:
      "Last year, our team had to finish a big project in a very short time. I organized the work into smaller tasks, and we checked our progress every morning. In the end, we delivered it on time.",
    phrases: ["Last year, I had to...", "What I did was...", "In the end,..."],
  },

  // Travel
  {
    id: "travel-favorite",
    topic: "Travel",
    level: "beginner",
    question: "What is your favorite place you have ever visited?",
    sample:
      "My favorite place is Da Nang. The beaches are beautiful, and the seafood is amazing.",
    phrases: ["My favorite place is...", "I loved it because...", "The best thing about it was..."],
  },
  {
    id: "travel-pack",
    topic: "Travel",
    level: "beginner",
    question: "What do you always bring when you travel?",
    sample:
      "I always bring my phone charger and a good book. I also pack a light jacket, just in case it gets cold.",
    phrases: ["I always bring...", "I also pack...", "Just in case..."],
  },
  {
    id: "travel-dream",
    topic: "Travel",
    level: "intermediate",
    question: "If you could travel anywhere in the world, where would you go?",
    sample:
      "If I could go anywhere, I would go to Japan. I want to see the cherry blossoms and try real ramen in Tokyo.",
    phrases: ["If I could go anywhere, I would...", "I have always wanted to...", "I would love to..."],
  },
  {
    id: "travel-problem",
    topic: "Travel",
    level: "advanced",
    question: "Tell me about a time something went wrong on a trip.",
    sample:
      "Once my flight was canceled, and I had to stay an extra night at the airport. It was stressful, but I met some friendly people and we shared stories all night. Now I always check my flight status before I leave.",
    phrases: ["Once, when I was traveling...", "It was stressful, but...", "Now I always..."],
  },

  // Food
  {
    id: "food-favorite",
    topic: "Food",
    level: "beginner",
    question: "What is your favorite food?",
    sample:
      "My favorite food is pho. I love the warm broth and fresh herbs, especially on a cold day.",
    phrases: ["My favorite food is...", "I love it because...", "Especially when..."],
  },
  {
    id: "food-cook",
    topic: "Food",
    level: "intermediate",
    question: "Do you like cooking? What can you make?",
    sample:
      "Yes, I enjoy cooking on the weekends. I can make fried rice, spring rolls, and a simple pasta dish.",
    phrases: ["Yes, I enjoy...", "I can make...", "I'm not very good at..., but..."],
  },
  {
    id: "food-recommend",
    topic: "Food",
    level: "intermediate",
    question: "What local dish would you recommend to a visitor?",
    sample:
      "I would definitely recommend banh mi. It's a crispy sandwich with meat, pickled vegetables, and fresh herbs, and it's cheap and delicious.",
    phrases: ["I would definitely recommend...", "It's a kind of...", "You should try..."],
  },
  {
    id: "food-healthy",
    topic: "Food",
    level: "advanced",
    question: "Do you think people today eat healthier than in the past?",
    sample:
      "In some ways yes, because people know more about nutrition now. But I think many people eat more fast food because they are so busy. It really depends on the person and their lifestyle.",
    phrases: ["In some ways...", "But I think...", "It really depends on..."],
  },

  // Hobbies
  {
    id: "hobby-free",
    topic: "Hobbies",
    level: "beginner",
    question: "What do you like to do in your free time?",
    sample:
      "In my free time, I like to play badminton and watch movies. I also enjoy reading on quiet evenings.",
    phrases: ["In my free time, I like to...", "I also enjoy...", "When I have time, I..."],
  },
  {
    id: "hobby-new",
    topic: "Hobbies",
    level: "intermediate",
    question: "Is there a hobby you would like to start?",
    sample:
      "I would really like to learn the guitar. I love music, and I think it would be a great way to relax after work.",
    phrases: ["I would really like to...", "I think it would be...", "I have always wanted to..."],
  },
  {
    id: "hobby-story",
    topic: "Hobbies",
    level: "intermediate",
    question: "Tell me about a movie or book you enjoyed recently.",
    sample:
      "Recently I watched a movie about a chef who opens a food truck. It was funny and warm, and it made me want to cook more.",
    phrases: ["Recently I watched...", "It was about...", "It made me..."],
  },
  {
    id: "hobby-tech",
    topic: "Hobbies",
    level: "advanced",
    question: "How has technology changed the way people spend their free time?",
    sample:
      "Technology has made entertainment much easier to access, since we can stream anything on our phones. However, I think people spend less time outside and with friends in person. I try to balance screen time with real activities.",
    phrases: ["Technology has made...", "However, I think...", "I try to..."],
  },

  // Opinions
  {
    id: "op-english",
    topic: "Opinions",
    level: "beginner",
    question: "Why do you want to improve your English?",
    sample:
      "I want to improve my English for my job. I often talk with clients from other countries, and I want to speak more clearly.",
    phrases: ["I want to improve my English because...", "I often...", "I hope to..."],
  },
  {
    id: "op-city",
    topic: "Opinions",
    level: "intermediate",
    question: "Would you rather live in a big city or in the countryside?",
    sample:
      "I would rather live in a big city because there are more jobs and things to do. But I would love to have a small house in the countryside for the holidays.",
    phrases: ["I would rather... because...", "But I would love to...", "The main reason is..."],
  },
  {
    id: "op-social",
    topic: "Opinions",
    level: "advanced",
    question: "Do you think social media does more good or more harm?",
    sample:
      "I think social media can do both. It helps people stay connected and share ideas, but it can also spread false information and make people feel anxious. It depends on how we use it.",
    phrases: ["I think it can do both.", "It helps people..., but...", "It depends on..."],
  },
  {
    id: "op-education",
    topic: "Opinions",
    level: "advanced",
    question: "What is the most important skill that schools should teach?",
    sample:
      "In my opinion, schools should teach critical thinking. Students need to know how to question information and solve problems on their own. That skill is useful in every part of life.",
    phrases: ["In my opinion,...", "Students need to...", "That skill is useful because..."],
  },

  // Memories
  {
    id: "mem-childhood",
    topic: "Memories",
    level: "beginner",
    question: "What is your favorite childhood memory?",
    sample:
      "My favorite memory is flying kites with my father on the beach. We did it every summer, and I still remember how happy I felt.",
    phrases: ["My favorite memory is...", "I still remember...", "When I was a kid,..."],
  },
  {
    id: "mem-birthday",
    topic: "Memories",
    level: "beginner",
    question: "How did you celebrate your last birthday?",
    sample:
      "I had a small dinner with my family at my favorite restaurant. My sister surprised me with a chocolate cake.",
    phrases: ["I celebrated by...", "We went to...", "They surprised me with..."],
  },
  {
    id: "mem-teacher",
    topic: "Memories",
    level: "intermediate",
    question: "Tell me about a teacher who influenced you.",
    sample:
      "My high school English teacher really influenced me. She was patient and always encouraged us to speak, even when we made mistakes.",
    phrases: ["One teacher who influenced me was...", "She always...", "Because of her, I..."],
  },
  {
    id: "mem-proud",
    topic: "Memories",
    level: "advanced",
    question: "Describe a moment when you felt really proud of yourself.",
    sample:
      "I felt really proud when I gave my first presentation in English at work. I was very nervous, but I practiced for weeks and it went well. My manager even asked me to present again the next month.",
    phrases: ["I felt really proud when...", "I was nervous, but...", "In the end,..."],
  },

  // Plans
  {
    id: "plan-weekend",
    topic: "Plans",
    level: "beginner",
    question: "What are your plans for this weekend?",
    sample:
      "This weekend I'm going to visit my grandparents. On Sunday, I plan to clean my apartment and rest.",
    phrases: ["This weekend I'm going to...", "I plan to...", "If I have time, I might..."],
  },
  {
    id: "plan-future",
    topic: "Plans",
    level: "intermediate",
    question: "Where do you see yourself in five years?",
    sample:
      "In five years, I hope to be a team leader at my company. I also want to speak English confidently and maybe work abroad for a while.",
    phrases: ["In five years, I hope to...", "I also want to...", "Maybe I will..."],
  },
  {
    id: "plan-goal",
    topic: "Plans",
    level: "intermediate",
    question: "What is one goal you want to achieve this year?",
    sample:
      "This year, I want to run a half marathon. I've started training three times a week, and I'm getting stronger.",
    phrases: ["This year, I want to...", "I've started...", "To reach my goal, I..."],
  },
  {
    id: "plan-change",
    topic: "Plans",
    level: "advanced",
    question: "If you could change one thing about your daily routine, what would it be?",
    sample:
      "I would start going to bed earlier. I usually stay up too late on my phone, and I feel tired the next morning. Getting more sleep would help me focus better at work.",
    phrases: ["I would start...", "I usually..., and...", "It would help me..."],
  },
];
