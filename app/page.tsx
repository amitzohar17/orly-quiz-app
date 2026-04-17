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
    if (error) { setLoading(false); return; }
    
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
    <main className="min-h-screen bg-[#F8F9FA] p-6 flex flex-col items-center font-sans text-[#2D3436]" dir="rtl">
      <div className="mb-10 flex flex-col items-center">
        <div className="relative w-32 h-32 mb-4 bg-white rounded-full shadow-sm flex items-center justify-center p-4">
          <Image src="/logo.png" alt="לוגו" fill className="object-contain p-2" priority />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-gray-800">אורלי בסביבה</h2>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 max-w-lg w-full p-10 border border-gray-50 min-h-[500px] flex flex-col transition-all">
        {!userEmail ? (
          <form onSubmit={handleLogin} className="animate-in fade-in slide-in-from-top-4">
            <h1 className="text-3xl font-black mb-8 text-center">ברוכים הבאים</h1>
            <input 
              type="email" 
              placeholder="המייל שלך"
              className="w-full p-5 bg-gray-50 border-none rounded-3xl mb-4 text-center text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
            />
            {errorMsg && <p className="text-red-500 mb-4 text-center font-bold">{errorMsg}</p>}
            <button type="submit" disabled={loading} className="w-full p-5 bg-blue-600 text-white rounded-3xl font-black text-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
              {loading ? "מתחבר..." : "כניסה לתרגול"}
            </button>
          </form>
        ) : !selectedCategory ? (
          <div className="animate-in fade-in zoom-in-95">
             <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-black">הקורסים שלי</h1>
                <button onClick={() => setUserEmail(null)} className="text-sm font-bold text-blue-500 underline">החלף</button>
             </div>
             <div className="grid gap-4">
              {categories.map((c) => (
                <button key={c.id} className="w-full text-right p-6 bg-white border-2 border-gray-100 rounded-[1.8rem] hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-gray-700 text-lg flex justify-between items-center group" onClick={() => startCategory(c)}>
                  {c.name}
                  <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all">←</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <PracticeView allQuestions={questions} categoryName={selectedCategory.name} onExit={() => setSelectedCategory(null)} />
        )}
      </div>
    </main>
  );
}

function PracticeView({ categoryName, allQuestions, onExit }: { categoryName: string, allQuestions: UiQuestion[], onExit: () => void }) {
  const [currentQuestions, setCurrentQuestions] = useState<UiQuestion[]>(allQuestions);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({}); 
  const [wrongIndices, setWrongIndices] = useState<Set<number>>(new Set());
  const [isFinished, setIsFinished] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const q = currentQuestions[index];
  const userSelection = answers[index];

  function handleSelect(i: number) {
    if (showFeedback) return;

    if (q.type === 'multi') {
      const currentSel = Array.isArray(userSelection) ? userSelection : [];
      const newSel = currentSel.includes(i) ? currentSel.filter(item => item !== i) : [...currentSel, i];
      setAnswers({ ...answers, [index]: newSel });
    } else if (q.type === 'order') {
      const currentOrder = Array.isArray(userSelection) ? userSelection : [];
      const newOrder = currentOrder.includes(i) ? currentOrder.filter(item => item !== i) : [...currentOrder, i];
      setAnswers({ ...answers, [index]: newOrder });
    } else {
      if (userSelection !== undefined) return;
      setAnswers({ ...answers, [index]: i });
      if (i !== q.correctIndex) setWrongIndices(prev => new Set(prev).add(index));
    }
  }

  function checkAnswer() {
    const correctOnes = q.correct_indices || [];
    const userOnes = answers[index] || [];
    const isCorrect = correctOnes.length === userOnes.length && correctOnes.every((v, idx) => q.type === 'order' ? v === userOnes[idx] : userOnes.includes(v));
    if (!isCorrect) setWrongIndices(prev => new Set(prev).add(index));
    setShowFeedback(true);
  }

  if (isFinished) {
    const correctCount = currentQuestions.length - wrongIndices.size;
    const score = Math.round((correctCount / currentQuestions.length) * 100);
    return (
      <div className="text-center animate-in zoom-in duration-300 flex flex-col items-center justify-center flex-1">
        <h2 className="text-3xl font-black mb-6">סיכום תרגול</h2>
        <div className="w-40 h-40 rounded-full border-8 border-blue-50 flex items-center justify-center mb-8 bg-blue-50/30">
          <div className={`text-5xl font-black ${score >= 70 ? 'text-green-500' : 'text-orange-500'}`}>{score}</div>
        </div>
        <p className="text-xl font-bold mb-10 text-gray-600">הצלחת ב-{correctCount} מתוך {currentQuestions.length}</p>
        <div className="grid gap-4 w-full">
          {wrongIndices.size > 0 && (
            <button onClick={() => {
              const errorsOnly = currentQuestions.filter((_, i) => wrongIndices.has(i));
              setCurrentQuestions(errorsOnly); setIndex(0); setAnswers({}); setWrongIndices(new Set()); setIsFinished(false); setShowFeedback(false);
            }} className="w-full p-5 bg-orange-500 text-white rounded-[1.8rem] font-black shadow-lg">תרגול טעויות ({wrongIndices.size})</button>
          )}
          <button onClick={onExit} className="w-full p-5 bg-gray-900 text-white rounded-[1.8rem] font-black">חזרה לתפריט</button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-right flex flex-col h-full flex-1">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onExit} className="text-sm font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-all">✕ סגור</button>
        <div className="h-2 flex-1 mx-4 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${((index + 1) / currentQuestions.length) * 100}%` }}></div>
        </div>
        <span className="text-sm font-bold text-gray-400">{index + 1}/{currentQuestions.length}</span>
      </div>

      <h3 className="text-2xl font-black mb-2 leading-tight">{q.text}</h3>
      <p className="text-blue-500 text-sm mb-8 font-bold">
        {q.type === 'multi' ? "בחרי את כל התשובות הנכונות" : q.type === 'order' ? "סדרי את האפשרויות לפי הסדר הנכון" : ""}
      </p>
      
      <div className={`grid gap-3 mb-10 ${q.type === 'boolean' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {q.options.map((opt, i) => {
          let style = "w-full p-5 border-2 rounded-[1.5rem] text-right transition-all text-lg font-bold flex items-center justify-between ";
          const isSelectedOrder = Array.isArray(userSelection) && userSelection.indexOf(i) !== -1;
          
          if (showFeedback) {
            const isCorrect = q.type === 'order' ? q.correct_indices?.[Array.isArray(userSelection) ? userSelection.indexOf(i) : -1] === i : (q.type === 'multi' ? q.correct_indices?.includes(i) : i === q.correctIndex);
            if (isCorrect) style += "bg-green-50 border-green-500 text-green-700 shadow-inner";
            else if (Array.isArray(userSelection) ? userSelection.includes(i) : userSelection === i) style += "bg-red-50 border-red-500 text-red-700";
            else style += "opacity-40 grayscale-[0.5]";
          } else {
            if (Array.isArray(userSelection) ? userSelection.includes(i) : userSelection === i) style += "border-blue-500 bg-blue-50 shadow-md transform scale-[1.02]";
            else style += "border-gray-100 hover:border-gray-200 hover:bg-gray-50";
          }
          
          return (
            <button key={i} onClick={() => handleSelect(i)} className={style}>
              <span>{opt}</span>
              {(q.type === 'order' || q.type === 'multi') && Array.isArray(userSelection) && userSelection.includes(i) && (
                <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">
                  {q.type === 'order' ? userSelection.indexOf(i) + 1 : '✓'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex gap-4">
        {(q.type === 'multi' || q.type === 'order') && !showFeedback ? (
          <button onClick={checkAnswer} disabled={!userSelection || userSelection.length < (q.type === 'order' ? q.options.length : 1)} className="w-full p-5 bg-blue-600 text-white rounded-3xl font-black text-xl shadow-lg disabled:bg-gray-200 transition-all">
            בדיקה
          </button>
        ) : (
          <button onClick={() => { if (index < currentQuestions.length - 1) { setIndex(index + 1); setShowFeedback(false); } else setIsFinished(true); }} disabled={userSelection === undefined} className="w-full p-5 bg-gray-900 text-white rounded-3xl font-black text-xl shadow-lg transition-all active:scale-95">
            {index < currentQuestions.length - 1 ? "המשך לשאלה הבאה" : "סיים תרגול"}
          </button>
        )}
      </div>
    </div>
  );
}