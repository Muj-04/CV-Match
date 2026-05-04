interface LogoProps {
  variant?: "light" | "dark";
  height?: number;
}

export default function Logo({ variant = "dark", height = 34 }: LogoProps) {
  const isDark = variant === "light";
  const badgeBg = isDark ? "#0a1628" : "#0a1628";
  const cStroke1 = isDark ? "#c0e6fd" : "#c0e6fd";
  const cStroke2 = isDark ? "#3f6593" : "#3f6593";
  const borderStart = isDark ? "rgba(192,230,253,0.6)" : "rgba(192,230,253,0.4)";
  const borderEnd = isDark ? "rgba(63,101,147,0.3)" : "rgba(63,101,147,0.2)";
  const wordCV = isDark ? "white" : "#1b3554";
  const wordMatch = isDark ? "rgba(192,230,253,0.65)" : "#5b86b6";
  const width = (160 / 34) * height;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 160 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="CV Match"
    >
      <defs>
        <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={borderStart}/>
          <stop offset="100%" stopColor={borderEnd}/>
        </linearGradient>
        <linearGradient id="cGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={cStroke1}/>
          <stop offset="100%" stopColor={cStroke2}/>
        </linearGradient>
      </defs>

      {/* Badge background */}
      <rect x="1" y="1" width="32" height="32" rx="8" fill={badgeBg}/>
      {/* Gradient border */}
      <rect x="1" y="1" width="32" height="32" rx="8" fill="none" stroke="url(#borderGrad)" strokeWidth="1.5"/>

      {/* Gradient C */}
      <path
        d="M22 8 C15 5, 6 8, 6 17 C6 26, 15 29, 22 26"
        fill="none"
        stroke="url(#cGrad)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* White checkmark */}
      <polyline
        points="9,17 13,22 22,12"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Wordmark CV */}
      <text
        x="44"
        y="24"
        fontFamily="'Geist', system-ui, -apple-system, sans-serif"
        fontSize="18"
        fontWeight="800"
        letterSpacing="-0.03em"
        fill={wordCV}
      >
        CV
      </text>

      {/* Wordmark Match */}
      <text
        x="76"
        y="24"
        fontFamily="'Geist', system-ui, -apple-system, sans-serif"
        fontSize="18"
        fontWeight="300"
        letterSpacing="-0.01em"
        fill={wordMatch}
      >
        Match
      </text>
    </svg>
  );
}
