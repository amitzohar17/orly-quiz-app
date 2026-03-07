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
        setErrorMsg("שגיאה בטעינה");
        setLoading(false);
        return;
      }
      const forbidden = ["נהלים", "בטיחות"];
      const filtered = (data || []).filter(c => !forbidden.includes(c.name));
      setCategories(filtered);
      setLoading(false);
    }
    loadCategories();
  }, []);

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
      
      {/* --- לוגו אורלי בסביבה --- */}
      <div className="mb-6 flex flex-col items-center animate-in fade-in duration-1000">
        <div className="relative w-32 h-32 mb-2">
          <Image 
            src="/logo.png" 
            alt="לוגו אורלי בסביבה" 
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-6 text-center border border-gray-100">
        {loading && <p className="py-8 text-gray-400 font-bold animate-pulse text-lg">טוען נתונים...</p>}
        {errorMsg && <p className="text-red-500 mb-4">{errorMsg}</p>}
        
        {!loading && !selectedCategory && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-2xl font-black mb-8 text-gray-800">מוכנה לתרגל?</h1>
            <div className="grid gap-4">
              {categories.map((c) => (
                <button 
                  key={c.id} 
                  className="w-full text-right p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-gray-700 shadow-sm text-lg" 
                  onClick={() => startCategory(c)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && selectedCategory && (
          <PracticeView 
            categoryName={selectedCategory.name} 
            allQuestions={questions} 
            onExit={() => setSelectedCategory(null)} 
          />
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
    if (i !== q.correctIndex) {
      setWrongIds(prev => new Set(prev).add(q.id));
    }
  }

  if (isFinished) {
    const correctCount = currentList.filter((item, i) => answers[i] === item.correctIndex).length;
    const finalScore = Math.round((correctCount / currentList.length) * 100);

    return (
      <div className="text-right animate-in zoom-in-95 duration-300">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">{mode === "errors" ? "סיכום טעויות" : "סיימת!"}</h2>
        <div className="mb-8 text-center">
          <p className="text-gray-500 text-sm mb-1">הציון שלך:</p>
          <div className={`text-7xl font-black ${finalScore >= 70 ? 'text-green-500' : 'text-orange-500'}`}>{finalScore}</div>
        </div>
        <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100 shadow-inner space-y-3">
          <div className="flex justify-between"><span>סה"כ שאלות:</span><b className="text-gray-700">{currentList.length}</b></div>
          <div className="flex justify-between text-green-600"><span>תשובות נכונות:</span><b className="text-lg">{correctCount}</b></div>
          {mode === "all" && <div className="flex justify-between text-red-500 border-t pt-2 font-bold"><span>מספר טעויות:</span><b className="text-lg">{wrongIds.size}</b></div>}
        </div>
        <div className="grid gap-3">
          <button onClick={() => { setMode("all"); setCurrentList(allQuestions); setIndex(0); setAnswers({}); setWrongIds(new Set()); setIsFinished(false); }} className="p-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all">תרגול חדש</button>
          {wrongIds.size > 0 && mode === "all" && (
            <button onClick={() => { setCurrentList(allQuestions.filter(x => wrongIds.has(x.id))); setMode("errors"); setIndex(0); setAnswers({}); setIsFinished(false); }} className="p-4 border-2 border-red-500 text-red-600 rounded-2xl font-bold hover:bg-red-50 active:scale-95 transition-all">תרגלי רק טעויות ({wrongIds.size})</button>
          )}
          <button onClick={onExit} className="p-4 text-gray-400 font-medium hover:underline text-center">חזרה לתפריט</button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-right">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onExit} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-all flex items-center gap-1">✕ חזרה לתפריט</button>
        <span className="text-sm text-gray-400 font-mono font-bold">{index + 1} / {currentList.length}</span>
      </div>
      <div className="w-full bg-gray-100 h-2.5 rounded-full mb-8 overflow-hidden">
        <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${((index + 1) / currentList.length) * 100}%` }} />
      </div>
      <h3 className="text-xl font-bold mb-8 text-gray-800 leading-tight min-h-[4rem]">{q.text}</h3>
      <div className="grid gap-3 mb-8">
        {q.options.map((opt, i) => {
          let style = "w-full p-4 border-2 rounded-2xl text-right transition-all font-medium ";
          if (userSelection !== null) {
            if (i === q.correctIndex) style += "bg-green-50 border-green-500 text-green-700 shadow-sm font-bold";
            else if (i === userSelection) style += "bg-red-50 border-red-500 text-red-700";
            else style += "opacity-40 border-gray-50 scale-95";
          } else style += "border-gray-100 hover:border-blue-200 hover:bg-gray-50 active:scale-98";
          return <button key={i} onClick={() => handleSelect(i)} disabled={userSelection !== null} className={style}>{opt}</button>;
        })}
      </div>
      <div className="flex gap-3 mt-8">
        <button onClick={() => index > 0 && setIndex(index - 1)} disabled={index === 0} className="flex-1 p-4 border-2 border-gray-200 rounded-2xl font-bold text-gray-400 disabled:opacity-0 transition-all active:scale-95">חזור</button>
        <button onClick={() => index < currentList.length - 1 ? setIndex(index + 1) : setIsFinished(true)} disabled={userSelection === null} className="flex-[2] p-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg hover:bg-black active:scale-95 transition-all disabled:opacity-30">{index === currentList.length - 1 ? "לתוצאות" : "המשך"}</button>
      </div>
    </div>
  );
}