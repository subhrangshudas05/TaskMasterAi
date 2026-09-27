"use client";

import { useEffect, useRef } from "react";

interface WaveformProps {
  analyser: AnalyserNode | null;
  isRecording: boolean;
}

interface WaveConfig {
  freq: number;
  speed: number;
  ampMultiplier: number;
  color: string;
  lineWidth: number;
}

export default function Waveform({ analyser, isRecording }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const volumeRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High DPI Canvas Scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    const dataArray = analyser ? new Uint8Array(analyser.fftSize) : null;

    // Define 3 overlapping waves with different characteristics for a rich Siri/Gemini liquid look
    const waves: WaveConfig[] = [
      {
        freq: 1.5,
        speed: 0.08,
        ampMultiplier: 1.0,
        color: "rgba(135, 40, 198, 0.8)", // Purple
        lineWidth: 2,
      },
      {
        freq: 2.2,
        speed: -0.06,
        ampMultiplier: 0.65,
        color: "rgba(167, 139, 250, 0.5)", // Light violet
        lineWidth: 1.5,
      },
      {
        freq: 1.0,
        speed: 0.1,
        ampMultiplier: 0.4,
        color: "rgba(192, 132, 252, 0.35)", // Pinkish purple
        lineWidth: 1.5,
      },
    ];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      let targetVolume = 0;

      if (isRecording && analyser && dataArray) {
        analyser.getByteTimeDomainData(dataArray);

        // Calculate Root Mean Square (RMS) of audio stream volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = (dataArray[i] - 128) / 128; // Normalise to -1..1
          sum += val * val;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        
        // Scale and clamp volume (rms is generally between 0 and 0.5 for voice)
        // Set multiplier to 12 for higher responsiveness during normal voice volumes
        targetVolume = Math.min(1, rms * 12);
      }

      // Smooth volume transitions (prevent jittery spikes)
      volumeRef.current += (targetVolume - volumeRef.current) * 0.16;

      // Update Phase for motion scrolling
      phaseRef.current += 0.05;

      // Ambient breathing effect when recording is active but silent
      const breathing = Math.sin(Date.now() * 0.003) * 0.4 + 0.6; // 0.2 to 1.0
      const baseIdleAmplitude = isRecording ? 2.5 : 1.2; // Keep tiny baseline when modal is open
      const maxAmplitude = height / 2.2; // Maximum peak height

      // Draw each wave
      waves.forEach((wave) => {
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = wave.lineWidth;
        ctx.lineCap = "round";

        // Calculate maximum peak for this specific wave
        const amplitude =
          volumeRef.current * maxAmplitude * wave.ampMultiplier +
          baseIdleAmplitude * breathing * wave.ampMultiplier;

        for (let x = 0; x < width; x++) {
          // Normalize x coordinate to a percentage (0..1)
          const pct = x / width;

          // Fade out wave heights near boundaries (left/right margins) for a floating look
          const edgeEnvelope = Math.sin(pct * Math.PI); // Becomes 0 at edges, 1 at center

          // Calculate horizontal sine wave angle with phase offset
          const angle = pct * Math.PI * 2 * wave.freq + phaseRef.current * wave.speed;
          
          const y = centerY + Math.sin(angle) * amplitude * edgeEnvelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      className="w-32 h-10 block pointer-events-none"
      style={{ width: "128px", height: "40px" }}
    />
  );
}
