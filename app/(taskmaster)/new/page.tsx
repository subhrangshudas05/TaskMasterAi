'use client'

import React, { useState, useRef, Suspense, use, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MoveLeft } from "lucide-react";
import Counter from '@/app/components/Counter';
import Preview from '@/app/components/Preview';
import { redirect } from 'next/navigation';

interface GoalData {
  destination: string;
  deadline: string;
  dailyMinutes: number;
  level: string;
  additionalInfo: string;
}

interface GeneratedPathData {
  marathonTitle: string;
  tasks: Array<{
    id: string;
    day: number;
    title: string;
    detail: string;
    estimatedMinutes: number;
  }>;
}

function WizardContent() {

  const router = useRouter();
  const searchParams = useSearchParams();

  const step = parseInt(searchParams.get('step') || '1', 10);

  const [formData, setFormData] = useState<GoalData>({
    destination: '',
    dailyMinutes: 30,
    deadline: '',
    level: '',
    additionalInfo: ''
  });
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  useEffect(() => {
    if (step > 1 && !formData.destination) {
      router.replace('/new?step=1');
    }
  }, [step, formData.destination, router]);

  // Track the raw numbers separately. Default is 0 Months, 0 Weeks, 7 Days.
  const [timeSlots, setTimeSlots] = useState({ months: 0, weeks: 1, days: 0 });

  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const [generatedData, setGeneratedData] = useState<any>(null);
  const lastGeneratedSnapshotRef = useRef<string>("");

  // Watcher: If the user changes the form, the old AI data is now "stale"
  useEffect(() => {
    const currentSnapshot = JSON.stringify(formData);

    if (generatedData && currentSnapshot !== lastGeneratedSnapshotRef.current) {
      console.log("Form changed! Nuking stale AI data.");
      setGeneratedData(null);
    }
  }, [formData, generatedData]);

  // Auto-build the string whenever they click a plus or minus
  React.useEffect(() => {
    const parts: String[] = [];
    if (timeSlots.months > 0) parts.push(`${timeSlots.months} ${timeSlots.months > 1 ? 'months' : 'month'}`);
    if (timeSlots.weeks > 0) parts.push(`${timeSlots.weeks} ${timeSlots.weeks > 1 ? 'weeks' : 'week'}`);
    if (timeSlots.days > 0) parts.push(`${timeSlots.days} ${timeSlots.days > 1 ? 'days' : 'day'}`);

    setFormData(prev => ({ ...prev, deadline: parts.join(' ') }));
  }, [timeSlots]);



  const handlePlusDay = () => {
    setTimeSlots(s => {
      let newDays = s.days + 1;
      let newWeeks = s.weeks;
      let newMonths = s.months;

      // 1. Check if Days hit 7
      if (newDays === 7) {
        newDays = 0;
        newWeeks += 1;
      }

      if (newWeeks === 4) {
        newWeeks = 0;
        if (newMonths < 23) {
          newMonths += 1;
        }
      }

      return { ...s, days: newDays, weeks: newWeeks, months: newMonths };
    });
  };
  const handleMinusDay = () => {
    setTimeSlots(s => {
      if (s.days === 0 && s.weeks > 0) {

        return { ...s, days: 6, weeks: s.weeks - 1 };
      }
      return { ...s, days: Math.max(0, s.days - 1) };
    });
  };

  const handlePlusWeek = () => {
    setTimeSlots(s => {
      if (s.weeks === 3) {
        const newWeek = 0
        let newMonths = s.months;

        if (newMonths < 23) {
          newMonths += 1;
        }
        return { ...s, weeks: newWeek, months: newMonths };
      }
      return { ...s, weeks: s.weeks + 1 };
    });
  };
  const handleMinusWeek = () => {
    setTimeSlots(s => {
      if (s.weeks === 0 && s.months > 0) {
        // Borrow from month
        return { ...s, weeks: 3, months: s.months - 1 };
      }
      return { ...s, weeks: Math.max(0, s.weeks - 1) };
    });
  };

  const formatTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const hPart = hours > 0 ? `${hours}h ` : "";
    const mPart = minutes > 0 ? `${minutes}m` : "";

    return hPart + mPart || "0m"; // Fallback for 0
  };

  // --- Handlers ---
  const handleNext = () => {
    // Validation: Don't let them proceed if current step is empty
    if (step === 1 && !formData.destination) return;
    if (step === 2 && !formData.deadline) return;
    if (step === 3 && !formData.dailyMinutes) return;

    setDirection(1);
    router.push(`/new?step=${step + 1}`);
  };

  const handleBack = () => {
    if (step > 1) {
      setDirection(-1);
      router.push(`/new?step=${step - 1}`);
    } else {
      router.push('/'); // Go back to home if on step 1
    }
  };

  //gemini api
  const handleFinish = async () => {
    if (!formData.level) return;
    setDirection(1);
    router.push(`/new?step=5`);
    if (generatedData) {

      return
    };


    setIsGenerating(true);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch('/api/generate-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData }),
        signal: controller.signal
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedData(result.data);
        lastGeneratedSnapshotRef.current = JSON.stringify(formData);
        setDirection(1);
        router.push(`/new?step=5`);
      } else {
              alert(result.error);

        console.error("Failed to generate:", result.error);
        // Handle error UI here if needed
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        alert("User aborted the generation.");
        console.log("User aborted the generation.");
      }
      alert(error.message);
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  const handleAbort = () => {
    if (abortController) {
      abortController.abort();
      setIsGenerating(false);
    }
  };
  // --- Animation Variants ---
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? window.innerWidth : -window.innerWidth,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
      x: direction < 0 ? window.innerWidth : -window.innerWidth,
      opacity: 0,
    }),
  };

  const [isSaving, setIsSaving] = useState(false)

  const handleAcceptMarathon = async (finalData: any) => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/marathons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalData: finalData,      // The AI generated title and tasks
          deadline: formData.deadline // From Step 2 of your wizard!
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log("Saved successfully! ID:", result.marathonId);
        // Clear the stale state watcher
        lastGeneratedSnapshotRef.current = ""; 
        router.push('/'); 
      } else {
        console.error("Failed to save:", result.error);
        alert("Couldn't save your marathon. Please try again.");
      }
    } catch (error) {
      console.error("Network error:", error);
    } finally {
      setIsSaving(false);
    }
  }



return (
  <div className="flex flex-col min-h-dvh font-manrope bg-app-main pb-[calc(2rem+env(safe-area-inset-bottom))] ">

    {/* STATE 1: LOADING SCREEN */}
    {isGenerating ? (
      <div className="grow flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-8" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Architecting Your Path...</h2>
        <p className="text-gray-500 animate-pulse">Deconstructing goals into daily actions.</p>
        <button
          onClick={handleAbort}
          className="mt-12 text-sm  px-6 py-2 rounded-full font-bold bg-black/5 text-gray-400 hover:text-gray-600 hover:bg-black/8 transition-colors"
        >
          Cancel Generation
        </button>
      </div>
    )

      /* STATE 2: PREVIEW SCREEN (STEP 5) */
      : step === 5 && generatedData ? (
        <Preview
          initialData={generatedData}
          onAcceptMarathon={handleAcceptMarathon}
          isSaving={isSaving}
        />
      )

        /* STATE 3: THE WIZARD (STEPS 1-4) */
        : (

          <>
            {/* --- STATIC TOP BAR (Progress & Close) --- */}
            <div className="flex-none pt-8 px-6 pb-4 shadow-sm z-10">
              <div className="flex justify-between items-center mb-4">
                <button onClick={handleBack} className="text-gray-500 flex items-center justify-center font-medium">
                  {step === 1 ? 'Cancel' : <span className="flex items-center justify-center gap-1.5 leading-none">
                    <MoveLeft className="w-4 h-4" />
                    <span>Back</span>
                  </span>}
                </button>
                <span className="text-sm font-semibold text-gray-800">Step {step} of 4</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full overflow-hidden bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-purple h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / 4) * 100}%` }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                />
              </div>
            </div>

            {/* --- SLIDING MIDDLE CONTENT --- */}
            <div className="grow  relative overflow-hidden flex flex-col justify-center px-6 ">
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={step}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="w-full max-w-md mx-auto"
                >

                  {/* Step 1: Destination */}
                  {step === 1 && (
                    <div className="space-y-6">
                      <h1 className="text-3xl font-bold text-gray-900">What is your ultimate goal?</h1>
                      <p className="text-gray-500">Be specific. What exactly do you want to achieve?</p>
                      <textarea
                        autoFocus
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-[#6c38c0] focus:ring-0 focus:outline-none resize-none h-32 text-base text-darker font-semibold placeholder:font-normal"
                        placeholder="e.g., Master React and build a portfolio website..."
                        value={formData.destination}
                        onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      />
                    </div>
                  )}


                  {/* Step 2: Deadline */}
                  {
                    step === 2 && (
                      <div className="space-y-6">
                        <div>
                          <h1 className="text-3xl font-bold text-gray-900">When is the finish line?</h1>
                          <p className="text-gray-500 mt-2">
                            Set your exact deadline: <span className="font-bold text-purple-600">{formData.deadline || 'No time set'}</span>
                          </p>
                        </div>

                        <div className="space-y-4">
                          <Counter
                            key={'month'}
                            label="Months"
                            max={24}
                            quantity={timeSlots.months}
                            onMinus={() => setTimeSlots(s => ({ ...s, months: s.months - 1 }))}
                            onPlus={() => setTimeSlots(s => ({ ...s, months: s.months + 1 }))}
                          />
                          <Counter
                            key={'week'}
                            label="Weeks"
                            max={10}
                            quantity={timeSlots.weeks}
                            onMinus={handleMinusWeek}
                            onPlus={handlePlusWeek}
                          />
                          <Counter
                            key={'day'}
                            label="Days"
                            quantity={timeSlots.days}
                            // Prevent Days from going below 0. 
                            min={0}
                            max={30}
                            onMinus={handleMinusDay}
                            onPlus={handlePlusDay}
                          />
                        </div>
                      </div>
                    )
                  }

                  {/* Step 3: Daily Energy (Minutes) */}
                  {step === 3 && (
                    <div className="space-y-6">
                      <h1 className="text-3xl font-bold text-gray-900">Daily Capacity?</h1>
                      <p className="text-gray-500">How much time can you commit each day?</p>

                      <div className="flex flex-col items-center gap-6">
                        <Counter
                          label="Time Goal"
                          max={480}
                          min={15}
                          quantity={formData.dailyMinutes}
                          onPlus={() => setFormData(s => ({ ...s, dailyMinutes: s.dailyMinutes + 15 }))}
                          onMinus={() => setFormData(s => ({ ...s, dailyMinutes: Math.max(15, s.dailyMinutes - 15) }))}
                        />

                        <div className="text-center bg-purple-50 p-4 rounded-2xl w-full border border-purple-100">
                          <span className="text-purple-700 font-semibold">
                            💡 Gemini will build your plan based on  {formatTime(formData.dailyMinutes)} of daily energy.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Level & Custom Context */}
                  {step === 4 && (
                    <div className="space-y-6">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900">Where are you starting?</h1>
                        <p className="text-gray-500 mt-2">Select your level and add any extra details.</p>
                      </div>

                      {/* Level Selection Grid */}
                      <div className="space-y-3">
                        {['Total Beginner', 'I know the basics', 'Advanced'].map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => setFormData({ ...formData, level: lvl })}
                            className={`w-full p-4 rounded-xl border-2 font-semibold text-left transition-colors ${formData.level === lvl
                              ? 'border-[#6c38c0] bg-purple-50 text-[#5b2ea3]'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>

                      {/* Custom Context Textarea */}
                      <div className="space-y-3 pt-4">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-tight">
                          Anything else for the AI? (Optional)
                        </label>
                        <textarea
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-[#6c38c0] focus:ring-0 focus:outline-none resize-none h-28 text-base text-darker transition-colors font-semibold placeholder:font-normal "
                          placeholder="e.g. 'I've watched some YouTube tutorials but haven't coded yet' or 'Focus more on backend logic'..."
                          value={formData.additionalInfo}
                          onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

            {/* --- STATIC BOTTOM BAR (Next Button) --- */}
            <div className="flex-none p-6 z-10">
              <button
                onClick={step === 4 ? handleFinish : handleNext}
                className={`w-full py-4 rounded-full font-bold text-lg text-white active:scale-95 transition-all  ${(step === 1 && !formData.destination) ||
                  (step === 2 && !formData.deadline) ||
                  (step === 3 && !formData.dailyMinutes) ||
                  (step === 4 && !formData.level)
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-purple hover:bg-[#592e9e] shadow-lg'
                  }`}
              >
                {step === 4 ? 'Generate My Marathon' : 'Continue'}
              </button>
            </div>

          </>
        )}

  </div>
)
}

// 3. The Page Export (Wraps the logic in Suspense to prevent Next.js build errors)
export default function NewGoalPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center">Loading...</div>}>
      <WizardContent />
    </Suspense>
  )
}