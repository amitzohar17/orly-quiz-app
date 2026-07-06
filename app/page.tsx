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
  image_url?: string | null;
  open_answer_feedback?: string | null;
};

/* ---------- Main Component ---------- */
export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);
  const [availableQuizzes, setAvailableQuizzes] = useState<number[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
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

  async function prepareQuizSelection(c: CategoryRow) {
    setSelectedCategory(c);
    setSelectedQuiz(null);
    setLoading(true);

    const { data, error } = await supabase
      .from("questions")
      .select("quiz_number")
      .eq("category_id", c.id);

    if (!error && data) {
      const quizzes = Array.from(new Set(data.map(q => q.quiz_number).filter(Boolean))) as number[];
      quizzes.sort((a, b) => a - b);
      setAvailableQuizzes(quizzes);
    } else {
      setAvailableQuizzes([]);
    }
    setLoading(false);
  }

  async function loadQuestions(quizNum: number) {
    if (!selectedCategory) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("category_id", selectedCategory.id)
      .eq("quiz_number", quizNum);

    if (error) { 
      console.error(error);
      setLoading(false); 
      return; 
    }
    
    const mapped: UiQuestion[] = (data || []).map(q => {
      let opts: string[] = [];

      if (q.type === 'boolean') {
        opts = ["נכון", "לא נכון"];
      } else if (q.type === 'open') {
        opts = [];
      } else if (Array.isArray(q.options_list) && q.options_list.length > 0) {
        opts = q.options_list.filter((val: any) => val !== null && val !== undefined && val !== "");
      } else {
        opts = [q.option_a, q.option_b, q.option_c, q.option_d].filter(
          (val) => val !== null && val !== undefined && val !== ""
        );
      }

      // הבטחת המרה מוחלטת למספרים נקיים
      const parsedIndices = Array.isArray(q.correct_indices) 
        ? q.correct_indices.map((val: any) => parseInt(String(val), 10)).filter((v: any) => !isNaN(v))
        : null;

      return {
        id: String(q.id),
        categoryId: String(q.category_id),
        text: q.text,
        options: opts,
        correctIndex: q.correct_index !== null ? Number(q.correct_index) : null,
        correct_indices: parsedIndices,
        type: q.type || 'multiple_choice',
        image_url: q.image_url,
        open_answer_feedback: q.open_answer_feedback
      };
    });
    
    setQuestions(mapped);
    setSelectedQuiz(quizNum);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] p-6 flex flex-col items-center font-sans text-[#2D3436]" dir="rtl">
      <div className="mb-10 mt-4 flex flex-col items-center">
        <div className="relative w-32 h-32 bg-white rounded-full shadow-sm flex items-center justify-center p-4">
          <Image src="/logo.png" alt="לוגו" fill className="object-contain p-2" priority />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 max-w-lg w-full p-10 border border-gray-50 min-h-[500px] flex flex-col transition-all">
        {!userEmail ? (
          <form onSubmit={handleLogin} className="animate-in fade-in slide-in-from-top-4">
            <h1 className="text-3xl font-black mb-8 text-center">התחברות</h1>
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
              {loading ? "מתחבר..." : "כניסה"}
            </button>
          </form>
        ) : !selectedCategory ? (
          <div className="animate-in fade-in">
             <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-black">הקורסים שלי</h1>
                <button onClick={() => setUserEmail(null)} className="text-sm font-bold text-blue-500 underline">החלף משתמש</button>
             </div>
             <div className="grid gap-4">
              {categories.map((c) => (
                <button key={c.id} className="w-full text-right p-6 bg-white border-2 border-gray-100 rounded-[1.8rem] hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-gray-700 text-lg flex justify-between items-center group shadow-sm" onClick={() => prepareQuizSelection(c)}>
                  {c.name}
                  <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all">←</span>
                </button>
              ))}
            </div>
          </div>
        ) : !selectedQuiz ? (
          <div className="animate-in fade-in flex flex-col h-full">
            <div className="mb-6">
              <button onClick={() => setSelectedCategory(null)} className="text-sm font-bold text-blue-600 mb-2">← חזרה לקורסים</button>
              <h1 className="text-2xl font-black">{selectedCategory.name}</h1>
              <p className="text-gray-500 font-medium">בחר שאלון לתרגול:</p>
            </div>
            {loading ? (
              <p className="text-center text-gray-400 font-bold py-10 animate-pulse">טוען שאלונים זמינים...</p>
            ) : availableQuizzes.length === 0 ? (
              <p className="text-center text-gray-400 font-bold py-10">לא נמצאו שאלונים מוגדרים לקורס זה</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {availableQuizzes.map((num) => (
                  <button key={num} onClick={() => loadQuestions(num)} disabled={loading} className="p-6 bg-gray-50 border-2 border-transparent rounded-3xl hover:border-blue-500 hover:bg-white transition-all text-center flex flex-col items-center justify-center gap-2 group shadow-sm disabled:opacity-50">
                    <span className="text-3xl">📝</span>
                    <span className="font-black text-gray-800 text-lg">שאלון {num}</span>
                    <span className="text-[10px] text-gray-400 font-bold group-hover:text-blue-500">התחל תרגול</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <PracticeView allQuestions={questions} categoryName={selectedCategory.name} quizNum={selectedQuiz} onExit={() => setSelectedQuiz(null)} />
        )}
      </div>
    </main>
  );
}

/* ---------- PracticeView Component ---------- */
function PracticeView({ categoryName, quizNum, allQuestions, onExit }: { categoryName: string, quizNum: number, allQuestions: UiQuestion[], onExit: () => void }) {
  const [currentQuestions, setCurrentQuestions] = useState<UiQuestion[]>(allQuestions);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({}); 
  const [wrongIndices, setWrongIndices] = useState<Set<number>>(new Set());
  const [isFinished, setIsFinished] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [openText, setOpenText] = useState(""); 

  const q = currentQuestions[index];
  const userSelection = answers[index];

  const isManualCheck = q?.type === 'multi' || q?.type === 'order' || q?.type === 'multiple_selection' || q?.type === 'open';

  useEffect(() => {
    setOpenText(answers[index] || "");
  }, [index, answers]);

  if (allQuestions.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xl font-bold text-gray-400 mb-6">לא נמצאו שאלות בשאלון זה</p>
        <button onClick={onExit} className="p-4 bg-blue-600 text-white rounded-2xl w-full font-bold">חזור</button>
      </div>
    );
  }

  function handleSelect(i: number) {
    if (showFeedback && isManualCheck) return;
    if (userSelection !== undefined && !isManualCheck) return;

    if (q.type === 'order') {
      const currentSel = Array.isArray(userSelection) ? userSelection : [];
      let newSel;
      if (currentSel.includes(i)) {
        newSel = currentSel.filter(item => item !== i);
      } else {
        newSel = [...currentSel, i];
      }
      setAnswers({ ...answers, [index]: newSel });
    } else if (q.type === 'multi' || q.type === 'multiple_selection') {
      const currentSel = Array.isArray(userSelection) ? userSelection : [];
      const newSel = currentSel.includes(i) ? currentSel.filter(item => item !== i) : [...currentSel, i];
      setAnswers({ ...answers, [index]: newSel });
    } else {
      setAnswers({ ...answers, [index]: i });
      if (i !== q.correctIndex) setWrongIndices(prev => new Set(prev).add(index));
    }
  }

  function checkAnswer() {
    if (q.type === 'open') {
      setAnswers({ ...answers, [index]: openText });
      setShowFeedback(true);
      return;
    }

    const correctOnes = q.correct_indices || [];
    const userOnes = answers[index] || [];

    if (q.type === 'order') {
      // בדיקה אבסולוטית: האם אורך מערך הלחיצות שווה למערך התשובות והאם כל איבר זהה לחלוטין במיקומו
      const isCorrect = correctOnes.length === userOnes.length && correctOnes.every((v, idx) => Number(userOnes[idx]) === Number(v));
      if (!isCorrect) setWrongIndices(prev => new Set(prev).add(index));
    } else {
      const isCorrect = correctOnes.length === userOnes.length && correctOnes.every((v) => userOnes.includes(Number(v)));
      if (!isCorrect) setWrongIndices(prev => new Set(prev).add(index));
    }
    
    setShowFeedback(true);
  }

  function handleNext() {
    if (index < currentQuestions.length - 1) {
      setIndex(index + 1);
      setShowFeedback(false);
    } else {
      setIsFinished(true);
    }
  }

  if (isFinished) {
    const correctCount = currentQuestions.length - wrongIndices.size;
    const score = Math.round((correctCount / currentQuestions.length) * 100);
    return (
      <div className="text-center animate-in zoom-in duration-300 flex flex-col items-center flex-1">
        <h2 className="text-3xl font-black mb-6">סיכום תרגול</h2>
        <div className="w-32 h-32 rounded-full border-8 border-blue-50 flex items-center justify-center mb-6 bg-blue-50/30 text-4xl font-black text-blue-600">{score}</div>
        <p className="text-xl font-bold mb-8 text-gray-600">הצלחת ב-{correctCount} מתוך {currentQuestions.length}</p>
        
        <div className="grid gap-3 w-full mt-auto">
          {wrongIndices.size > 0 && (
            <button onClick={() => {
              const errorsOnly = currentQuestions.filter((_, i) => wrongIndices.has(i));
              setCurrentQuestions(errorsOnly); setIndex(0); setAnswers({}); setWrongIndices(new Set()); setIsFinished(false); setShowFeedback(false);
            }} className="w-full p-5 bg-orange-500 text-white rounded-3xl font-black shadow-lg">תרגול טעויות ({wrongIndices.size})</button>
          )}
          <button onClick={onExit} className="w-full p-5 bg-blue-600 text-white rounded-3xl font-black shadow-lg">חזרה לתפריט</button>
        </div>
      </div>
    );
  }

  const isCheckDisabled = q.type === 'open' 
    ? !openText.trim() 
    : !userSelection || (Array.isArray(userSelection) && userSelection.length === 0);

  return (
    <div className="text-right flex flex-col h-full flex-1">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <button onClick={onExit} className="text-xs font-black text-blue-600 mb-1 text-right">✕ סגור</button>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{categoryName} | שאלון {quizNum}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm font-black text-gray-800">{index + 1}/{currentQuestions.length}</span>
          <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
             <div className="h-full bg-blue-500 transition-all" style={{ width: `${((index + 1) / currentQuestions.length) * 100}%` }}></div>
          </div>
        </div>
      </div>

      {q.image_url && (
        <div className="relative w-full h-48 mb-4 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
          <img src={q.image_url} alt="נספח לשאלה" className="w-full h-full object-contain" />
        </div>
      )}

      <h3 className="text-2xl font-black mb-6 leading-tight text-gray-800 whitespace-pre-line">
        {q.text}
        {q.type === 'multiple_selection' || q.type === 'multi' ? <span className="text-sm block text-blue-500 font-bold mt-1">(בחירה מרובה)</span> : null}
        {q.type === 'order' ? <span className="text-sm block text-blue-500 font-bold mt-1">(דרג את הפריטים לפי הסדר הנכון)</span> : null}
      </h3>
      
      {q.type === 'open' ? (
        <div className="mb-6">
          <textarea
            disabled={showFeedback}
            value={openText}
            onChange={(e) => setOpenText(e.target.value)}
            placeholder="הקלד את תשובתך כאן..."
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl h-32 focus:ring-2 focus:ring-blue-500 outline-none text-lg font-medium transition-all resize-none disabled:opacity-70"
          />
          {showFeedback && (
            <div className="mt-4 p-5 bg-green-50 border-2 border-green-200 rounded-2xl text-green-800 animate-in fade-in">
              <p className="font-black mb-1 text-lg">התשובה הנכונה / הסבר מנחה:</p>
              <p className="font-bold whitespace-pre-line">{q.open_answer_feedback || "לא הוגדר הסבר מנחה לשאלה זו."}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3 mb-8">
          {q.options.map((opt, i) => {
            let style = "w-full p-5 border-2 rounded-[1.5rem] text-right transition-all text-lg font-bold flex items-center justify-between ";
            const isSelected = Array.isArray(userSelection) ? userSelection.includes(i) : userSelection === i;
            
            if (userSelection !== undefined && (!isManualCheck || showFeedback)) {
              let isCorrectOption = false;

              if (q.type === 'multiple_selection' || q.type === 'multi') {
                isCorrectOption = q.correct_indices?.includes(Number(i)) || false;
              } else if (q.type === 'order') {
                // לוגיקת צביעה חסינת באגים: פריט ייצבע בירוק אך ורק אם המיקום שלו במערך של המשתמש תואם בדיוק למיקום שלו במערך התשובות הנכונות מהדאטאבייס
                const userPos = Array.isArray(userSelection) ? userSelection.indexOf(i) : -1;
                const correctPos = q.correct_indices ? q.correct_indices.indexOf(Number(i)) : -1;
                isCorrectOption = userPos === correctPos && userPos !== -1;
              } else {
                isCorrectOption = i === q.correctIndex;
              }
              
              if (isCorrectOption) {
                style += "bg-green-50 border-green-500 text-green-700 shadow-inner";
              } else if (isSelected) {
                style += "bg-red-50 border-red-500 text-red-700";
              } else {
                style += "opacity-40 border-gray-50";
              }
            } else if (isSelected) {
              style += "border-blue-500 bg-blue-50 shadow-md transform scale-[1.01]";
            } else {
              style += "border-gray-100 hover:bg-gray-50";
            }
            
            return (
              <button key={i} onClick={() => handleSelect(i)} className={style}>
                <span>{opt}</span>
                
                {isSelected && (
                  <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-sm font-black">
                    {q.type === 'order' ? (Array.isArray(userSelection) ? userSelection.indexOf(i) + 1 : '✓') : '✓'}
                  </span>
                )}
                
                {!isSelected && q.type === 'order' && showFeedback && q.correct_indices && q.correct_indices.includes(Number(i)) && (
                  <span className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-sm font-black">
                    {q.correct_indices.indexOf(Number(i)) + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-auto flex gap-3">
        <button onClick={() => { if (index > 0) { setIndex(index - 1); setShowFeedback(false); } }} className={`flex-1 p-5 border-2 border-gray-100 rounded-3xl font-black text-gray-400 ${index === 0 ? 'opacity-0' : ''}`}>חזור</button>
        {isManualCheck && !showFeedback ? (
          <button onClick={checkAnswer} disabled={isCheckDisabled} className="flex-[2] p-5 bg-blue-600 text-white rounded-3xl font-black text-xl shadow-lg disabled:bg-gray-100 disabled:text-gray-400">בדיקה</button>
        ) : (
          <button onClick={handleNext} disabled={!isManualCheck && userSelection === undefined} className="flex-[2] p-5 bg-gray-900 text-white rounded-3xl font-black text-xl shadow-lg disabled:bg-gray-100 disabled:text-gray-400">המשך</button>
        )}
      </div>
    </div>
  );
}