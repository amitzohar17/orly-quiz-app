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

/* ---------- Home (Main Page) ---------- */

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);
  const [questions, setQuestions] = useState<UiQuestion[]>([]);

  useEffect(() => {
    async function loadCategories() {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("categories")
        .select("id,name")
        .order("name");

      if (error) {
        setErrorMsg(
          `Supabase error: ${error.message}. (בדקי טבלאות/הרשאות/RLS ב-Supabase)`
        );
        setCategories([]);
        setLoading(false);
        return;
      }

      const hiddenCategoryNames = ["נהלים", "בטיחות"];
      const filtered = (data ?? []).filter(
        (c) => !hiddenCategoryNames.includes(c.name)
      ) as CategoryRow[];

      setCategories(filtered);
      setLoading(false);
    }

    loadCategories();
  }, []);

  async function enterCategory(c: CategoryRow) {
    setSelectedCategory(c);
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("questions")
      .select(
        "id,category_id,text,option_a,option_b,option_c,option_d,correct_index,explanation,created_at"
      )
      .eq("category_id", c.id)
      .order("created_at");

    if (error) {
      setErrorMsg(
        `Supabase error: ${error.message}. (בדקי טבלת questions/הרשאות/RLS ב-Supabase)`
      );
      setLoading(false);
      return;
    }

    const ui: UiQuestion[] = ((data ?? []) as QuestionRow[]).map((q) => ({
      id: q.id,
      categoryId: q.category_id,
      text: q.text,
      options: [q.option_a, q.option_b, q.option_c, q.option_d],
      correctIndex: q.correct_index,
      explanation: q.explanation ?? undefined,
    }));

    setQuestions(ui);
    setLoading(false);
  }

  function backToCategories() {
    setSelectedCategory(null);
    setQuestions([]);
    setErrorMsg(null);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-xl shadow-md max-w-lg w-full p-6">
        {loading && <p className="text-start">טוען נתונים...</p>}
        {errorMsg && <p className="text-red-600 text-start">שגיאה: {errorMsg}</p>}

        {!loading && !selectedCategory && (
          <>
            <h1 className="text-2xl font-bold mb-4 text-start">בחרי נושא לתרגול</h1>
            <div className="space-y-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  className="w-full text-start p-3 rounded border hover:bg-gray-50 transition"
                  onClick={() => enterCategory(c)}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {categories.length === 0 && !errorMsg && (
              <p className="text-gray-500 mt-4 text-start">אין נושאים זמינים כרגע</p>
            )}
          </>
        )}

        {!loading && selectedCategory && (
          <Practice
            categoryName={selectedCategory.name}
            questions={questions}
            onBack={backToCategories}
          />
        )}
      </div>
    </main>
  );
}

/* ---------- Practice Component (ULTRASONIC FIX) ---------- */

function Practice({
  categoryName,
  questions,
  onBack,
}: {
  categoryName: string;
  questions: UiQuestion[];
  onBack: () => void;
}) {
  function shuffleArray<T>(arr: T[]) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"all" | "wrong">("all");

  const [currentQuestions, setCurrentQuestions] = useState<UiQuestion[]>(questions);
  const [isShuffled, setIsShuffled] = useState(false);

  useEffect(() => {
    setCurrentQuestions(questions);
    setIsShuffled(false);
    setIndex(0);
    setSelected(null);
    setIsFinished(false);
    setScore(0);
    setAnsweredCount(0);
    setWrongIds(new Set());
    setMode("all");
  }, [questions]);

  const q = currentQuestions[index];
  const isAnswered = selected !== null;

  function chooseAnswer(i: number) {
    if (isAnswered || isFinished || !q) return;
    setSelected(i);
    setAnsweredCount((c) => c + 1);

    if (i === q.correctIndex) {
      setScore((s) => s + 1);
    } else {
      // מוסיפים ל-Set ומוודאים שזה String ליתר ביטחון
      setWrongIds((prev) => new Set(prev).add(String(q.id)));
    }
  }

  function nextQuestion() {
    if (index >= currentQuestions.length - 1) {
      setIsFinished(true);
      return;
    }
    setSelected(null);
    setIndex((i) => i + 1);
  }

  function restartAll() {
    setMode("all");
    const nextOrder = isShuffled ? shuffleArray(questions) : questions;
    setCurrentQuestions(nextOrder);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setAnsweredCount(0);
    setIsFinished(false);
    setWrongIds(new Set()); 
  }

  function restartWrongOnly() {
    // השלב הקריטי: המרה למערך של מחרוזות
    const wrongsArray = Array.from(wrongIds).map(id => String(id));
    
    // סינון מתוך רשימת השאלות המקורית (questions)
    const onlyWrongs = questions.filter(item => wrongsArray.includes(String(item.id)));
    
    if (onlyWrongs.length === 0) {
      alert("לא נמצאו טעויות לתרגול");
      return;
    }

    const finalWrongs = isShuffled ? shuffleArray(onlyWrongs) : onlyWrongs;

    // עדכון כל ה-States יחד
    setMode("wrong");
    setCurrentQuestions(finalWrongs); 
    setIndex(0);
    setSelected(null);
    setScore(0);
    setAnsweredCount(0);
    setIsFinished(false);
  }

  if (currentQuestions.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="mb-4">לא נמצאו שאלות.</p>
        <button className="underline" onClick={onBack}>חזרה לנושאים</button>
      </div>
    );
  }

  if (isFinished) {
    const percent = answeredCount === 0 ? 0 : Math.round((score / answeredCount) * 100);

    return (
      <div className="text-start">
        <button className="underline mb-4 block" onClick={onBack}>
          חזרה לנושאים
        </button>

        <h2 className="text-xl font-bold mb-2">
          {mode === "wrong" ? "סיכום תרגול טעויות" : "סיימת את התרגול 🎉"}
        </h2>
        <p className="text-gray-600 mb-6">{categoryName}</p>

        <div className="space-y-2 mb-6 text-start">
          <div className="p-3 rounded border bg-gray-50 flex justify-between">
            <span>ענית על</span>
            <span className="font-semibold">{answeredCount} שאלות</span>
          </div>
          <div className="p-3 rounded border bg-gray-50 flex justify-between">
            <span>תשובות נכונות</span>
            <span className="font-semibold text-green-600">{score}</span>
          </div>
          <div className="p-3 rounded border bg-gray-50 flex justify-between">
            <span>אחוז הצלחה</span>
            <span className="font-semibold">{percent}%</span>
          </div>
          {mode === "all" && (
            <div className="p-3 rounded border bg-gray-50 flex justify-between">
              <span>טעויות שנשמרו לתרגול</span>
              <span className="font-semibold text-red-600">{wrongIds.size}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button className="w-full p-3 rounded bg-black text-white font-bold hover:bg-gray-800 transition shadow-md" onClick={restartAll}>
            תרגול מחדש (הכל)
          </button>
          <button
            className="w-full p-3 rounded border-2 border-black font-bold disabled:opacity-30 shadow-sm hover:bg-gray-50 transition"
            disabled={wrongIds.size === 0}
            onClick={restartWrongOnly}
          >
            תרגלי רק טעויות ({wrongIds.size})
          </button>
          <button className="w-full p-3 rounded border hover:bg-gray-50 transition" onClick={onBack}>
            בחירת נושא אחר
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <button className="underline text-sm" onClick={onBack}>חזרה</button>
        {mode === "wrong" && (
          <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold ring-1 ring-red-300">
            מצב תרגול טעויות
          </span>
        )}
      </div>

      <h2 className="text-xl font-bold mb-2 text-start">{categoryName}</h2>
      <p className="text-sm mb-2 text-start text-gray-500">
        שאלה {index + 1} מתוך {currentQuestions.length}
      </p>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-2.5 rounded-full mb-6">
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
          style={{ width: `${((index + 1) / currentQuestions.length) * 100}%` }}
        />
      </div>

      <p className="mb-6 text-lg font-medium text-start leading-tight">{q?.text}</p>

      <div className="space-y-3">
        {q?.options.map((opt, i) => {
          let cls = "w-full p-4 border-2 rounded-xl text-start transition-all ";
          if (isAnswered) {
            if (i === q.correctIndex) cls += "bg-green-100 border-green-500 text-green-800 font-bold shadow-sm";
            else if (i === selected) cls += "bg-red-100 border-red-500 text-red-800 shadow-sm";
            else cls += "opacity-50 border-gray-100";
          } else {
            cls += "hover:bg-gray-50 border-gray-200 active:bg-gray-100 cursor-pointer shadow-sm";
          }

          return (
            <button key={i} className={cls} disabled={isAnswered} onClick={() => chooseAnswer(i)}>
              {opt}
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-start border border-blue-100 animate-in fade-in duration-300">
          <p className="font-bold mb-1">
            {selected === q.correctIndex ? "✔ יופי! תשובה נכונה" : "❌ טעות, לא נורא..."}
          </p>
          {q.explanation && <p className="text-sm text-gray-700 leading-relaxed">{q.explanation}</p>}
        </div>
      )}

      <button
        className="mt-8 w-full p-4 bg-black text-white rounded-xl font-bold disabled:opacity-50 shadow-lg transition-all active:scale-95"
        disabled={!isAnswered}
        onClick={nextQuestion}
      >
        {index === currentQuestions.length - 1 ? "לסיכום התרגול" : "המשך לשאלה הבאה"}
      </button>
    </>
  );
}