export type Category = {
  id: string;
  name: string;
};

export type Question = {
  id: string;
  categoryId: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export const CATEGORIES: Category[] = [
  { id: "safety", name: "בטיחות" },
  { id: "procedures", name: "נהלים" },
  { id: "equipment", name: "ציוד" },
];

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    categoryId: "safety",
    text: "מה עושים במקרה חירום?",
    options: ["מתעלמים", "מדווחים לממונה", "עוזבים בלי להודיע", "מחכים שמישהו אחר יטפל"],
    correctIndex: 1,
    explanation: "במקרה חירום יש לדווח מיד לממונה.",
  },
  {
    id: "q2",
    categoryId: "safety",
    text: "מה חשוב לפני שימוש בציוד?",
    options: ["לבדוק תקינות", "להשתמש מהר", "לא צריך לבדוק", "לסמוך על אחרים"],
    correctIndex: 0,
  },
  {
    id: "q3",
    categoryId: "procedures",
    text: "איך עובדים לפי נהלים?",
    options: ["לפי תחושת בטן", "לפי ההוראות הכתובות", "רק אם יש זמן", "רק כשמישהו מסתכל"],
    correctIndex: 1,
  },
  {
    id: "q4",
    categoryId: "equipment",
    text: "מה עושים אם ציוד תקול?",
    options: ["ממשיכים להשתמש", "מסתירים", "מדווחים ומפסיקים שימוש", "זורקים לפח"],
    correctIndex: 2,
  },
];
