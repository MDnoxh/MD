import React, { useState, useEffect } from 'react';

interface EditableTextProps {
  id: string;
  text: string;
  isEditing: boolean;
  onSave: (id: string, text: string) => void;
  className?: string;
  as?: any;
}

export default function EditableText({ id, text, isEditing, onSave, className = '', as = 'div' }: EditableTextProps) {
  const Component = as || 'div';
  const [localValue, setLocalValue] = useState(text || '');

  useEffect(() => {
    setLocalValue(text || '');
  }, [text]);

  const handleBlur = () => {
    onSave(id, localValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
  };

  if (isEditing) {
    const isLongText = (text && text.length > 60) || as === 'p' || as === 'div' || as === 'span' && (text && text.includes('\n'));
    
    if (isLongText) {
      return (
        <div className="relative w-full group animate-pulse">
          <textarea
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`${className} w-full min-h-[80px] bg-amber-50/75 border-2 border-dashed border-amber-500 rounded-2xl p-3 focus:bg-white focus:border-amber-600 focus:ring-4 focus:ring-amber-100 outline-none text-[#1a3c6e] font-semibold text-sm transition-all duration-200`}
            rows={Math.max(3, Math.ceil(localValue.length / 50))}
          />
          <span className="absolute -top-2 -left-1 bg-amber-600 text-white text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md shadow-sm pointer-events-none z-10">
            Sửa Văn Bản (Dài) ✏️
          </span>
        </div>
      );
    } else {
      return (
        <div className="relative w-full inline-block group animate-pulse">
          <input
            type="text"
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`${className} w-full bg-amber-50/75 border-2 border-dashed border-amber-500 rounded-xl px-3 py-1.5 focus:bg-white focus:border-amber-600 focus:ring-4 focus:ring-amber-100 outline-none text-[#1a3c6e] font-bold transition-all duration-200`}
          />
          <span className="absolute -top-2 -left-1 bg-amber-600 text-white text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md shadow-sm pointer-events-none z-10">
            ✏️ Sửa
          </span>
        </div>
      );
    }
  }

  return (
    <Component className={className}>
      {text}
    </Component>
  );
}
