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
      const { data, error } = await supabase.from("categories").select("id,name").order("name");
      if (error) {
        setErrorMsg("שגיאה בטעינה");
        setLoading(false);
        return;
      }
      setCategories(data || []);
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
    <main className="min-h-screen bg-gray-50 p-4 flex items-center justify-center font-sans" dir="rtl">
      <div className="bg-white rounded-xl shadow-md max-w-lg w-full p-6 text-center">
        {loading && <p className="py-8 text-gray-400 font-bold">טוען...</p>}
        {errorMsg && <p className="text-red-500 mb-4">{errorMsg}</p>}
        
        {!loading && !selectedCategory && (
          <div className="space-y-3">
            <h1 className="text-2xl font-bold mb-6 text-right">בחרי נושא לתרגול</h1>
            {categories.map((c) => (
              <button key={c.id} className="w-full text-right p-4 border rounded-xl hover:bg-gray-50 font-bold" onClick={() => startCategory(c)}>
                {c.name}
              </button>
            ))}
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
    </main>
  );
}

/* ---------- Practice Component ---------- */
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
    return (
      <div className="text-right">
        <h2 className="text-xl font-bold mb-4">סיכום תרגול</h2>
        <div className="bg-gray-50 rounded-lg p-4 mb-6 border">
          <div className="flex justify-between mb-2"><span>נכונות:</span><b className="text-green-600">{correctCount}</b></div>
          <div className="flex justify-between text-red-500"><span>טעויות:</span><b>{wrongIds.size}</b></div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={() => { setMode("all"); setCurrentList(allQuestions); setIndex(0); setAnswers({}); setWrongIds(new Set()); setIsFinished(false); }} className="p-4 bg-black text-white rounded-xl font-bold">תרגול חדש</button>
          {wrongIds.size > 0 && mode === "all" && (
            <button onClick={() => { setCurrentList(allQuestions.filter(x => wrongIds.has(x.id))); setMode("errors"); setIndex(0); setAnswers({}); setIsFinished(false); }} className="p-4 border-2 border-red-500 text-red-600 rounded-xl font-bold">תרגלי רק טעויות ({wrongIds.size})</button>
          )}
          <button onClick={onExit} className="p-2 text-gray-400 underline">חזרה לתפריט</button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-right">
      <div className="flex justify-between mb-2 items-center text-xs text-gray-400">
        <span>{categoryName}</span>
        <span>{index + 1} / {currentList.length}</span>
      </div>
      
      <div className="w-full bg-gray-100 h-2 rounded-full mb-6">
        <div className="bg-blue-500 h-full" style={{ width: `${((index + 1) / currentList.length) * 100}%` }} />
      </div>

      <p className="text-lg font-bold mb-6">{q.text}</p>

      <div className="space-y-3 mb-8">
        {q.options.map((opt, i) => {
          let s = "w-full p-4 border rounded-xl text-right transition-all ";
          if (userSelection !== null) {
            if (i === q.correctIndex) s += "bg-green-100 border-green-500 font-bold";
            else if (i === userSelection) s += "bg-red-100 border-red-500";
            else s += "opacity-40";
          } else s += "hover:bg-gray-50";
          return <button key={i} onClick={() => handleSelect(i)} disabled={userSelection !== null} className={s}>{opt}</button>;
        })}
      </div>

      <div className="flex gap-3">
        <button 
          onClick={() => index > 0 && setIndex(index - 1)} 
          disabled={index === 0} 
          className="flex-1 p-4 border rounded-xl font-bold disabled:opacity-20"
        >
          חזור
        </button>
        <button 
          onClick={() => index < currentList.length - 1 ? setIndex(index + 1) : setIsFinished(true)} 
          disabled={userSelection === null} 
          className="flex-[2] p-4 bg-black text-white rounded-xl font-bold disabled:opacity-30"
        >
          {index === currentList.length - 1 ? "לתוצאות" : "המשך"}
        </button>
      </div>
    </div>
  );
}