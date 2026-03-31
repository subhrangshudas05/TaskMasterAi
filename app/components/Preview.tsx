"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MoveLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface Task {
    id: string;
    day: number;
    title: string;
    detail: string;
    estimatedMinutes: number;
}

interface PreviewProps {
    initialData: { marathonTitle: string; tasks: Task[] };
    onAcceptMarathon: (finalData: any) => void;
    isSaving: boolean;
}

export default function Preview({ initialData, onAcceptMarathon ,isSaving}: PreviewProps) {
    const [data, setData] = useState(initialData);
    const router = useRouter();
    const [activeId, setActiveId] = useState<string | null>(null);

    const autoResize = (element: HTMLTextAreaElement | null) => {
        if (element) {
            element.style.height = "auto";
            element.style.height = element.scrollHeight + "px";
        }
    };

    // Helper to handle inline editing
    const updateTask = (id: string, field: keyof Task, value: string) => {
        setData(prev => ({
            ...prev,
            tasks: prev.tasks.map(t => t.id === id ? { ...t, [field]: value } : t)
        }));
    };

    const handleBack = () => {
        router.replace('/new?step=4')
    }

    return (
        <div className="relative w-full max-w-xl font-manrope mx-auto pb-32 px-4">

            <div className="group absolute top-5 left-4 bg-black/8 hover:bg-black/12 p-2  rounded-full">
                <div className="flex justify-between items-center ">
                    <button onClick={handleBack} className="text-gray-500 group-hover:text-gray-700 flex items-center justify-center font-medium text-sm">
                        <span className="flex items-center justify-center gap-1 leading-none">
                            <MoveLeft className="w-5 h-5" />
                        </span>
                    </button>
                </div>
            </div>
            {/* Title Area - Click to Edit */}
            <div className="text-center mb-10 pt-8">
                <p className="text-sm font-bold text-purple-600 uppercase tracking-widest mb-2">Your Custom Marathon</p>
                <input
                    value={data.marathonTitle}
                    onChange={(e) => setData({ ...data, marathonTitle: e.target.value })}
                    className="text-2xl font-black text-gray-900 text-center w-full bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-purple-200 rounded-xl px-2 py-1 transition-all"
                />
                <p className="text-gray-500 mt-3 text-sm">Click any text below to edit before starting.</p>
            </div>

            {/* The Timeline */}
            <div className="relative border-purple-100 ml-4 md:ml-6  pb-8">
                {data.tasks.map((task, index) => {

                    const isLast = index === data.tasks.length - 1;

                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            key={task.id}
                            onClick={() => setActiveId(task.id)}
                            className="relative pl-8 pb-8 pr-4 "
                        >
                            {!isLast && (
                                <div className="absolute top-1 -bottom-1 left-0 w-0.5 bg-purple-200" />
                            )}

                            {/* The Timeline Dot */}
                            <div className="absolute z-10 -left-4 top-1 w-8 h-8 bg-white border-2 border-purple-500 rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-xs font-bold text-purple-700">{task.day}</span>
                            </div>

                            {/* Task Card */}
                            <motion.div
                        
                                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group hover:border-purple-200  transition-all duration-200">
                                <div className="flex justify-between items-start gap-4 mb-2">
                                    {activeId === task.id ? (
                                        // ✏️ TITLE EDIT MODE
                                        <motion.textarea
                                            layout="position"
                                            rows={1}
                                            ref={(element) => autoResize(element)}
                                            
                                            value={task.title}
                                            onBlur={() => setActiveId(null)}
                                            onChange={(e) => {
                                                updateTask(task.id, 'title', e.target.value);
                                                autoResize(e.target);
                                            }}
                                            className="font-bold text-base text-gray-900 w-full bg-purple-50 outline-none rounded px-1 -ml-1 resize-none overflow-hidden"
                                        />
                                    ) : (
                                        // 👀 TITLE DISPLAY MODE
                                        <motion.div
                                            layout="position"
                                            className="font-bold text-base text-gray-900 w-full cursor-text line-clamp-2 px-1 -ml-1"
                                        >
                                            {task.title}
                                        </motion.div>
                                    )}

                                    {/* The Time Badge (Safe and sound on the right!) */}
                                    <span className="shrink-0 text-xs font-bold bg-stone-100 text-stone-600 px-2 py-1 rounded-md mt-0.5">
                                        {task.estimatedMinutes}m
                                    </span>
                                </div>


                                {activeId === task.id ? (
                                    // ✏️ EDIT MODE (expanded)
                                    <motion.textarea
                                        ref={(element) => {
                                            autoResize(element);
                                        }}
                                        layout="position"
                                        value={task.detail}
                                        onBlur={() => setActiveId(null)}
                                        onChange={(e) => updateTask(task.id, 'detail', e.target.value)}
                                        className="text-sm text-gray-600 w-full bg-purple-50 rounded px-1 -ml-1 resize-none outline-none transition-all duration-150"
                                    />
                                ) : (
                                    // 👀 DISPLAY MODE (clamped)
                                    <motion.div
                                        layout="position"
                                        className="text-sm text-gray-600 line-clamp-2 cursor-text"
                                    >
                                        {task.detail}
                                    </motion.div>
                                )}
                            </motion.div>
                        </motion.div>)
                })}
            </div>

            {/* Fixed Bottom Action */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2  max-w-md w-screen p-6 z-50 flex justify-center">
                <button
                    onClick={() => onAcceptMarathon(data)}
                    disabled={isSaving}
                    className="w-full max-w-md bg-gray-900 hover:bg-black text-white py-4 rounded-full font-bold text-lg shadow-2xl active:scale-95 transition-all disabled:bg-neutral-700 disabled:active:scale-100 disabled:text-gray-200 disabled:cursor-not-allowed"
                >
                    Accept & Start Marathon 🚀
                </button>
            </div>
        </div>
    );
}