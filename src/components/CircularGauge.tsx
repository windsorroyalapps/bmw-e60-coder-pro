import React, { useEffect, useRef } from 'react';

interface CircularGaugeProps {
  value: number;
  min: number;
  max: number;
  warningThreshold: number;
  dangerThreshold: number;
  unit: string;
  label: string;
  size?: number;
  color?: string;
  showPeak?: boolean;
  peakValue?: number;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  min,
  max,
  warningThreshold,
  dangerThreshold,
  unit,
  label,
  size = 180,
  color,
  showPeak = true,
  peakValue = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const currentVal = useRef(value);

  const actualSize = size * 2; // Retina
  const startAngle = Math.PI * 0.75;
  const endAngle = Math.PI * 2.25;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      // Smooth interpolation
      const diff = value - currentVal.current;
      currentVal.current += diff * 0.15;

      ctx.clearRect(0, 0, actualSize, actualSize);
      ctx.scale(2, 2);
      const c = size / 2;
      const r = size * 0.38;

      // Background arc
      ctx.beginPath();
      ctx.arc(c, c, r, startAngle, endAngle);
      ctx.lineWidth = size * 0.06;
      ctx.strokeStyle = '#1a1a2e';
      ctx.stroke();

      // Colored segments
      const range = max - min;
      const warnAngle = startAngle + ((warningThreshold - min) / range) * (endAngle - startAngle);
      const dangerAngle = startAngle + ((dangerThreshold - min) / range) * (endAngle - startAngle);

      // Green zone
      ctx.beginPath();
      ctx.arc(c, c, r, startAngle, Math.min(warnAngle, endAngle));
      ctx.lineWidth = size * 0.06;
      ctx.strokeStyle = '#00c853';
      ctx.stroke();

      // Yellow zone
      if (warnAngle < endAngle) {
        ctx.beginPath();
        ctx.arc(c, c, r, warnAngle, Math.min(dangerAngle, endAngle));
        ctx.lineWidth = size * 0.06;
        ctx.strokeStyle = '#ffd600';
        ctx.stroke();
      }

      // Red zone
      if (dangerAngle < endAngle) {
        ctx.beginPath();
        ctx.arc(c, c, r, dangerAngle, endAngle);
        ctx.lineWidth = size * 0.06;
        ctx.strokeStyle = '#ff1744';
        ctx.stroke();
      }

      // Value arc
      const valClamped = Math.max(min, Math.min(max, currentVal.current));
      const valAngle = startAngle + ((valClamped - min) / range) * (endAngle - startAngle);

      const isWarning = valClamped >= warningThreshold;
      const isDanger = valClamped >= dangerThreshold;
      const glowColor = isDanger ? '#ff1744' : isWarning ? '#ffd600' : (color || '#00e5ff');

      // Glow effect
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.arc(c, c, r, startAngle, valAngle);
      ctx.lineWidth = size * 0.065;
      ctx.strokeStyle = glowColor;
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Tick marks
      const tickCount = 10;
      for (let i = 0; i <= tickCount; i++) {
        const angle = startAngle + (i / tickCount) * (endAngle - startAngle);
        const innerR = r - size * 0.08;
        const outerR = r - size * 0.03;
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(angle) * innerR, c + Math.sin(angle) * innerR);
        ctx.lineTo(c + Math.cos(angle) * outerR, c + Math.sin(angle) * outerR);
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#333';
        ctx.stroke();
      }

      // Needle
      const needleLength = r - size * 0.1;
      const needleAngle = valAngle;
      const nx = c + Math.cos(needleAngle) * needleLength;
      const ny = c + Math.sin(needleAngle) * needleLength;

      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.lineTo(nx, ny);
      ctx.lineWidth = 2;
      ctx.strokeStyle = glowColor;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(c, c, 4, 0, Math.PI * 2);
      ctx.fillStyle = glowColor;
      ctx.fill();

      // Value text
      ctx.font = `bold ${size * 0.16}px "Segoe UI", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const displayValue = unit === 'RPM'
        ? Math.round(currentVal.current).toLocaleString()
        : currentVal.current.toFixed(unit === 'lambda' || unit === '°C' || unit === '°' ? 1 : unit === 'bar' && currentVal.current < 0 ? 1 : 2);
      ctx.fillText(displayValue, c, c - size * 0.02);

      // Unit
      ctx.font = `${size * 0.08}px "Segoe UI", sans-serif`;
      ctx.fillStyle = '#888';
      ctx.fillText(unit, c, c + size * 0.1);

      // Label
      ctx.font = `bold ${size * 0.09}px "Segoe UI", sans-serif`;
      ctx.fillStyle = '#aaa';
      ctx.fillText(label, c, c + size * 0.22);

      // Peak value
      if (showPeak && peakValue > 0) {
        ctx.font = `${size * 0.07}px "Segoe UI", sans-serif`;
        ctx.fillStyle = '#ff6d00';
        const peakDisplay = unit === 'RPM' ? Math.round(peakValue).toLocaleString() : peakValue.toFixed(1);
        ctx.fillText(`Peak: ${peakDisplay}`, c, c + size * 0.32);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [value, min, max, warningThreshold, dangerThreshold, unit, label, size, color, showPeak, peakValue, actualSize]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={actualSize}
        height={actualSize * 1.15}
        style={{ width: size, height: size * 1.15 }}
        className="max-w-full"
      />
    </div>
  );
};

export default CircularGauge;
