"use client";
import { useState, useRef,useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface CounterProps {
    quantity: number;
    label: string;
    min?: number;
    max?: number;
    onPlus: () => void;
    onMinus: () => void;
}

export default function Counter({
    quantity, label, min = 0, max = 30, onPlus, onMinus
}: CounterProps) {
    const [direction, setDirection] = useState(1);

    const decrease = () => {
        if (quantity > min) {
            onMinus();
        }
    };

    const increase = () => {
        if (quantity < max) {
            onPlus();
        }
    };

    return (
        <div className="flex items-center justify-between w-full p-4 bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
            <span className="font-bold text-gray-700 text-lg">{label}</span>

            <motion.div
                layout
                className="w-fit flex items-center gap-1 bg-stone-100 p-1.5 rounded-full shadow-inner border border-stone-200">
                <button
                    onClick={decrease}
                    disabled={quantity <= min}
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-stone-600 active:scale-90 active:bg-stone-200 transition-all disabled:opacity-40 disabled:active:scale-100"
                >
                    <Minus size={18} strokeWidth={3} />
                </button>

                <div className="mx-2 w-fit flex justify-center">
                    <AnimatedNumber value={quantity} />
                </div>

                <button
                    onClick={increase}
                    disabled={quantity >= max}
                    className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center shadow-md shadow-purple-200 text-white active:scale-90 active:bg-purple-700 transition-all disabled:opacity-40 disabled:active:scale-100"
                >
                    <Plus size={18} strokeWidth={3} />
                </button>
            </motion.div>
        </div>
    );
}

const variants = {
    enter: (direction: number) => ({
        y: direction > 0 ? "24px" : "-24px",
        opacity: 0,
        filter: "blur(2px)"
    }),
    center: { y: 0, opacity: 1, filter: "blur(0px)" },
    exit: (direction: number) => ({
        y: direction < 0 ? "24px" : "-24px",
        opacity: 0,
        filter: "blur(2px)"
    })
};




function AnimatedNumber({ value }: { value: number }) {

    const uniqueKey = useRef(0);
    const prevValueRef = useRef(value);
    const direction = value > prevValueRef.current ? 1 : -1;

    if (prevValueRef.current !== value) {
        uniqueKey.current += 1;
        // prevValueRef.current = value;
    }

    useEffect(() => {
        prevValueRef.current = value;
    }, [value]);

    return (
        <motion.div
            layout
            className="relative h-6 w-fit min-w-[1ch] overflow-hidden flex items-center justify-center transition-[width] duration-300"
        >
            {/* 2. THE GHOST: This span is invisible but pushes the width of the div */}
            <span className="invisible px-1 font-bold text-xl select-none">
                000
            </span>

            <AnimatePresence initial={false} custom={direction}>
                <motion.span
                    key={uniqueKey.current}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "tween", duration: 0.15, ease: "easeOut" }}
                    className="absolute font-bold text-stone-800 text-xl whitespace-nowrap"
                >
                    {value}
                </motion.span>
            </AnimatePresence>
        </motion.div>
    );
}



