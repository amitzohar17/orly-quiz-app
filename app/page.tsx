"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/* ---------- Types ---------- */

type CategoryRow = { id: string; name: string };

type QuestionRow = {
  id: string;
  category_id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_index: number;
  explanation: string | null;
  created_at?: string;
};

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
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("categories")
        .select("id,name")
        .order("name");

      if (error) {
        setErrorMsg(
          `Supabase error: ${error.message}. (בדקי טבלאות/הרשאות/RLS ב-Supabase)`
        );
        setCategories([]);
        setLoading(false);
        return;
      }

      setCategories((data ?? []) as CategoryRow[]);
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
      .select(
        "id,category_id,text,option_a,option_b,option_c,option_d,correct_index,explanation,created_at"
      )
      .eq("category_id", c.id)
      .order("created_at");

    if (error) {
      setErrorMsg(
        `Supabase error: ${error.message}. (בדקי טבלת questions/הרשאות/RLS ב-Supabase)`
      );
      setLoading(false);
      return;
    }

    const ui: UiQuestion[] = ((data ?? []) as QuestionRow[]).map((q) => ({
      id: q.id,
      categoryId: q.category_id,
      text: q.text,
      options: [q.option_a, q.option_b, q.option_c, q.option_d],
      correctIndex: q.correct_index,
      explanation: q.explanation ?? undefined,
    }));

    setQuestions(ui);
    setLoading(false);
  }

  function backToCategories() {
    setSelectedCategory(null);
    setQuestions([]);
    setErrorMsg(null);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-xl shadow-md max-w-lg w-full p-6">
        {loading && <p className="text-start">טוען...</p>}
        {errorMsg && <p className="text-red-600 text-start">שגיאה: {errorMsg}</p>}

        {!loading && !selectedCategory && (
          <>
            <h1 className="text-2xl font-bold mb-4 text-start">בחרי נושא לתרגול</h1>

            <div className="space-y-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  className="w-full text-start p-3 rounded border hover:bg-gray-50"
                  onClick={() => enterCategory(c)}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {categories.length === 0 && !errorMsg && (
              <p className="text-gray-500 mt-4 text-start">אין נושאים עדיין</p>
            )}
          </>
        )}

        {!loading && selectedCategory && (
          <Practice
            categoryName={selectedCategory.name}
            questions={questions}
            onBack={backToCategories}
          />
        )}
      </div>
    </main>
  );
}

/* ---------- Practice ---------- */

function Practice({
  categoryName,
  questions,
  onBack,
}: {
  categoryName: string;
  questions: UiQuestion[];
  onBack: () => void;
}) {
  function shuffleArray<T>(arr: T[]) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"all" | "wrong">("all");

  const [order, setOrder] = useState<UiQuestion[]>(questions);
  const [isShuffled, setIsShuffled] = useState(false);

  useEffect(() => {
    setOrder(questions);
    setIsShuffled(false);
    setIndex(0);
    setSelected(null);
    setIsFinished(false);
    setScore(0);
    setAnsweredCount(0);
    setWrongIds(new Set());
    setMode("all");
  }, [questions]);

  const visibleQuestions = useMemo(() => {
    const base = order;
    if (mode === "wrong") return base.filter((q) => wrongIds.has(q.id));
    return base;
  }, [mode, order, wrongIds]);

  const q = useMemo(() => visibleQuestions[index], [visibleQuestions, index]);
  const isAnswered = selected !== null;

  function chooseAnswer(i: number) {
    if (isAnswered || isFinished) return;
    setSelected(i);
    setAnsweredCount((c) => c + 1);

    if (q && i === q.correctIndex) {
      setScore((s) => s + 1);
    } else if (q) {
      setWrongIds((prev) => new Set(prev).add(q.id));
    }
  }

  function nextQuestion() {
    if (index >= visibleQuestions.length - 1) {
      setIsFinished(true);
      return;
    }
    setSelected(null);
    setIndex((i) => i + 1);
  }

  function restartAll() {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setAnsweredCount(0);
    setIsFinished(false);
    setWrongIds(new Set());
    setMode("all");

    const nextOrder = isShuffled ? shuffleArray(questions) : questions;
    setOrder(nextOrder);
  }

  function restartWrongOnly() {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setAnsweredCount(0);
    setIsFinished(false);
    setMode("wrong");

    const nextOrder = isShuffled ? shuffleArray(questions) : questions;
    setOrder(nextOrder);
  }

  if (visibleQuestions.length === 0) {
    return (
      <>
        <button className="underline mb-4 text-start" onClick={onBack}>
          חזרה לנושאים
        </button>
        <p className="text-start">אין שאלות לתרגול</p>
      </>
    );
  }

  if (isFinished) {
    const percent = answeredCount === 0 ? 0 : Math.round((score / answeredCount) * 100);

    return (
      <>
        <button className="underline mb-4 text-start" onClick={onBack}>
          חזרה לנושאים
        </button>

        <h2 className="text-xl font-bold mb-2 text-start">סיימת את התרגול 🎉</h2>
        <p className="text-gray-600 mb-6 text-start">{categoryName}</p>

        <div className="space-y-2 mb-6">
          <div className="p-3 rounded border bg-gray-50 flex justify-between">
            <span>ענית על</span>
            <span className="font-semibold">{answeredCount}</span>
          </div>
          <div className="p-3 rounded border bg-gray-50 flex justify-between">
            <span>תשובות נכונות</span>
            <span className="font-semibold">{score}</span>
          </div>
          <div className="p-3 rounded border bg-gray-50 flex justify-between">
            <span>אחוז הצלחה</span>
            <span className="font-semibold">{percent}%</span>
          </div>
          <div className="p-3 rounded border bg-gray-50 flex justify-between">
            <span>טעויות</span>
            <span className="font-semibold">{wrongIds.size}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button className="w-full p-3 rounded bg-black text-white" onClick={restartAll}>
            תרגול מחדש (הכול)
          </button>

          <button
            className="w-full p-3 rounded border disabled:opacity-50"
            disabled={wrongIds.size === 0}
            onClick={restartWrongOnly}
          >
            תרגלי רק טעויות ({wrongIds.size})
          </button>

          <button className="w-full p-3 rounded border" onClick={onBack}>
            חזרה לנושאים
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <button className="underline mb-4 text-start" onClick={onBack}>
        חזרה לנושאים
      </button>

      <h2 className="text-xl font-bold mb-2 text-start">{categoryName}</h2>

      <p className="text-sm mb-2 text-start">
        שאלה {index + 1} מתוך {visibleQuestions.length}
      </p>

      <div className="mb-4 flex gap-2 items-center">
        <button
          className="px-3 py-2 border rounded disabled:opacity-50"
          disabled={answeredCount > 0}
          onClick={() => {
            setOrder(shuffleArray(order));
            setIsShuffled(true);
            setIndex(0);
            setSelected(null);
          }}
        >
          ערבבי שאלות
        </button>

        {isShuffled && <span className="text-sm text-gray-500">מצב: אקראי</span>}
      </div>

      <p className="mb-4 text-lg text-start">{q.text}</p>

      <div className="space-y-2">
        {q.options.map((opt, i) => {
          let cls = "w-full p-3 border rounded text-start transition";
          if (isAnswered) {
            if (i === q.correctIndex) cls += " bg-green-100 border-green-500";
            else if (i === selected) cls += " bg-red-100 border-red-500";
            else cls += " opacity-80";
          } else {
            cls += " hover:bg-gray-50";
          }

          return (
            <button
              key={i}
              className={cls}
              disabled={isAnswered}
              onClick={() => chooseAnswer(i)}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <div className="mt-4 text-start">
          <p className="font-semibold">
            {selected === q.correctIndex ? "✔ תשובה נכונה!" : "❌ תשובה שגויה"}
          </p>
          {q.explanation && <p className="text-sm text-gray-600 mt-1">{q.explanation}</p>}
        </div>
      )}

      <button
        className="mt-6 w-full p-3 bg-black text-white rounded disabled:opacity-50"
        disabled={!isAnswered}
        onClick={nextQuestion}
      >
        {index === visibleQuestions.length - 1 ? "סיום" : "הבא"}
      </button>
    </>
  );
}
