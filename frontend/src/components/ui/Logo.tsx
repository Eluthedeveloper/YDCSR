import { useState } from 'react';
import { Radio } from 'lucide-react';

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * App logo. Renders the placeholder /logo.svg from the public folder.
 * To use your real logo later, replace frontend/public/logo.svg
 * (or drop logo.png and change `src` below). If the file is
 * missing, a gradient radio-icon badge is shown instead.
 */
export default function Logo({ size = 40, className = '' }: LogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center shrink-0 bg-[#FBFAF6] text-primary-600 border border-[#E9E4D8] ${className}`}
        style={{ width: size, height: size }}
      >
        <Radio size={Math.round(size * 0.5)} />
      </div>
    );
  }

  return (
    <img
      src="/logo.svg"
      alt="Logo"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`object-contain shrink-0 rounded-xl ${className}`}
    />
  );
}
