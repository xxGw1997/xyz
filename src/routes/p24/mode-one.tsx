import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PlayingCard } from "./playing-card";
import {
  type Card,
  type SolveResult,
  dealCards,
  trySolve,
  getCardDisplayValue,
  TARGET,
} from "./solver";

type GameStatus = "idle" | "dealt" | "revealed";

function ModeOne() {
  const [cards, setCards] = useState<Card[]>([]);
  const [status, setStatus] = useState<GameStatus>("idle");
  const [result, setResult] = useState<SolveResult | null>(null);
  const [noSolution, setNoSolution] = useState(false);

  function handleDeal() {
    const dealt = dealCards(4);
    setCards(dealt);
    setStatus("dealt");
    setResult(null);
    setNoSolution(false);
  }

  function handleReveal() {
    const solution = trySolve(cards.map((c) => c.value));
    if (solution) {
      setResult(solution);
      setNoSolution(false);
    } else {
      setResult(null);
      setNoSolution(true);
    }
    setStatus("revealed");
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Cards display */}
      <div className="flex flex-wrap justify-center gap-4">
        {status === "idle" ? (
          Array.from({ length: 4 }).map((_, i) => (
            <PlayingCard
              key={i}
              card={{ suit: "hearts", value: 1 }}
              faceDown
            />
          ))
        ) : (
          <>
            {cards.map((card, i) => (
              <PlayingCard
                key={`${card.suit}-${card.value}-${i}`}
                card={card}
                className="animate-in fade-in zoom-in-95 duration-300"
                style={{
                  animationDelay: `${i * 100}ms`,
                  animationFillMode: "backwards",
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Card values summary */}
      {status !== "idle" && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-sm">牌值：</span>
          {cards.map((card, i) => (
            <Badge key={i} variant="secondary" className="text-base px-2.5">
              {getCardDisplayValue(card.value)}
            </Badge>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button size="lg" onClick={handleDeal}>
          {status === "idle" ? "发牌" : "重新发牌"}
        </Button>
        {status === "dealt" && (
          <Button size="lg" variant="secondary" onClick={handleReveal}>
            查看答案
          </Button>
        )}
      </div>

      {/* Result */}
      {status === "revealed" && (
        <UICard className="w-full max-w-md">
          <CardContent>
            {result ? (
              <div className="flex flex-col items-center gap-3">
                <Badge className="text-sm px-3 py-1">可凑出 {TARGET} 点</Badge>
                <div className="text-center font-mono text-lg leading-relaxed">
                  {result.steps.map((step, i) => (
                    <div
                      key={i}
                      className={cn(
                        "text-muted-foreground",
                        i === result.steps.length - 1 &&
                          "text-foreground font-bold text-xl"
                      )}
                    >
                      {i === 0
                        ? `${step.a} ${step.op} ${step.b} = ${step.result}`
                        : `${step.a} ${step.op} ${step.b} = ${step.result}`}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.expression}
                </p>
              </div>
            ) : noSolution ? (
              <div className="flex flex-col items-center gap-2">
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  无解
                </Badge>
                <p className="text-muted-foreground text-center">
                  这四张牌无法凑出 {TARGET} 点，点击{" "}
                  <span className="font-semibold text-foreground">重新发牌</span>{" "}
                  试试下一组吧！
                </p>
              </div>
            ) : null}
          </CardContent>
        </UICard>
      )}
    </div>
  );
}

export { ModeOne };
