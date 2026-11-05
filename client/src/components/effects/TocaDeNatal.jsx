import { useId } from 'react';

// Toca de Papai Noel desenhada aqui mesmo (SVG): vermelha, com a ponta caída e o pompom.
export function TocaDeNatal({ className = 'toca-natal' }) {
  const id = useId();
  return (
    <svg className={className} viewBox="0 0 120 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-vermelho`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff4b5c" />
          <stop offset="1" stopColor="#b3122a" />
        </linearGradient>
      </defs>
      {/* Corpo da toca, com a ponta caindo para a direita */}
      <path
        d="M16 80 C 22 44, 50 14, 90 14 C 104 14, 114 24, 112 42 C 104 34, 92 33, 86 42 C 80 54, 84 68, 94 80 Z"
        fill={`url(#${id}-vermelho)`}
      />
      {/* Brilho */}
      <path d="M34 66 C 40 44, 58 26, 82 22" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="5" strokeLinecap="round" />
      {/* Barra de pelúcia */}
      <rect x="6" y="70" width="98" height="22" rx="11" fill="#fbfbf7" />
      <rect x="6" y="70" width="98" height="22" rx="11" fill="none" stroke="#d9dcd5" strokeWidth="2" />
      {/* Pompom */}
      <circle cx="110" cy="46" r="10" fill="#fbfbf7" stroke="#d9dcd5" strokeWidth="2" />
    </svg>
  );
}

// Foto (ou qualquer avatar) com a toca por cima, quando a pessoa usa.
export function ComToca({ ativa, children, className = '' }) {
  if (!ativa) return children;
  return (
    <span className={`com-toca ${className}`.trim()}>
      {children}
      <TocaDeNatal />
    </span>
  );
}
