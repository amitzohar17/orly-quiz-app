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
  correctIndex: number | null;
  correct_indices: number[] | null;
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
      correctIndex: q.correct_index !== null ? Number(q.correct_index) : null,
      correct_indices: q.correct_indices,
      type: q.type || 'multiple_choice'
    }));
    
    setQuestions(mapped);
    setSelectedCategory(c);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-start pt-6 font-sans" dir="rtl">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="relative w-32 h-32 mb-2">
          <Image src="/logo.png" alt="לוגו" fill className="object-contain" priority />
        </div>
        <h2 className="text-xl font-black text-gray-700">אורלי בסביבה</h2>
      </div>

      <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-8 border border-gray-100 min-h-[450px] flex flex-col">
        {!userEmail ? (
          <form onSubmit={handleLogin} className="animate-in fade-in duration-500">
            <h1 className="text-2xl font-black mb-6 text-center text-gray-800">התחברות</h1>
            <input 
              type="email" 
              placeholder="המייל שלך"
              className="w-full p-4 border-2 border-gray-100 rounded-2xl mb-4 text-center dir-ltr focus:border-blue-500 outline-none"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
            />
            {errorMsg && <p className="text-red-500 mb-4 text-center font-bold text-sm">{errorMsg}</p>}
            <button type="submit" disabled={loading} className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg">
              {loading ? "מתחבר..." : "כניסה"}
            </button>
          </form>
        ) : !selectedCategory ? (
          <div className="animate-in fade-in">
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-black text-gray-800">הקורסים שלי:</h1>
                <button onClick={() => setUserEmail(null)} className="text-xs text-blue-500 underline">החלף משתמש</button>
             </div>
             <div className="grid gap-4">
              {categories.map((c) => (
                <button key={c.id} className="w-full text-right p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-500 transition-all font-bold text-gray-700 shadow-sm" onClick={() => startCategory(c)}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <PracticeView allQuestions={questions} categoryName={selectedCategory.name} onExit={() => setSelectedCategory(null)} />
        )}
      </div>
      <p className="mt-8 text-gray-400 text-xs font-medium">© 2026 כל הזכויות שמורות - אורלי בסביבה</p>
    </main>
  );
}

/* ---------- Practice View Component ---------- */
function PracticeView({ categoryName, allQuestions, onExit }: { categoryName: string, allQuestions: UiQuestion[], onExit: () => void }) {
  const [currentQuestions, setCurrentQuestions] = useState<UiQuestion[]>(allQuestions);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({}); 
  const [wrongIndices, setWrongIndices] = useState<Set<number>>(new Set());
  const [isFinished, setIsFinished] = useState(false);
  const [showMultiFeedback, setShowMultiFeedback] = useState(false);

  const q = currentQuestions[index];
  const userSelection = answers[index];

  function handleSelect(i: number) {
    if (q.type === 'multi') {
      if (showMultiFeedback) return;
      const currentSel = Array.isArray(userSelection) ? userSelection : [];
      const newSel = currentSel.includes(i) ? currentSel.filter(item => item !== i) : [...currentSel, i];
      setAnswers({ ...answers, [index]: newSel });
    } else {
      if (userSelection !== undefined) return;
      setAnswers({ ...answers, [index]: i });
      if (i !== q.correctIndex) setWrongIndices(prev => new Set(prev).add(index));
    }
  }

  function checkMulti() {
    const correctOnes = q.correct_indices || [];
    const userOnes = answers[index] || [];
    const isCorrect = correctOnes.length === userOnes.length && correctOnes.every((v:any) => userOnes.includes(v));
    if (!isCorrect) setWrongIndices(prev => new Set(prev).add(index));
    setShowMultiFeedback(true);
  }

  function retryErrors() {
    const errorsOnly = currentQuestions.filter((_, i) => wrongIndices.has(i));
    setCurrentQuestions(errorsOnly);
    setIndex(0);
    setAnswers({});
    setWrongIndices(new Set());
    setIsFinished(false);
    setShowMultiFeedback(false);
  }

  function resetAll() {
    setCurrentQuestions(allQuestions);
    setIndex(0);
    setAnswers({});
    setWrongIndices(new Set());
    setIsFinished(false);
    setShowMultiFeedback(false);
  }

  if (isFinished) {
    const correctCount = currentQuestions.length - wrongIndices.size;
    const score = Math.round((correctCount / currentQuestions.length) * 100);
    return (
      <div className="text-center animate-in zoom-in duration-300">
        <h2 className="text-2xl font-black mb-2 text-gray-800">סיכום תרגול</h2>
        <div className="mb-8 p-6 bg-gray-50 rounded-2xl">
          <div className={`text-6xl font-black mb-2 ${score >= 70 ? 'text-green-500' : 'text-orange-500'}`}>{score}</div>
          <p className="text-lg font-bold">ענית נכון על {correctCount} מתוך {currentQuestions.length}</p>
        </div>
        <div className="grid gap-3">
          {wrongIndices.size > 0 && (
            <button onClick={retryErrors} className="w-full p-4 bg-orange-500 text-white rounded-2xl font-bold shadow-lg">תרגול טעויות ({wrongIndices.size})</button>
          )}
          <button onClick={resetAll} className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg">תרגול חוזר</button>
          <button onClick={onExit} className="w-full p-4 text-gray-400 underline">חזרה לתפריט</button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-right flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onExit} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">✕ סגור</button>
        <span className="text-sm text-gray-400 font-bold">{index + 1} / {currentQuestions.length}</span>
      </div>
      <h3 className="text-xl font-bold mb-2 text-gray-800 leading-tight">{q.text}</h3>
      {q.type === 'multi' && <p className="text-blue-500 text-sm mb-6 font-bold">בחרי את כל התשובות הנכונות:</p>}
      
      <div className={`grid gap-3 mb-8 ${q.type === 'boolean' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {q.options.map((opt, i) => {
          let style = "w-full p-4 border-2 rounded-2xl text-right transition-all text-lg ";
          if (q.type === 'multi') {
            const isSelected = Array.isArray(userSelection) && userSelection.includes(i);
            const isCorrect = q.correct_indices?.includes(i);
            if (showMultiFeedback) {
              if (isCorrect) style += "bg-green-50 border-green-500 text-green-700 font-bold shadow-inner";
              else if (isSelected) style += "bg-red-50 border-red-500 text-red-700";
              else style += "opacity-40 border-gray-50";
            } else style += isSelected ? "border-blue-600 bg-blue-50 shadow-md" : "border-gray-100";
          } else {
            if (userSelection !== undefined) {
              if (i === q.correctIndex) style += "bg-green-50 border-green-500 text-green-700 font-bold shadow-inner";
              else if (i === userSelection) style += "bg-red-50 border-red-500 text-red-700";
              else style += "opacity-40 border-gray-50";
            } else style += "border-gray-100 hover:border-blue-100";
          }
          return (
            <button key={i} onClick={() => handleSelect(i)} className={style}>
              {q.type === 'multi' && <span className="ml-2 font-mono">{Array.isArray(userSelection) && userSelection.includes(i) ? '☑' : '☐'}</span>}
              {opt}
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex gap-3">
        <button onClick={() => { setIndex(index - 1); setShowMultiFeedback(false); }} disabled={index === 0} className="flex-1 p-4 border-2 border-gray-200 rounded-2xl font-bold text-gray-400 disabled:opacity-0 transition-all">חזור</button>
        {q.type === 'multi' && !showMultiFeedback ? (
          <button onClick={checkMulti} disabled={!userSelection || userSelection.length === 0} className="flex-[2] p-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg">בדוק</button>
        ) : (
          <button onClick={() => { if (index < currentQuestions.length - 1) { setIndex(index + 1); setShowMultiFeedback(false); } else setIsFinished(true); }} disabled={userSelection === undefined} className="flex-[2] p-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg transition-all">
            {index < currentQuestions.length - 1 ? "המשך" : "סיים תרגול"}
          </button>
        )}
      </div>
    </div>
  );
}