import { Link } from "@tanstack/react-router";

function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-1.5 group ${className ?? ""}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Background rounded square */}
        <rect
          x="2"
          y="2"
          width="24"
          height="24"
          rx="6"
          className="fill-primary transition-colors group-hover:fill-primary/80"
        />
        {/* Stylized "zz" - two overlapping Z paths */}
        <path
          d="M8 10h12l-12 8h12"
          stroke="var(--primary-foreground)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M11 10h6"
          stroke="var(--primary-foreground)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
      <span className="text-lg font-semibold tracking-tight text-foreground">
        <span className="text-primary">zz</span>Labs
      </span>
    </Link>
  );
}

export { Logo };
