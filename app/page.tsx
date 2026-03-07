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

/* ---------- Home Component ---------- */
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
        setErrorMsg(`שגיאה בטעינת קטגוריות: ${error.message}`);
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
      setErrorMsg(`שגיאה בטעינת שאלות: ${error.message}`);
      setLoading(false);
      return;
    }

    const ui: UiQuestion[] = (data ?? []).map((q: any) => ({
      id: String(q.id),
      categoryId: String(q.category_id),
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
      <div className="bg-white rounded-xl shadow-md max-w-lg w-full p-6 text-center">
        {loading && <p className="py-4 text-gray-500">טוען נתונים...</p>}
        {errorMsg && <p className="text-red-600 mb-4">{errorMsg}</p>}
        
        {!loading && !selectedCategory && (
          <>
            <h1 className="text-2xl font-bold mb-4 text-right">בחרי נושא לתרגול</h1>
            <div className="space-y-2">
              {categories.map((c) => (
                <button key={c.id} className="w-full text-right p-4 border rounded-xl hover:bg-gray-50 transition" onClick={() => enterCategory(c)}>
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

/* ---------- Practice Component ---------- */
function Practice({ categoryName, questions, onBack }: { categoryName: string; questions: UiQuestion[]; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number | null>>({}); 
  const [isFinished, setIsFinished] = useState(false);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<UiQuestion[]>(questions);
  const [mode, setMode] = useState<"all" | "wrong">("all");

  useEffect(() => {
    setCurrentQuestions(questions);
    setIndex(0);
    setSelectedAnswers({});
    setIsFinished(false);
    setWrongIds([]);
    setMode("all");
  }, [questions]);

  const q = currentQuestions[index];
  const selectedForCurrent = selectedAnswers[index] ?? null;

  function chooseAnswer(i: number) {
    if (selectedForCurrent !== null || isFinished || !q) return;

    setSelectedAnswers(prev => ({ ...prev, [index]: i }));

    if (i !== q.correctIndex) {
      if (!wrongIds.includes(q.id)) {
        setWrongIds(prev => [...prev, q.id]);
      }
    }
  }

  // חישוב ציון בזמן אמת לפי התשובות שנשמרו
  const calculateScore = () => {
    let s = 0;
    currentQuestions.forEach((question, i) => {
      if (selectedAnswers[i] === question.correctIndex) s++;
    });
    return s;
  };

  if (currentQuestions.length === 0) return <div className="py-10"><p>אין שאלות.</p><button onClick={onBack} className="underline">חזרה</button></div>;

  if (isFinished) {
    const finalScore = calculateScore();
    return (
      <div className="text-right">
        <h2 className="text-xl font-bold mb-4">{mode === "wrong" ? "סיכום תרגול טעויות" : "סיימת את התרגול!"}</h2>
        <div className="bg-gray-50 p-4 rounded-lg space-y-2 mb-6 shadow-inner">
          <div className="flex justify-between"><span>סה"כ שאלות:</span> <b>{currentQuestions.length}</b></div>
          <div className="flex justify-between"><span>תשובות נכונות:</span> <b className="text-green-600">{finalScore}</b></div>
          {mode === "all" && (
            <div className="flex justify-between">
              <span>טעויות שנשמרו לתרגול:</span> 
              <b className="text-red-600">{wrongIds.length}</b>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button className="p-4 bg-black text-white rounded-xl font-bold shadow-md" onClick={() => { 
            setCurrentQuestions(questions); setMode("all"); setIndex(0); setSelectedAnswers({}); setIsFinished(false); setWrongIds([]); 
          }}>תרגול חדש (הכל)</button>
          
          <button 
            className="p-4 border-2 border-red-500 text-red-600 rounded-xl font-bold disabled:opacity-20 transition-all" 
            disabled={wrongIds.length === 0} 
            onClick={() => { 
              const filtered = questions.filter(item => wrongIds.includes(item.id));
              if (filtered.length > 0) {
                setCurrentQuestions(filtered);
                setMode("wrong");
                setIndex(0);
                setSelectedAnswers({});
                setIsFinished(false);
              }
            }}
          >
            תרגלי רק טעויות ({wrongIds.length})
          </button>
          
          <button className="p-4 border rounded-xl hover:bg-gray-50" onClick={onBack}>בחירת נושא אחר</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between text-sm mb-2 text-gray-500 items-center">
        <button onClick={onBack} className="underline">חזרה לתפריט</button>
        <span className="font-bold">{index + 1} / {currentQuestions.length}</span>
      </div>
      
      {/* מד התקדמות כחול */}
      <div className="w-full bg-gray-200 h-3 rounded-full mb-6 overflow-hidden">
        <div 
          className="bg-blue-600 h-full transition-all duration-500 ease-out" 
          style={{ width: `${((index + 1) / currentQuestions.length) * 100}%` }} 
        />
      </div>

      <p className="text-lg font-bold mb-6 text-right leading-snug min-h-[3rem]">{q?.text}</p>
      
      <div className="space-y-3">
        {q?.options.map((opt, i) => {
          let cls = "w-full p-4 border-2 rounded-xl text-right transition-all duration-200 ";
          if (selectedForCurrent !== null) {
            if (i === q.correctIndex) cls += "bg-green-100 border-green-500 text-green-800 font-bold shadow-sm";
            else if (i === selectedForCurrent) cls += "bg-red-100 border-red-500 text-red-800";
            else cls += "opacity-40 border-gray-100 scale-95";
          } else cls += "hover:bg-gray-50 border-gray-200 active:bg-gray-100";
          return <button key={i} className={cls} disabled={selectedForCurrent !== null} onClick={() => chooseAnswer(i)}>{opt}</button>;
        })}
      </div>

      {selectedForCurrent !== null && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 text-right animate-in slide-in-from-top-2 duration-300">
          <p className="font-bold text-blue-900">{selectedForCurrent === q.correctIndex ? "✔ כל הכבוד! תשובה נכונה" : "❌ לא נורא, טעות לומדים"}</p>
          {q.explanation && <p className="text-sm mt-1 text-gray-700 leading-relaxed">{q.explanation}</p>}
        </div>
      )}

      {/* אזור הניווט - כפתור חזור קטן וכפתור המשך גדול */}
      <div className="flex gap-3 mt-8">
        <button 
          className="flex-1 p-4 border-2 border-gray-300 rounded-xl font-bold disabled:opacity-10 hover:bg-gray-50 transition-all"
          disabled={index === 0}
          onClick={() => setIndex(prev => prev - 1)}
        >
          חזור
        </button>
        <button 
          className="flex-[2] p-4 bg-black text-white rounded-xl font-bold disabled:opacity-40 shadow-lg active:scale-95 transition-all" 
          disabled={selectedForCurrent === null} 
          onClick={() => {
            if (index >= currentQuestions.length - 1) setIsFinished(true);
            else setIndex(prev => prev + 1);
          }}
        >
          {index === currentQuestions.length - 1 ? "לתוצאות" : "המשך לשאלה הבאה"}
        </button>
      </div>
    </>
  );
}