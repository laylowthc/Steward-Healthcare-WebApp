import React, { useEffect, useRef } from 'react';
import { HrSignatureType } from '../types/hrOnboarding';

interface Props {
  type: HrSignatureType;
  value: string;
  signerName: string;
  disabled?: boolean;
  onTypeChange: (type: HrSignatureType) => void;
  onChange: (value: string) => void;
}

export default function HrSignatureInput({
  type,
  value,
  signerName,
  disabled,
  onTypeChange,
  onChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || type !== 'drawn' || !value.startsWith('data:image')) return;
    const image = new Image();
    image.onload = () => {
      const context = canvas.getContext('2d');
      context?.clearRect(0, 0, canvas.width, canvas.height);
      context?.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = value;
  }, [type, value]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
    };
  };

  return (
    <div className="space-y-3 rounded-xl border border-purple-200 bg-purple-50/50 p-4">
      <div className="flex rounded-lg border bg-white p-1">
        {(['typed', 'drawn'] as HrSignatureType[]).map(option => (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => { onTypeChange(option); onChange(''); }}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-bold ${type === option ? 'bg-purple-900 text-white' : 'text-slate-600'}`}
          >
            {option === 'typed' ? 'Type signature' : 'Draw signature'}
          </button>
        ))}
      </div>

      {type === 'typed' ? (
        <input
          aria-label="Typed electronic signature"
          disabled={disabled}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={signerName || 'Type your full legal name'}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-serif text-lg italic text-purple-950 disabled:bg-slate-100"
        />
      ) : (
        <div>
          <canvas
            ref={canvasRef}
            width={720}
            height={160}
            aria-label="Draw electronic signature"
            className="h-36 w-full touch-none rounded-xl border border-slate-300 bg-white"
            onPointerDown={event => {
              if (disabled) return;
              drawing.current = true;
              const context = event.currentTarget.getContext('2d');
              const current = point(event);
              context?.beginPath();
              context?.moveTo(current.x, current.y);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={event => {
              if (!drawing.current || disabled) return;
              const context = event.currentTarget.getContext('2d');
              const current = point(event);
              if (context) {
                context.lineWidth = 3;
                context.lineCap = 'round';
                context.strokeStyle = '#351064';
                context.lineTo(current.x, current.y);
                context.stroke();
              }
            }}
            onPointerUp={event => {
              if (!drawing.current || disabled) return;
              drawing.current = false;
              onChange(event.currentTarget.toDataURL('image/png'));
            }}
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => {
                const canvas = canvasRef.current;
                canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
                onChange('');
              }}
              className="mt-2 text-xs font-bold text-rose-700"
            >
              Clear signature
            </button>
          )}
        </div>
      )}
      <p className="text-[10px] leading-4 text-slate-500">
        Your signature is stored with your authenticated user ID, name, form revision and signing timestamp.
      </p>
    </div>
  );
}
