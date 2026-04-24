'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MoveLeft, MoreVertical, Edit2, Trash2, Check } from 'lucide-react'
import { triggerCompletionCannons } from '@/app/utils/confetti';
import useSWR from 'swr'
import { addToOutbox } from "@/app/lib/Offline-sync";


// Define the shape of our data
interface Step {
    day: number;
    title: string;
    detail: string;
    estimatedMinutes: number;
    isCompleted: boolean;
}

interface Marathon {
    _id: string;
    title: string;
    steps: Step[];
    status: string;
}

export default function MarathonExecutionPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    // --- 1. SWR Data Fetching ---
    // This completely replaces your fetch useEffect, loading state, and setMarathon state
    const { data: marathonData, mutate, isLoading, error } = useSWR<{ success: boolean; marathon: Marathon }>(
        id ? `/api/marathons/${id}` : null
    );
    
    // Extract marathon for easy reference throughout the component
    const marathon = marathonData?.marathon;

    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Edit States
    const [showMenu, setShowMenu] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleValue, setEditTitleValue] = useState("");

    // Sync the edit title value once SWR fetches the marathon data
    useEffect(() => {
        if (marathon) {
            setEditTitleValue(marathon.title);
        }
    }, [marathon?.title]);

    // Track which task is currently being edited
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [tempTitle, setTempTitle] = useState("");
    const [tempDetail, setTempDetail] = useState("");

    // Helper for auto-resizing textareas during edit
    const autoResize = (element: HTMLTextAreaElement | null) => {
        if (element) {
            element.style.height = "auto";
            element.style.height = element.scrollHeight + "px";
        }
    };

    // --- 2. API ACTIONS ---

    // A. Delete Marathon
   const handleDelete = async () => {
        // Prevent deleting a marathon that hasn't synced to DB yet
        if (id.startsWith('temp_')) {
            router.push('/'); 
            return;
        }

        setIsDeleting(true); 

        try {
            const res = await fetch(`/api/marathons/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed to delete");
            
            mutate(); 
            router.push('/'); 
        } catch (err) {
            if (!navigator.onLine) {
                // 🚨 OFFLINE BYPASS
                addToOutbox({
                    type: 'DELETE_MARATHON',
                    endpoint: `/api/marathons/${id}`,
                    method: 'DELETE',
                    body: null
                });
                router.push('/'); // Still push them back to dashboard offline!
            } else {
                setIsDeleting(false); // Server error: Stop the spinner
            }
        }
    };

    // B. Edit Marathon Title
    const handleSaveTitle = async () => {
        setIsEditingTitle(false);
        if (!marathon || !marathonData || editTitleValue === marathon.title) return;

        // 1. Instant UI Update
        mutate({ ...marathonData, marathon: { ...marathon, title: editTitleValue } }, false);

        try {
            const res = await fetch(`/api/marathons/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'EDIT_TITLE', newTitle: editTitleValue })
            });
            if (!res.ok) throw new Error("Failed to edit title");
            
            mutate();
        } catch (err) {
            if (!navigator.onLine) {
                // 🚨 OFFLINE BYPASS
                addToOutbox({
                    type: 'EDIT_MARATHON_TITLE',
                    endpoint: `/api/marathons/${id}`,
                    method: 'PATCH',
                    body: { action: 'EDIT_TITLE', newTitle: editTitleValue }
                });
            } else {
                // Rollback UI
                mutate(marathonData, false);
            }
        }
    };

    // toggle task check/uncheck
    const toggleTask = async (taskDay: number) => {
        if (!marathon || !marathonData) return;

        const prevIncomplete = marathon.steps.some(step => step.day < taskDay && !step.isCompleted);
        if (prevIncomplete) return;

        const targetTask = marathon.steps.find(s => s.day === taskDay);
        if (!targetTask) return;

        if (targetTask.isCompleted) {
            const subsequentCompleted = marathon.steps.some(step => step.day > taskDay && step.isCompleted);
            if (subsequentCompleted) return; 
        }

        const newIsCompleted = !targetTask.isCompleted;
        const updatedSteps = marathon.steps.map(step =>
            step.day === taskDay ? { ...step, isCompleted: newIsCompleted } : step
        );

        const isAllDone = updatedSteps.every(step => step.isCompleted);
        const newStatus = isAllDone ? 'completed' : (marathon.status === 'completed' ? 'active' : marathon.status);

        // 1. INSTANT UI UPDATE
        mutate({ ...marathonData, marathon: { ...marathon, steps: updatedSteps, status: newStatus as any } }, false);

        try {
            // 2. Main API Call
            const res1 = await fetch(`/api/marathons/${id}/toggle`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'EDIT_TASK',
                    day: taskDay,
                    isCompleted: newIsCompleted,
                })
            });
            if (!res1.ok) throw new Error("Failed to toggle");

            // 3. Second API Call (If status changed)
            if (newStatus !== marathon.status) {
                const res2 = await fetch(`/api/marathons/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'EDIT_TITLE',
                        newTitle: marathon.title,
                        status: newStatus
                    })
                });
                if (!res2.ok) throw new Error("Failed to update status");

                if (isAllDone) {
                    triggerCompletionCannons();
                    console.log("🏆 MARATHON COMPLETED!");
                }
            }
            
            mutate();
        } catch (err) {
            if (!navigator.onLine) {
                // 🚨 OFFLINE BYPASS: We might need to queue TWO outbox actions here!
                addToOutbox({
                    type: 'TOGGLE_MARATHON_STEP',
                    endpoint: `/api/marathons/${id}/toggle`,
                    method: 'PATCH',
                    body: { action: 'EDIT_TASK', day: taskDay, isCompleted: newIsCompleted }
                });

                if (newStatus !== marathon.status) {
                    addToOutbox({
                        type: 'UPDATE_MARATHON_STATUS',
                        endpoint: `/api/marathons/${id}`,
                        method: 'PATCH',
                        body: { action: 'EDIT_TITLE', newTitle: marathon.title, status: newStatus }
                    });
                    
                    // Still trigger cannons offline! 🎉
                    if (isAllDone) triggerCompletionCannons();
                }
            } else {
                // Rollback
                mutate(marathonData, false);
            }
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        if (!marathon || !marathonData) return;
        
        // 1. Instant UI
        mutate({ ...marathonData, marathon: { ...marathon, status: newStatus as any } }, false); 

        if (marathon.status === 'completed') {
            mutate(); 
            return;
        }

        try {
            const res = await fetch(`/api/marathons/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'EDIT_TITLE', newTitle: marathon.title, status: newStatus })
            });
            if (!res.ok) throw new Error("Failed to change status");
            
            mutate();
        } catch (err) {
            if (!navigator.onLine) {
                 // 🚨 OFFLINE BYPASS
                 addToOutbox({
                    type: 'UPDATE_MARATHON_STATUS',
                    endpoint: `/api/marathons/${id}`,
                    method: 'PATCH',
                    body: { action: 'EDIT_TITLE', newTitle: marathon.title, status: newStatus }
                });
            } else {
                 mutate(marathonData, false);
            }
        }
    };

    // D. Save Task Text Edits
    const handleSaveTaskEdit = async (taskDay: number, updatedTitle: string, updatedDetail: string) => {
        if (!marathon || !marathonData) return;

        const targetTask = marathon.steps.find(s => s.day === taskDay);
        setEditingTaskId(null); 

        // 1. Instant UI
        const updatedSteps = marathon.steps.map(step =>
            step.day === taskDay ? { ...step, title: updatedTitle, detail: updatedDetail } : step
        );
        mutate({ ...marathonData, marathon: { ...marathon, steps: updatedSteps } }, false);

        try {
            const res = await fetch(`/api/marathons/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'EDIT_TASK',
                    day: taskDay,
                    isCompleted: targetTask?.isCompleted || false,
                    newTitle: updatedTitle,
                    newDetail: updatedDetail
                })
            });
            if (!res.ok) throw new Error("Failed to edit step details");
            
            mutate();
        } catch (err) {
             if (!navigator.onLine) {
                 // 🚨 OFFLINE BYPASS
                 addToOutbox({
                    type: 'EDIT_MARATHON_STEP_TEXT',
                    endpoint: `/api/marathons/${id}`,
                    method: 'PATCH',
                    body: {
                        action: 'EDIT_TASK',
                        day: taskDay,
                        isCompleted: targetTask?.isCompleted || false,
                        newTitle: updatedTitle,
                        newDetail: updatedDetail
                    }
                });
             } else {
                 mutate(marathonData, false);
             }
        }
    };

    if (isLoading) return <div className="p-8 min-h-screen text-center text-gray-500 pt-20">Loading your marathon...</div>;
    if (!marathon) return <div className="p-8 min-h-screen text-center font-bold text-red-500">Marathon not found.</div>;

    return (
        <div className="relative w-full max-w-xl font-manrope mx-auto pb-32 px-4">

            {/* --- TOP NAV BAR --- */}
            <div className="flex justify-between items-center  pt-5 pb-2 relative z-50">
                <button
                    onClick={() => router.push('/')}
                    className="bg-black/5 hover:bg-black/10 p-2 active:scale-95 transition-all rounded-full "
                >
                    <MoveLeft className="w-5 h-5 text-gray-700" />
                </button>

                {/* 3-Dot Menu */}
                <div ref={menuRef} className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="bg-black/5 hover:bg-black/10 p-2 rounded-full transition-colors"
                    >
                        <MoreVertical className="w-5 h-5 text-gray-700" />
                    </button>

                    <AnimatePresence>
                        {showMenu && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                className="absolute right-0 top-12 bg-white rounded-xl shadow-lg border border-gray-100 py-2 w-40 z-50 overflow-hidden"
                            >
                                <button
                                    onClick={() => { setShowMenu(false); setIsEditingTitle(true); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 flex items-center gap-2"
                                >
                                    <Edit2 className="w-4 h-4" /> Edit Title
                                </button>
                                <button
                                    onClick={() => {
                                        setShowMenu(false);
                                        setShowDeleteModal(true);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* --- MARATHON TITLE & STATUS --- */}
            <div className="text-center  mb-8">
                {/* Status Badge Dropdown */}
                <div className="relative inline-block mb-3">
                    <select
                        value={marathon.status || 'active'}
                        onChange={(e) => {
                            marathon.status !== 'completed'? handleUpdateStatus(e.target.value): null}}
                        className="appearance-none bg-purple-100 text-purple-700 text-xs font-bold px-4 py-1.5 rounded-full outline-none cursor-pointer pr-8 text-center uppercase tracking-wider"
                    >
                        <option value="active">🟢 Active</option>
                        <option value="paused">🟡 Paused</option>
                        {marathon.status == 'completed' && <option value="completed">✅ Completed</option>}
                    </select>
                    {/* Tiny custom arrow for the select dropdown */}
                    <div className="absolute right-2.5 top-[7px] pointer-events-none">
                        <svg className="w-3 h-3 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>

                {/* Title Editor */}
                {isEditingTitle ? (
                    <textarea
                        rows={1}
                        autoFocus
                        ref={autoResize}
                        value={editTitleValue}
                        onChange={(e) => {
                            setEditTitleValue(e.target.value);
                            autoResize(e.target);
                        }}
                        onBlur={handleSaveTitle} // <-- Auto saves when clicked away!
                        className="text-2xl font-black text-gray-900 text-center w-full bg-white border-2 border-purple-200 outline-none focus:border-purple-500 rounded-xl px-4 py-2 resize-none overflow-hidden shadow-sm"
                    />
                ) : (
                    <h1
                        onClick={() => setIsEditingTitle(true)}
                        className="text-2xl font-black text-gray-900 cursor-text hover:text-purple-900 transition-colors"
                    >
                        {marathon.title}
                    </h1>
                )}
            </div>

            {/* --- THE TIMELINE --- */}
            <div className="relative border-purple-100 ml-4 md:ml-6 pb-8">
                {marathon.steps.map((task, index) => {

                    const prevIncomplete = marathon.steps.some(step => step.day < task.day && !step.isCompleted);
                    const subsequentCompleted = marathon.steps.some(step => step.day > task.day && step.isCompleted);

                    const isLast = index === marathon.steps.length - 1;
                    const isEditing = editingTaskId === task.day;

                    const isLocked = (!task.isCompleted && prevIncomplete) || (task.isCompleted && subsequentCompleted);

                    return (
                        <motion.div
                            layout
                            key={task.day}
                            className="relative pl-8 pb-8 pr-2"
                        >
                            {/* The Connecting Line */}
                            {!isLast && (
                                <div className={`absolute top-1 -bottom-1 left-[-1px] w-[2px] transition-colors duration-500 ${task.isCompleted ? 'bg-purple-500' : 'bg-purple-200'}`} />
                            )}

                            {/* The Timeline Dot / Checkmark */}
                            <div
                                // 2. Prevent onClick from firing if locked
                                onClick={() => !isLocked && toggleTask(task.day)}
                                className={`absolute z-10 -left-[17px] top-1 w-8 h-8 rounded-full  flex items-center justify-center transition-all duration-300 ${task.isCompleted
                                    ? isLocked
                                        ? 'bg-purple-400 text-white cursor-not-allowed ' // Completed, but locked from unchecking
                                        : 'bg-[#8813db]  text-white scale-110 cursor-pointer shadow-md hover:bg-purple-700' // Completed, CAN uncheck
                                    : isLocked
                                        ? 'bg-white  text-purple-400 ring-2 ring-purple-200 cursor-not-allowed ' // Locked future step (faded)
                                        : 'bg-white  text-purple-700 cursor-pointer scale-110 ring-2 ring-purple-500 shadow-sm' // The EXACT NEXT step (vibrant!)
                                    }`}
                            >
                                {task.isCompleted ? (
                                    <Check className="w-4 h-4 stroke-[3]" />
                                ) : (
                                    <span className="text-sm font-bold">{task.day}</span>
                                )}
                            </div>

                            {/* Task Card */}
                            <motion.div
                                layout
                                className={`p-5 rounded-2xl border transition-all duration-300 ${task.isCompleted
                                    ? 'bg-gray-50 border-gray-100 opacity-60'
                                    : 'bg-white shadow-sm border-gray-200'
                                    }`}
                            >
                                <div className="flex justify-between items-start gap-4">
                                    {/* Left Side: Title & Checkbox wrapper logic */}
                                    <div className="flex-1">
                                        {isEditing ? (
                                            <motion.textarea
                                                autoFocus
                                                layout="position"
                                                ref={autoResize}
                                                value={tempTitle}
                                                onChange={(e) => { setTempTitle(e.target.value); autoResize(e.target); }}
                                                className="font-bold text-base text-gray-900 w-full bg-purple-50 outline-none rounded px-2 py-1 -ml-2 resize-none overflow-hidden mb-2"
                                            />
                                        ) : (
                                            <motion.div
                                                layout="position"
                                                className={`font-bold text-base w-full transition-all duration-300 ${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'
                                                    }`}
                                            >
                                                {task.title}
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Right Side: Edit Button & Time */}
                                    {!task.isCompleted && (
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            {isEditing ? (
                                                <button
                                                    onClick={() => handleSaveTaskEdit(task.day, tempTitle, tempDetail)}
                                                    className="text-xs font-bold text-white bg-purple-600 px-3 py-1.5 rounded-lg"
                                                >
                                                    Save
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setEditingTaskId(task.day);
                                                        setTempTitle(task.title);
                                                        setTempDetail(task.detail);
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Task Details (Hidden if completed, unless editing) */}
                                <AnimatePresence initial={false}>
                                    {(!task.isCompleted || isEditing) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-2">
                                                {isEditing ? (
                                                    <textarea
                                                        ref={autoResize}
                                                        value={tempDetail}
                                                        onChange={(e) => { setTempDetail(e.target.value); autoResize(e.target); }}
                                                        className="text-sm text-gray-600 w-full bg-purple-50 outline-none rounded px-2 py-1 -ml-2 resize-none overflow-hidden"
                                                    />
                                                ) : (
                                                    <p className="text-sm text-gray-600 leading-relaxed">
                                                        {task.detail}
                                                    </p>
                                                )}

                                                {/* Time Badge at bottom of details */}
                                                {!isEditing && (
                                                    <div className="mt-3 flex">
                                                        <span className="text-xs font-bold bg-stone-100 text-stone-600 px-2 py-1 rounded-md">
                                                            {task.estimatedMinutes} min
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </motion.div>
                    );
                })}
            </div>
            {/* --- CUSTOM DELETE MODAL --- */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Dark blurred backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isDeleting && setShowDeleteModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />

                        {/* Modal Box */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-hidden z-10"
                        >
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">Delete Marathon?</h3>
                            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                                Are you sure you want to abandon this marathon? All your progress will be permanently lost.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex justify-center items-center disabled:bg-red-400"
                                >
                                    {isDeleting ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        "Delete"
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}