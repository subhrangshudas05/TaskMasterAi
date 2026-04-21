"use client";

import "@ncdai/react-wheel-picker/style.css";

import React, { useState, useEffect } from "react";
import {
  WheelPicker,
  WheelPickerWrapper,
  type WheelPickerOption,
} from "@ncdai/react-wheel-picker";

const ampmOptions: WheelPickerOption<string>[] = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
];

const hoursOptions: WheelPickerOption<string>[] = Array.from({ length: 12 }, (_, i) => {
  const val = String(i + 1).padStart(2, "0");
  return { value: val, label: val };
});

const minutesOptions: WheelPickerOption<string>[] = Array.from({ length: 60 }, (_, i) => {
  const val = String(i).padStart(2, "0");
  return { value: val, label: val };
});

export default function NativeTimePicker({
  defaultHour = "08",
  defaultMinute = "00",
  defaultAmPm = "AM",
  onChange,
}: {
  defaultHour?: string;
  defaultMinute?: string;
  defaultAmPm?: "AM" | "PM";
  onChange?: (time: { hour: string; minute: string; ampm: string }) => void;
}) {
  const [hour, setHour] = useState(defaultHour);
  const [minute, setMinute] = useState(defaultMinute);
  const [ampm, setAmPm] = useState(defaultAmPm);

  useEffect(() => {
    onChange?.({ hour, minute, ampm });
  }, [hour, minute, ampm, onChange]);

  // optionItemHeight must match WheelPicker's optionItemHeight prop
  const ITEM_HEIGHT = 50;

  return (
    <div className="inline-flex  py-2">
      {/* 
        relative + overflow-hidden on the outer shell lets us absolutely 
        position the colon so it sits exactly on the center highlight row.
      */}
      <div className="relative">
        <WheelPickerWrapper
          className="flex items-center justify-center gap-4 px-8 py-6 rounded-[32px] bg-white/90 shadow-2xl border border-slate-100 font-manrope"
        >
          {/* AM/PM */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-base font-bold text-slate-400 uppercase  tracking-widest opacity-0 select-none">
              AM
            </span>
            <div className="w-14">
              <WheelPicker
                options={ampmOptions}
                value={ampm}
                onValueChange={(val) => setAmPm(val as "AM" | "PM")}
                optionItemHeight={ITEM_HEIGHT}
                classNames={{
                  optionItem: "text-slate-300 text-lg",
                  // solid white bg prevents ghost bleed-through
                  highlightItem:
                    "text-slate-900 font-bold text-xl bg-white",
                }}
              />
            </div>
          </div>


          {/* Hours */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-base  font-bold text-slate-400 uppercase tracking-widest">
              H
            </span>
            <div className="w-16">
              <WheelPicker
                options={hoursOptions}
                value={hour}
                onValueChange={(val) => setHour(val as string)}
                infinite={true}
                optionItemHeight={ITEM_HEIGHT}
                classNames={{
                  optionItem: "text-slate-300 text-2xl",
                  highlightItem:
                    "text-slate-900 font-bold text-3xl bg-white",
                }}
              />
            </div>
          </div>


          {/*
            Colon: absolutely centered in the wrapper.
            top: 50% places it at the vertical midpoint of the whole
            WheelPickerWrapper; then -translateY(50%) + the item offset
            lands it exactly on the selected row.
            We use pointer-events-none so it doesn't block scroll.
          */}
          {/* <div
            className="absolute left-1/2 translate-x-8 pointer-events-none z-10 flex items-center justify-center text-slate-900 font-bold"
            style={{
              top: "50%",
              transform: "translate(-50%, -50%)",
              height: `${ITEM_HEIGHT}px`,
              fontSize: "1.75rem",
              lineHeight: 1,
              // nudge right to sit between the two number columns
              // adjust this value to taste
              marginLeft: "2px",
            }}
          >
            :
          </div> */}

          {/* Minutes */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-base font-manrope font-bold text-slate-400 uppercase tracking-widest">
              M
            </span>
            <div className="w-16">
              <WheelPicker
                options={minutesOptions}
                value={minute}
                onValueChange={(val) => setMinute(val as string)}
                infinite={true}
                optionItemHeight={ITEM_HEIGHT}
                classNames={{
                  optionItem: "text-slate-300 text-2xl",
                  highlightItem:
                    "text-slate-900 font-bold text-3xl bg-white",
                }}
              />
            </div>
          </div>

        </WheelPickerWrapper>
      </div>
    </div>
  );
}