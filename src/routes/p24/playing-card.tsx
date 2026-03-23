import { cn } from "@/lib/utils";
import {
  type Card,
  getCardDisplayValue,
  getSuitSymbol,
  isRedSuit,
} from "./solver";

interface PlayingCardProps {
  card: Card;
  faceDown?: boolean;
  className?: string;
  style?: React.CSSProperties;
  small?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function PlayingCard({
  card,
  faceDown = false,
  className,
  style,
  small = false,
  selected = false,
  disabled = false,
  onClick,
}: PlayingCardProps) {
  const sizeClasses = small
    ? "w-10 h-14 rounded-md text-[10px]"
    : "w-28 h-40 rounded-xl";
  const isInteractive = !!onClick;

  if (faceDown) {
    return (
      <div
        className={cn(
          "relative border-2 border-border",
          "bg-gradient-to-br from-blue-900 to-blue-950",
          "shadow-lg flex items-center justify-center select-none",
          sizeClasses,
          className
        )}
        style={style}
      >
        {!small && (
          <div className="absolute inset-2 rounded-lg border border-blue-700/50" />
        )}
        <div
          className={cn(
            "font-bold text-blue-600/60 select-none",
            small ? "text-xs" : "text-3xl"
          )}
        >
          ?
        </div>
      </div>
    );
  }

  const displayValue = getCardDisplayValue(card.value);
  const suitSymbol = getSuitSymbol(card.suit);
  const red = isRedSuit(card.suit);

  return (
    <div
      className={cn(
        "relative border-2 select-none",
        "shadow-lg",
        sizeClasses,
        "transition-all duration-150",
        red ? "border-red-200 dark:border-red-900" : "border-border",
        selected
          ? "bg-accent ring-2 ring-primary ring-offset-2 ring-offset-background"
          : "bg-card",
        disabled && "opacity-30 cursor-not-allowed",
        isInteractive && !disabled && "cursor-pointer hover:shadow-xl",
        className
      )}
      style={style}
      onClick={disabled ? undefined : onClick}
    >
      {small ? (
        /* Compact layout for selection grid */
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span
            className={cn(
              "font-bold leading-none",
              red
                ? "text-red-600 dark:text-red-400"
                : "text-foreground"
            )}
          >
            {displayValue}
          </span>
          <span
            className={cn(
              "leading-none",
              small ? "text-[10px]" : "text-xs",
              red
                ? "text-red-600 dark:text-red-400"
                : "text-foreground"
            )}
          >
            {suitSymbol}
          </span>
        </div>
      ) : (
        /* Full card layout */
        <>
          {/* Top-left corner */}
          <div
            className={cn(
              "absolute top-1.5 left-2 flex flex-col items-center leading-none",
              red
                ? "text-red-600 dark:text-red-400"
                : "text-foreground"
            )}
          >
            <span className="text-lg font-bold">{displayValue}</span>
            <span className="text-sm">{suitSymbol}</span>
          </div>

          {/* Center suit */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={cn(
                "text-5xl",
                red
                  ? "text-red-600 dark:text-red-400"
                  : "text-foreground"
              )}
            >
              {suitSymbol}
            </span>
          </div>

          {/* Bottom-right corner (rotated) */}
          <div
            className={cn(
              "absolute bottom-1.5 right-2 flex flex-col items-center leading-none rotate-180",
              red
                ? "text-red-600 dark:text-red-400"
                : "text-foreground"
            )}
          >
            <span className="text-lg font-bold">{displayValue}</span>
            <span className="text-sm">{suitSymbol}</span>
          </div>
        </>
      )}
    </div>
  );
}

export { PlayingCard };
