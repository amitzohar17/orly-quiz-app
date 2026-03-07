"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/* ---------- Types ---------- */
type CategoryRow = { id: string; name: string };
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
        setErrorMsg(`שגיאת קטגוריות: ${error.message}`);
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
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("questions")
      .select("id,category_id,text,option_a,option_b,option_c,option_d,correct_index,explanation")
      .eq("category_id", c.id);

    if (error) {
      setErrorMsg(`שגיאת שאלות: ${error.message}`);
      setLoading(false);
      return;
    }

    const ui: UiQuestion[] = (data ?? []).map((q: any) => ({
      id: String(q.id),
      categoryId: q.category_id,
      text: q.text,
      options: [q.option_a, q.option_b, q.option_c, q.option_d],
      correctIndex: Number(q.correct_index),
      explanation: q.explanation ?? undefined,
    }));

    setQuestions(ui);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-xl shadow-md max-w-lg w-full p-6">
        {loading && <p className="text-center py-4 text-gray-500">טוען נתונים...</p>}
        {errorMsg && <p className="text-red-600 text-center mb-4">{errorMsg}</p>}
        
        {!loading && !selectedCategory && (
          <>
            <h1 className="text-2xl font-bold mb-4">בחרי נושא לתרגול</h1>
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

/* ---------- Practice Component (With Navigation Logic) ---------- */
function Practice({ categoryName, questions, onBack }: { categoryName: string; questions: UiQuestion[]; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number | null>>({}); 
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<UiQuestion[]>(questions);
  const [mode, setMode] = useState<"all" | "wrong">("all");

  useEffect(() => {
    setCurrentQuestions(questions);
    setIndex(0);
    setSelectedAnswers({});
    setIsFinished(false);
    setScore(0);
    setWrongIds([]);
    setMode("all");
  }, [questions]);

  const q = currentQuestions[index];
  const selectedForCurrent = selectedAnswers[index] ?? null;

  function chooseAnswer(i: number) {
    if (selectedForCurrent !== null || isFinished || !q) return;

    // שמירת התשובה בזיכרון הניווט
    setSelectedAnswers(prev => ({ ...prev, [index]: i }));

    if (i === q.correctIndex) {
      setScore(prev => prev + 1);
    } else {
      if (!wrongIds.includes(q.id)) {
        setWrongIds(prev => [...prev, q.id]);
      }
    }
  }

  function nextQuestion() {
    if (index >= currentQuestions.length - 1) {
      setIsFinished(true);
    } else {
      setIndex(prev => prev + 1);
    }
  }

  function prevQuestion() {
    if (index > 0) {
      setIndex(prev => prev - 1);
    }
  }

  if (currentQuestions.length === 0) return <div className="text-center py-10"><p>אין שאלות בנושא זה.</p><button onClick={onBack} className="underline">חזרה</button></div>;

  if (isFinished) {
    return (
      <div className="text-start">
        <h2 className="text-xl font-bold mb-4">{mode === "wrong" ? "סיכום טעויות" : "סיימת!"}</h2>
        <div className="bg-gray-50 p-4 rounded-lg space-y-2 mb-6">
          <div className="flex justify-between"><span>נכונות:</span> <b className="text-green-600">{score}</b></div>
          {mode === "all" && <div className="flex justify-between"><span>טעויות לתרגול:</span> <b className="text-red-600">{wrongIds.length}</b></div>}
        </div>
        <div className="flex flex-col gap-2">
          <button className="p-4 bg-black text-white rounded-xl font-bold" onClick={() => { setCurrentQuestions(questions); setMode("all"); setIndex(0); setSelectedAnswers({}); setScore(0); setIsFinished(false); setWrongIds([]); }}>תרגול חדש</button>
          <button className="p-4 border-2 border-black rounded-xl font-bold disabled:opacity-30" disabled={wrongIds.length === 0} onClick={() => { const filtered = questions.filter(item => wrongIds.includes(item.id)); if (filtered.length > 0) { setCurrentQuestions(filtered); setMode("wrong"); setIndex(0); setSelectedAnswers({}); setScore(0); setIsFinished(false); } }}>תרגלי רק טעויות ({wrongIds.length})</button>
          <button className="p-4 border rounded-xl" onClick={onBack}>חזרה לנושאים</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between text-sm mb-2 text-gray-500">
        <button onClick={onBack} className="underline">חזרה</button>
        <span>{index + 1} / {currentQuestions.length}</span>
      </div>
      <div className="w-full bg-gray-200 h-2.5 rounded-full mb-6">
        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${((index + 1) / currentQuestions.length) * 100}%` }} />
      </div>
      <p className="text-lg font-bold mb-6 text-start leading-tight">{q?.text}</p>
      <div className="space-y-3">
        {q?.options.map((opt, i) => {
          let cls = "w-full p-4 border-2 rounded-xl text-start transition-all ";
          if (selectedForCurrent !== null) {
            if (i === q.correctIndex) cls += "bg-green-100 border-green-500 text-green-800 font-bold";
            else if (i === selectedForCurrent) cls += "bg-red-100 border-red-500 text-red-800";
            else cls += "opacity-40 border-gray-100";
          } else cls += "hover:bg-gray-50 border-gray-200";
          return <button key={i} className={cls} disabled={selectedForCurrent !== null} onClick={() => chooseAnswer(i)}>{opt}</button>;
        })}
      </div>
      {selectedForCurrent !== null && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 text-start animate-in fade-in duration-300">
          <p className="font-bold">{selectedForCurrent === q.correctIndex ? "✔ נכון מאוד!" : "❌ טעות, לא נורא..."}</p>
          {q.explanation && <p className="text-sm mt-1 text-gray-700">{q.explanation}</p>}
        </div>
      )}

      {/* אזור הכפתורים המשולב - כאן השינוי המרכזי! */}
      <div className="flex gap-3 mt-8">
        <button 
          className="flex-1 p-4 border-2 border-black rounded-xl font-bold disabled:opacity-10 transition-all active:scale-95"
          disabled={index === 0}
          onClick={prevQuestion}
        >
          חזור
        </button>
        <button 
          className="flex-[2] p-4 bg-black text-white rounded-xl font-bold disabled:opacity-50 shadow-md transition-all active:scale-95" 
          disabled={selectedForCurrent === null} 
          onClick={nextQuestion}
        >
          {index === currentQuestions.length - 1 ? "לתוצאות" : "המשך לשאלה הבאה"}
        </button>
      </div>
    </>
  );
}