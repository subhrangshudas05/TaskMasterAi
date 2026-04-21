// app/lib/IstTime.ts

export function getISTDayBoundaries(dateString?: string | null) {
    // 1. If a specific date is passed, use it. Otherwise, use right now.
    const targetDate = dateString ? new Date(dateString) : new Date();

    const istDateString = targetDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istDateString);

    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const day = String(istDate.getDate()).padStart(2, '0');

    const startISTStr = `${year}-${month}-${day}T00:00:00+05:30`;
    const endISTStr = `${year}-${month}-${day}T23:59:59.999+05:30`;

    return {
        startOfDay: new Date(startISTStr),
        endOfDay: new Date(endISTStr)
    };
}

// 2. NEW HELPER: Checks if the requested date is actually "Today" in India
export function isDateTodayInIST(dateString?: string | null) {
    if (!dateString) return true; // Empty means today

    const todayIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const targetIST = new Date(new Date(dateString).toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    return todayIST.getFullYear() === targetIST.getFullYear() &&
           todayIST.getMonth() === targetIST.getMonth() &&
           todayIST.getDate() === targetIST.getDate();
}