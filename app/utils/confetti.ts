// app/utils/confetti.ts
import confetti from 'canvas-confetti';

export const triggerCompletionCannons = () => {
    const duration = 3000; // Fires for 3 seconds
    const end = Date.now() + duration;

    // Custom colors matching your app theme (Purple, Pink, Gold/Orange)
    const appColors = ['#9333ea', '#ec4899', '#f59e0b', '#ffffff'];

    (function frame() {
        // Left Cannon
        confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.8 }, // Bottom left
            colors: appColors,
            zIndex: 1000 // Ensures it's on top of everything
        });
        
        // Right Cannon
        confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.8 }, // Bottom right
            colors: appColors,
            zIndex: 1000
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
};