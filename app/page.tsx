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
  correctIndex: number | null; // יכול להיות ריק ב-Multi
  correct_indices: number[] | null; // העמודה החדשה לריבוי תשובות
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
      correct_indices: q.correct_indices, // קורא את המערך מה-DB
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
            <h1 className="text-2xl font-black mb-6">התחברות לתרגול</h1>
            <input 
              type="email" 
              placeholder="המייל שלך"
              className="w-full p-4 border-2 border-gray-100 rounded-2xl mb-4 text-center dir-ltr"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
            />
            {errorMsg && <p className="text-red-500 mb-4 font-bold">{errorMsg}</p>}
            <button type="submit" disabled={loading} className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg">כניסה</button>
          </form>
        ) : !selectedCategory ? (
          <div className="animate-in fade-in">
             <h1 className="text-xl font-black mb-6 text-gray-800">הקורסים שלי</h1>
             <div className="grid gap-4">
              {categories.map((c) => (
                <button key={c.id} className="w-full text-right p-6 bg-white border-2 border-gray-100 rounded-2xl font-bold" onClick={() => startCategory(c)}>
                  {c.name}
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

  if (isFinished) {
    const correctCount = currentQuestions.length - wrongIndices.size;
    return (
      <div className="text-center">
        <h2 className="text-2xl font-black mb-4">סיכום</h2>
        <p className="text-4xl font-black text-blue-600 mb-4">{Math.round((correctCount/currentQuestions.length)*100)}%</p>
        <button onClick={onExit} className="p-4 bg-blue-600 text-white rounded-2xl w-full font-bold">סיום</button>
      </div>
    );
  }

  return (
    <div className="text-right">
      <div className="flex justify-between items-center mb-4 text-gray-400 font-bold">
        <span>{index + 1} / {currentQuestions.length}</span>
        <span>{categoryName}</span>
      </div>
      <h3 className="text-xl font-bold mb-2">{q.text}</h3>
      {q.type === 'multi' && <p className="text-blue-500 text-sm mb-6">בחרו את כל התשובות הנכונות:</p>}
      
      <div className={`grid gap-3 mb-8 ${q.type === 'boolean' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {q.options.map((opt, i) => {
          let style = "w-full p-4 border-2 rounded-2xl text-right transition-all ";
          if (q.type === 'multi') {
            const isSelected = Array.isArray(userSelection) && userSelection.includes(i);
            const isCorrect = q.correct_indices?.includes(i);
            if (showMultiFeedback) {
              if (isCorrect) style += "bg-green-50 border-green-500 text-green-700 font-bold";
              else if (isSelected) style += "bg-red-50 border-red-500 text-red-700";
              else style += "opacity-40";
            } else style += isSelected ? "border-blue-600 bg-blue-50" : "border-gray-100";
          } else {
            if (userSelection !== undefined) {
              if (i === q.correctIndex) style += "bg-green-50 border-green-500 text-green-700 font-bold";
              else if (i === userSelection) style += "bg-red-50 border-red-500 text-red-700";
              else style += "opacity-40";
            } else style += "border-gray-100 hover:border-blue-100";
          }
          return <button key={i} onClick={() => handleSelect(i)} className={style}>{opt}</button>;
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={() => { setIndex(index - 1); setShowMultiFeedback(false); }} disabled={index === 0} className="flex-1 p-4 border-2 rounded-2xl">חזור</button>
        {q.type === 'multi' && !showMultiFeedback ? (
          <button onClick={checkMulti} disabled={!userSelection || userSelection.length === 0} className="flex-[2] p-4 bg-blue-600 text-white rounded-2xl font-bold">בדוק</button>
        ) : (
          <button onClick={() => { if (index < currentQuestions.length - 1) { setIndex(index + 1); setShowMultiFeedback(false); } else setIsFinished(true); }} disabled={userSelection === undefined} className="flex-[2] p-4 bg-gray-900 text-white rounded-2xl font-bold">המשך</button>
        )}
      </div>
    </div>
  );
}