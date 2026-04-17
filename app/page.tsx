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
    if (!emailInput.includes("@")) {
      setErrorMsg("נא להזין אימייל תקין");
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    // 1. מחפשים אילו שמות קורסים משויכים למייל הזה בטבלת user_access
    const { data: accessData, error: accessError } = await supabase
      .from("user_access")
      .select("category_name")
      .eq("email", emailInput.trim().toLowerCase());

    if (accessError || !accessData || accessData.length === 0) {
      setErrorMsg("לא נמצאו קורסים המשויכים לאימייל זה");
      setLoading(false);
      return;
    }

    const allowedNames = accessData.map(item => item.category_name);

    // 2. שולפים את הפרטים של הקורסים האלה מטבלת categories
    const { data: categoriesData, error: catError } = await supabase
      .from("categories")
      .select("id, name")
      .in("name", allowedNames);

    if (catError || !categoriesData || categoriesData.length === 0) {
      setErrorMsg("חלה שגיאה בשליפת נתוני הקורסים");
      setLoading(false);
      return;
    }

    setCategories(categoriesData);
    setUserEmail(emailInput.trim().toLowerCase());
    setLoading(false);
  }

  async function startCategory(c: CategoryRow) {
    setLoading(true);
    const { data, error } = await supabase.from("questions").select("*").eq("category_id", c.id);
    if (error) {
      setErrorMsg("שגיאה בטעינת שאלות");
      setLoading(false);
      return;
    }
    const mapped: UiQuestion[] = (data || []).map(q => ({
      id: String(q.id),
      categoryId: String(q.category_id),
      text: q.text,
      options: [q.option_a, q.option_b, q.option_c, q.option_d],
      correctIndex: Number(q.correct_index)
    }));
    setQuestions(mapped);
    setSelectedCategory(c);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-start pt-6 font-sans" dir="rtl">
      <div className="mb-6 flex flex-col items-center">
        <div className="relative w-40 h-40 mb-2">
          <Image src="/logo.png" alt="לוגו אורלי בסביבה" fill className="object-contain" priority />
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
            <button type="submit" disabled={loading} className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50">
              {loading ? "בודק..." : "כניסה"}
            </button>
          </form>
        ) : !selectedCategory ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
               <h1 className="text-xl font-black text-gray-800">נושאים לתרגול</h1>
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
  const [mode, setMode] = useState<"all" | "errors">("all");
  const [currentList, setCurrentList] = useState<UiQuestion[]>(allQuestions);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); 
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());
  const [isFinished, setIsFinished] = useState(false);

  const q = currentList[index];
  const userSelection = answers[index] !== undefined ? answers[index] : null;

  function handleSelect(i: number) {
    if (userSelection !== null) return; 
    setAnswers(prev => ({ ...prev, [index]: i }));
    if (i !== q.correctIndex) setWrongIds(prev => new Set(prev).add(q.id));
  }

  if (isFinished) {
    const correctCount = currentList.filter((item, i) => answers[i] === item.correctIndex).length;
    const finalScore = Math.round((correctCount / currentList.length) * 100);
    return (
      <div className="text-right">
        <h2 className="text-2xl font-bold mb-6 text-center">סיימת!</h2>
        <div className="text-center mb-8">
           <p className="text-gray-500 text-sm">הציון שלך:</p>
           <div className={`text-7xl font-black ${finalScore >= 70 ? 'text-green-500' : 'text-orange-500'}`}>{finalScore}</div>
        </div>
        <div className="grid gap-3">
          <button onClick={() => { setIndex(0); setAnswers({}); setWrongIds(new Set()); setIsFinished(false); }} className="p-4 bg-blue-600 text-white rounded-2xl font-bold">תרגול חדש</button>
          <button onClick={onExit} className="p-4 text-gray-400 underline">חזרה לתפריט</button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-right">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onExit} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">✕ סגור</button>
        <span className="text-sm text-gray-400 font-bold">{index + 1} / {currentList.length}</span>
      </div>
      <h3 className="text-xl font-bold mb-8 min-h-[4rem]">{q.text}</h3>
      <div className="grid gap-3 mb-8">
        {q.options.map((opt, i) => {
          let style = "w-full p-4 border-2 rounded-2xl text-right transition-all ";
          if (userSelection !== null) {
            if (i === q.correctIndex) style += "bg-green-50 border-green-500 text-green-700 font-bold";
            else if (i === userSelection) style += "bg-red-50 border-red-500 text-red-700";
            else style += "opacity-40 border-gray-50";
          } else style += "border-gray-100 hover:border-blue-200";
          return <button key={i} onClick={() => handleSelect(i)} disabled={userSelection !== null} className={style}>{opt}</button>;
        })}
      </div>
      <div className="flex gap-3">
        <button onClick={() => index > 0 && setIndex(index - 1)} disabled={index === 0} className="flex-1 p-4 border-2 rounded-2xl disabled:opacity-0">חזור</button>
        <button onClick={() => index < currentList.length - 1 ? setIndex(index + 1) : setIsFinished(true)} disabled={userSelection === null} className="flex-[2] p-4 bg-gray-900 text-white rounded-2xl font-bold">המשך</button>
      </div>
    </div>
  );
}
