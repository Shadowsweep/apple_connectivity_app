import React from 'react';
import { Palette, Check } from '../icons';
import { libraryApi } from '../../api/libraryApi';

const PRESETS = [
  { name: 'Lime', accent: '#91C733', hover: '#A6DB4D' },
  { name: 'Blue', accent: '#2E7CF6', hover: '#438CF9' },
  { name: 'Emerald', accent: '#00D68F', hover: '#1EE8A5' },
  { name: 'Amber', accent: '#FFB300', hover: '#FFC533' },
  { name: 'Crimson', accent: '#FF3B30', hover: '#FF5548' },
  { name: 'Magenta', accent: '#E879F9', hover: '#F09AFF' },
];

export const AccentThemeCard: React.FC = () => {
  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem('mm-accent') || 'null');
    } catch {
      return null;
    }
  })();
  const [accent, setAccent] = React.useState<string>(stored?.accent || '#91C733');
  const [hover, setHover] = React.useState<string>(stored?.hover || '#A6DB4D');

  const apply = (a: string, h: string) => {
    setAccent(a);
    setHover(h);
    document.documentElement.style.setProperty('--mm-accent', a);
    document.documentElement.style.setProperty('--mm-accent-hover', h);
    localStorage.setItem('mm-accent', JSON.stringify({ accent: a, hover: h }));
    // ponytail: fire-and-forget persistence; localStorage already applied the change
    libraryApi.setAccent(a, h).catch(() => {});
  };

  return (
    <div className='bg-[#1A1D28] rounded-2xl p-6 border border-(--mm-accent)/25 space-y-4'>
      <div className='flex items-center gap-3'>
        <div className='p-2.5 rounded-xl bg-(--mm-accent)/15 text-(--mm-accent)'>
          <Palette className='w-5 h-5' />
        </div>
        <div>
          <h4 className='text-sm font-semibold text-white'>Interface Accent</h4>
          <p className='text-xs text-[#A0A6B8]'>
            Pick the highlight color used across buttons, navigation, and active states. Saved instantly.
          </p>
        </div>
      </div>

      <div className='flex items-center gap-2.5 flex-wrap pt-3 border-t border-[#232736]'>
        {PRESETS.map((p) => (
          <button
            key={p.name}
            title={p.name}
            onClick={() => apply(p.accent, p.hover)}
            className='w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all hover:scale-105'
            style={{
              backgroundColor: p.accent,
              borderColor: accent.toLowerCase() === p.accent.toLowerCase() ? '#FFFFFF' : 'transparent',
            }}
          >
            {accent.toLowerCase() === p.accent.toLowerCase() && <Check className='w-4 h-4 text-[#090A0F]' />}
          </button>
        ))}

        <label
          title='Custom color'
          className='w-9 h-9 rounded-xl border-2 border-dashed border-[#30354A] flex items-center justify-center cursor-pointer hover:border-(--mm-accent) transition-colors overflow-hidden'
          style={{ backgroundColor: accent + '33' }}
        >
          <input
            type='color'
            value={accent}
            onChange={(e) => apply(e.target.value, e.target.value)}
            className='sr-only'
          />
          <span className='text-[9px] font-mono text-white/70'>+</span>
        </label>

        <span className='ml-auto text-[11px] font-mono text-[#6B7280] uppercase'>{accent}</span>
      </div>
    </div>
  );
};
