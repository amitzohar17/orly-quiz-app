"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/* ---------- Types ---------- */

type CategoryRow = { id: string; name: string };

type QuestionRow = {
  id: string;
  category_id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_index: number;
  explanation: string | null;
  created_at?: string;
};

type UiQuestion = {
  id: string;
  categoryId: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

/* ---------- Home ---------- */

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);
  const [questions, setQuestions] = useState<UiQuestion[]>([]);

  useEffect(() => {
    async function loadCategories() {
      setLoading(true);
      const { data, error } = await supabase.from("categories").select("id,name").order("name");
      if (error) {
        setErrorMsg(`שגיאת טעינה: ${error.message}`);
        setLoading(false);
        return;
      }
      const hidden = ["נהלים", "בטיחות"];
      const filtered = (data ?? []).filter((c) => !hidden.includes(c.name)) as CategoryRow[];
      setCategories(filtered);
      setLoading(false);
    }
    loadCategories();
  }, []);

  async function enterCategory(c: CategoryRow) {
    setSelectedCategory(c);
    setLoading(true);
    const { data, error } = await supabase
      .from("questions")
      .select("id,category_id,text,option_a,option_b,option_c,option_d,correct_index,explanation")
      .eq("category_id", c.id);

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const ui: UiQuestion[] = (data ?? []).map((q) => ({
      id: String(q.id), // המרה קבועה למחרוזת
      categoryId: q.category_id,
      text: q.text,
      options: [q.option_a, q.option_b, q.option_c, q.option_d],
      correctIndex: q.correct_index,
      explanation: q.explanation ?? undefined,
    }));

    setQuestions(ui);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-xl shadow-md max-w-lg w-full p-6">
        {loading && <p className="text-center py-4">טוען...</p>}
        {!loading && !selectedCategory && (
          <>
            <h1 className="text-2xl font-bold mb-4">בחרי נושא</h1>
            <div className="space-y-2">
              {categories.map((c) => (
                <button key={c.id} className="w-full text-start p-4 border rounded-xl hover:bg-gray-50 transition" onClick={() => enterCategory(c)}>
                  {c.name}
                </button>
              ))}
            </div>
          </>
        )}
        {!loading && selectedCategory && (
          <Practice categoryName={selectedCategory.name} questions={questions} onBack={() => setSelectedCategory(null)} />
        )}
      </div>
    </main>
  );
}

/* ---------- Practice ---------- */

function Practice({ categoryName, questions, onBack }: { categoryName: string; questions: UiQuestion[]; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [wrongIds, setWrongIds] = useState<string[]>([]); // שינוי למערך פשוט של טקסט
  const [currentQuestions, setCurrentQuestions] = useState<UiQuestion[]>(questions);
  const [mode, setMode] = useState<"all" | "wrong">("all");

  // איפוס מלא בכניסה לקטגוריה
  useEffect(() => {
    setCurrentQuestions(questions);
    setIndex(0);
    setSelected(null);
    setIsFinished(false);
    setScore(0);
    setAnsweredCount(0);
    setWrongIds([]);
    setMode("all");
  }, [questions]);

  const q = currentQuestions[index];

  function chooseAnswer(i: number) {
    if (selected !== null || isFinished || !q) return;
    setSelected(i);
    setAnsweredCount((prev) => prev + 1);

    if (i === q.correctIndex) {
      setScore((prev) => prev + 1);
    } else {
      // מוסיפים את ה-ID לרשימת הטעויות אם הוא עוד לא שם
      if (!wrongIds.includes(q.id)) {
        setWrongIds((prev) => [...prev, q.id]);
      }
    }
  }

  function restartWrongOnly() {
    console.log("IDs of mistakes:", wrongIds);
    // סינון קפדני: יוצרים רשימה חדשה רק של השאלות שה-ID שלהן נמצא ב-wrongIds
    const filtered = questions.filter((item) => wrongIds.includes(item.id));
    
    console.log("Filtered questions count:", filtered.length);

    if (filtered.length > 0) {
      setCurrentQuestions(filtered);
      setMode("wrong");
      setIndex(0);
      setSelected(null);
      setScore(0);
      setAnsweredCount(0);
      setIsFinished(false);
    } else {
      alert("לא נמצאו טעויות לסינון");
    }
  }

  function restartAll() {
    setCurrentQuestions(questions);
    setMode("all");
    setIndex(0);
    setSelected(null);
    setScore(0);
    setAnsweredCount(0);
    setIsFinished(false);
    setWrongIds([]);
  }

  if (isFinished) {
    return (
      <div className="text-start">
        <h2 className="text-xl font-bold mb-4">{mode === "wrong" ? "סיכום תרגול טעויות" : "סיימת!"}</h2>
        <div className="space-y-2 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between"><span>שאלות שבוצעו:</span> <b>{answeredCount}</b></div>
          <div className="flex justify-between"><span>צדקת ב:</span> <b className="text-green-600">{score}</b></div>
          {mode === "all" && <div className="flex justify-between"><span>טעויות שנשמרו:</span> <b className="text-red-600">{wrongIds.length}</b></div>}
        </div>
        <div className="flex flex-col gap-2">
          <button className="p-4 bg-black text-white rounded-xl font-bold" onClick={restartAll}>תרגול חדש (הכל)</button>
          <button className="p-4 border-2 border-black rounded-xl font-bold disabled:opacity-30" disabled={wrongIds.length === 0} onClick={restartWrongOnly}>
            תרגלי רק טעויות ({wrongIds.length})
          </button>
          <button className="p-4 border rounded-xl" onClick={onBack}>חזרה לנושאים</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between text-sm mb-2 text-gray-500">
        <span>{categoryName} {mode === "wrong" && "(תרגול טעויות)"}</span>
        <span>{index + 1} / {currentQuestions.length}</span>
      </div>
      <div className="w-full bg-gray-200 h-2 rounded-full mb-6">
        <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${((index + 1) / currentQuestions.length) * 100}%` }} />
      </div>
      <p className="text-lg font-bold mb-6">{q?.text}</p>
      <div className="space-y-3">
        {q?.options.map((opt, i) => {
          let cls = "w-full p-4 border-2 rounded-xl text-start transition-all ";
          if (selected !== null) {
            if (i === q.correctIndex) cls += "bg-green-100 border-green-500 text-green-800";
            else if (i === selected) cls += "bg-red-100 border-red-500 text-red-800";
            else cls += "opacity-40 border-gray-100";
          } else { cls += "hover:bg-gray-50 border-gray-200"; }
          return <button key={i} className={cls} disabled={selected !== null} onClick={() => chooseAnswer(i)}>{opt}</button>;
        })}
      </div>
      {selected !== null && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="font-bold">{selected === q.correctIndex ? "נכון מאוד!" : "טעות..."}</p>
          {q.explanation && <p className="text-sm mt-1">{q.explanation}</p>}
        </div>
      )}
      <button className="mt-8 w-full p-4 bg-black text-white rounded-xl font-bold disabled:opacity-50" disabled={selected === null} onClick={() => {
        if (index >= currentQuestions.length - 1) setIsFinished(true);
        else { setIndex(index + 1); setSelected(null); }
      }}>
        {index === currentQuestions.length - 1 ? "לתוצאות" : "המשך"}
      </button>
    </>
  );
}