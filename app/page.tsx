"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";

/* ---------- Types ---------- */
type CategoryRow = { id: string; name: string };
type UiQuestion = {
  id: string;
  categoryId: string;
  text: string;
  options: string[];
  correctIndex: number;
  type: string; 
};

/* ---------- Main Component ---------- */
export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);
  const [questions, setQuestions] = useState<UiQuestion[]>([]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { data: accessData, error: accessError } = await supabase
      .from("user_access")
      .select("category_name")
      .eq("email", emailInput.trim().toLowerCase());

    if (accessError || !accessData || accessData.length === 0) {
      setErrorMsg("לא נמצאו קורסים למייל זה");
      setLoading(false);
      return;
    }

    const allowedNames = accessData.map(item => item.category_name);
    const { data: categoriesData } = await supabase.from("categories").select("id, name").in("name", allowedNames);

    if (categoriesData) setCategories(categoriesData);
    setUserEmail(emailInput.trim().toLowerCase());
    setLoading(false);
  }

  async function startCategory(c: CategoryRow) {
    setLoading(true);
    const { data, error } = await supabase.from("questions").select("*").eq("category_id", c.id);
    if (error) {
      setLoading(false);
      return;
    }
    
    const mapped: UiQuestion[] = (data || []).map(q => ({
      id: String(q.id),
      categoryId: String(q.category_id),
      text: q.text,
      options: q.type === 'boolean' ? ["נכון", "לא נכון"] : [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean),
      correctIndex: Number(q.correct_index),
      type: q.type || 'multiple_choice'
    }));
    
    setQuestions(mapped);
    setSelectedCategory(c);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-start pt-6 font-sans" dir="rtl">
      <div className="mb-6 flex flex-col items-center">
        <div className="relative w-40 h-40 mb-2">
          <Image src="/logo.png" alt="לוגו" fill className="object-contain" priority />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-8 text-center border border-gray-100">
        {!userEmail ? (
          <form onSubmit={handleLogin} className="animate-in fade-in duration-500">
            <h1 className="text-2xl font-black mb-6 text-gray-800">התחברות לתרגול</h1>
            <input 
              type="email" 
              placeholder="המייל שלך"
              className="w-full p-4 border-2 border-gray-100 rounded-2xl mb-4 text-center dir-ltr focus:border-blue-500 outline-none"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
            />
            {errorMsg && <p className="text-red-500 mb-4 text-sm font-bold">{errorMsg}</p>}
            <button type="submit" disabled={loading} className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg">
              {loading ? "בודק..." : "כניסה"}
            </button>
          </form>
        ) : !selectedCategory ? (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
               <h1 className="text-xl font-black text-gray-800">הקורסים שלי</h1>
               <button onClick={() => setUserEmail(null)} className="text-xs text-blue-500 underline">החלף משתמש</button>
            </div>
            <div className="grid gap-4">
              {categories.map((c) => (
                <button key={c.id} className="w-full text-right p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-500 transition-all font-bold text-gray-700 shadow-sm text-lg" onClick={() => startCategory(c)}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <PracticeView allQuestions={questions} categoryName={selectedCategory.name} onExit={() => setSelectedCategory(null)} />
        )}
      </div>
      <p className="mt-10 text-gray-400 text-xs font-medium">כל הזכויות שמורות לאורלי בסביבה © 2026</p>
    </main>
  );
}

/* ---------- Practice View Component ---------- */
function PracticeView({ categoryName, allQuestions, onExit }: { categoryName: string, allQuestions: UiQuestion[], onExit: () => void }) {
  const [currentQuestions, setCurrentQuestions] = useState<UiQuestion[]>(allQuestions);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); 
  const [wrongIndices, setWrongIndices] = useState<Set<number>>(new Set());
  const [isFinished, setIsFinished] = useState(false);

  const q = currentQuestions[index];
  const userSelection = answers[index] !== undefined ? answers[index] : null;

  function handleSelect(i: number) {
    if (userSelection !== null) return; 
    setAnswers(prev => ({ ...prev, [index]: i }));
    if (i !== q.correctIndex) {
      setWrongIndices(prev => new Set(prev).add(index));
    }
  }

  function retryErrors() {
    const errorsOnly = currentQuestions.filter((_, i) => wrongIndices.has(i));
    setCurrentQuestions(errorsOnly);
    setIndex(0);
    setAnswers({});
    setWrongIndices(new Set());
    setIsFinished(false);
  }

  function resetAll() {
    setCurrentQuestions(allQuestions);
    setIndex(0);
    setAnswers({});
    setWrongIndices(new Set());
    setIsFinished(false);
  }

  if (isFinished) {
    const correctCount = currentQuestions.length - wrongIndices.size;
    const score = Math.round((correctCount / currentQuestions.length) * 100);

    return (
      <div className="text-center animate-in zoom-in duration-300">
        <h2 className="text-2xl font-black mb-2 text-gray-800">סיכום תרגול</h2>
        <p className="text-gray-500 mb-6">{categoryName}</p>
        
        <div className="mb-8">
          <div className={`text-6xl font-black mb-2 ${score >= 70 ? 'text-green-500' : 'text-orange-500'}`}>{score}</div>
          <p className="text-lg font-bold text-gray-700">ענית נכון על {correctCount} מתוך {currentQuestions.length}</p>
        </div>

        <div className="grid gap-3">
          {wrongIndices.size > 0 && (
            <button onClick={retryErrors} className="w-full p-4 bg-orange-500 text-white rounded-2xl font-bold shadow-lg hover:bg-orange-600 transition-all">
              תרגול טעויות בלבד ({wrongIndices.size})
            </button>
          )}
          <button onClick={resetAll} className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all">
            תרגול חוזר של הכל
          </button>
          <button onClick={onExit} className="w-full p-4 text-gray-400 underline font-medium">
            חזרה לתפריט הראשי
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-right">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onExit} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">✕ סגור</button>
        <span className="text-sm text-gray-400 font-bold">{index + 1} / {currentQuestions.length}</span>
      </div>
      
      <h3 className="text-xl font-bold mb-8 min-h-[4rem] text-gray-800 leading-tight">{q.text}</h3>
      
      <div className={`grid gap-3 mb-8 ${q.type === 'boolean' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {q.options.map((opt, i) => {
          let style = "w-full p-4 border-2 rounded-2xl text-right transition-all text-lg ";
          if (userSelection !== null) {
            if (i === q.correctIndex) style += "bg-green-50 border-green-500 text-green-700 font-bold shadow-inner";
            else if (i === userSelection) style += "bg-red-50 border-red-500 text-red-700";
            else style += "opacity-40 border-gray-50";
          } else style += "border-gray-100 hover:border-blue-200 hover:bg-blue-50 shadow-sm";
          
          return (
            <button key={i} onClick={() => handleSelect(i)} disabled={userSelection !== null} className={style}>
              {opt}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={() => index > 0 && setIndex(index - 1)} disabled={index === 0} className="flex-1 p-4 border-2 border-gray-200 rounded-2xl font-bold text-gray-400 disabled:opacity-0 transition-all">חזור</button>
        <button 
          onClick={() => index < currentQuestions.length - 1 ? setIndex(index + 1) : setIsFinished(true)} 
          disabled={userSelection === null} 
          className="flex-[2] p-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg disabled:bg-gray-200 transition-all active:scale-95"
        >
          {index < currentQuestions.length - 1 ? "המשך לשאלה הבאה" : "סיים תרגול"}
        </button>
      </div>
    </div>
  );
}