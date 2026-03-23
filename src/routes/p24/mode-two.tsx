import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PlayingCard } from "./playing-card";
import {
  type Card,
  trySolve,
  getSuitSymbol,
  isRedSuit,
  SUITS,
  TARGET,
} from "./solver";

type VerifyResult = "correct" | "wrong" | "invalid";

const VALUES = Array.from({ length: 13 }, (_, i) => i + 1);
const OPERATORS = ["+", "-", "*", "/", "(", ")"] as const;

function cardKey(card: Card): string {
  return `${card.suit}-${card.value}`;
}

function ModeTwo() {
  const [selected, setSelected] = useState<Card[]>([]);
  const [expression, setExpression] = useState("");
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [noSolution, setNoSolution] = useState(false);

  const selectedKeys = useMemo(
    () => new Set(selected.map(cardKey)),
    [selected]
  );

  const isSelecting = selected.length < 4;
  const isVerified = verifyResult !== null;
  const isRevealed = solution !== null || noSolution;

  const handleCardClick = useCallback(
    (card: Card) => {
      if (isVerified || isRevealed) return;

      const key = cardKey(card);
      if (selectedKeys.has(key)) {
        setSelected((prev) => prev.filter((c) => cardKey(c) !== key));
      } else if (selected.length < 4) {
        setSelected((prev) => [...prev, card]);
      }
    },
    [isVerified, isRevealed, selectedKeys, selected.length]
  );

  function handleOperatorInsert(op: string) {
    setExpression((prev) => prev + op);
    setVerifyResult(null);
  }

  function handleExpressionChange(value: string) {
    setExpression(value);
    setVerifyResult(null);
  }

  function handleVerify() {
    if (selected.length !== 4) return;

    const trimmed = expression.trim();
    if (!trimmed) {
      setVerifyResult("invalid");
      return;
    }

    // Check only allowed characters
    if (!/^[\d+\-*/().\s]+$/.test(trimmed)) {
      setVerifyResult("invalid");
      return;
    }

    // Extract numbers from expression and sort
    const numsInExpr = trimmed.match(/\d+/g)?.map(Number) ?? [];
    const selectedValues = selected.map((c) => c.value).sort((a, b) => a - b);
    const exprNums = [...numsInExpr].sort((a, b) => a - b);

    // Check same numbers used exactly once
    if (
      numsInExpr.length !== 4 ||
      selectedValues.length !== 4 ||
      selectedValues.some((v, i) => exprNums[i] !== v)
    ) {
      setVerifyResult("invalid");
      return;
    }

    // Evaluate
    try {
      const result = new Function(`"use strict"; return (${trimmed})`)();
      if (typeof result === "number" && Math.abs(result - TARGET) < 1e-6) {
        setVerifyResult("correct");
      } else {
        setVerifyResult("wrong");
      }
    } catch {
      setVerifyResult("invalid");
    }
  }

  function handleReveal() {
    const result = trySolve(selected.map((c) => c.value));
    if (result) {
      setSolution(result.expression);
      setNoSolution(false);
    } else {
      setSolution(null);
      setNoSolution(true);
    }
  }

  function handleReset() {
    setSelected([]);
    setExpression("");
    setVerifyResult(null);
    setSolution(null);
    setNoSolution(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Card selection area */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            从牌堆中选择 4 张牌
          </h3>
          <Badge variant={isSelecting ? "default" : "secondary"}>
            已选 {selected.length}/4
          </Badge>
        </div>

        {/* Deck grid: 4 suits × 13 values */}
        <div className="flex flex-col gap-1">
          {SUITS.map((suit) => (
            <div key={suit} className="flex gap-1 items-center">
              <span
                className={cn(
                  "w-5 text-center text-xs font-medium shrink-0",
                  isRedSuit(suit)
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
                )}
              >
                {getSuitSymbol(suit)}
              </span>
              <div className="flex gap-1 flex-wrap">
                {VALUES.map((value) => {
                  const card: Card = { suit, value };
                  const key = cardKey(card);
                  const isSelected = selectedKeys.has(key);
                  const disabled = !isSelected && !isSelecting;

                  return (
                    <PlayingCard
                      key={key}
                      card={card}
                      small
                      selected={isSelected}
                      disabled={disabled && !isVerified && !isRevealed}
                      onClick={() => handleCardClick(card)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected cards display */}
      {selected.length > 0 && (
        <UICard>
          <CardContent className="py-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  已选牌
                </span>
                {!isVerified && !isRevealed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs h-7"
                  >
                    重置
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                {selected.map((card) => (
                  <div key={cardKey(card)} className="flex flex-col items-center gap-1">
                    <PlayingCard card={card} />
                    <span className="text-xs text-muted-foreground">
                      = {card.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </UICard>
      )}

      {/* Expression input */}
      {selected.length === 4 && !isRevealed && (
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-muted-foreground">
            输入算式（结果应等于 {TARGET}）
          </label>

          {/* Operator quick insert */}
          <div className="flex gap-1.5 flex-wrap">
            {OPERATORS.map((op) => (
              <Button
                key={op}
                variant="outline"
                size="sm"
                onClick={() => handleOperatorInsert(op)}
                className="w-9 h-9 font-mono text-base"
              >
                {op}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={expression}
              onChange={(e) => handleExpressionChange(e.target.value)}
              placeholder="例：(1+2)*(3+4)"
              className="font-mono"
              disabled={isVerified}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleVerify();
              }}
            />
            <Button onClick={handleVerify} disabled={isVerified}>
              验证
            </Button>
          </div>

          {/* Verify result */}
          {verifyResult && (
            <div className="flex justify-center">
              {verifyResult === "correct" && (
                <Badge className="text-sm px-3 py-1">
                  正确！凑出 {TARGET} 点
                </Badge>
              )}
              {verifyResult === "wrong" && (
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  不等于 {TARGET}，再试试
                </Badge>
              )}
              {verifyResult === "invalid" && (
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  算式无效，请检查格式
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reveal / Reset actions */}
      {selected.length === 4 && (
        <div className="flex gap-2 justify-center">
          {!isRevealed && (
            <Button variant="secondary" onClick={handleReveal}>
              公布答案
            </Button>
          )}
          {(isVerified || isRevealed) && (
            <Button variant="outline" onClick={handleReset}>
              重新开始
            </Button>
          )}
        </div>
      )}

      {/* Solution display */}
      {isRevealed && (
        <UICard>
          <CardContent className="py-4">
            {solution ? (
              <div className="flex flex-col items-center gap-2">
                <Badge className="text-sm px-3 py-1">答案</Badge>
                <p className="font-mono text-lg">{solution}</p>
              </div>
            ) : noSolution ? (
              <div className="flex flex-col items-center gap-2">
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  无解
                </Badge>
                <p className="text-muted-foreground text-center text-sm">
                  这四张牌无法凑出 {TARGET} 点
                </p>
              </div>
            ) : null}
          </CardContent>
        </UICard>
      )}
    </div>
  );
}

export { ModeTwo };
