import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ModeOne } from "./mode-one";
import { ModeTwo } from "./mode-two";

export const Route = createFileRoute("/p24/")({
  component: RouteComponent,
});

type GameMode = "challenge" | "solution";

function RouteComponent() {
  const [mode, setMode] = useState<GameMode>("challenge");

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            扑克牌 24 点
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            使用加减乘除运算，将四张牌的数字组合成 24。每张牌必须且只能使用一次。
          </p>
        </header>

        {/* Mode tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <Button
            variant={mode === "challenge" ? "default" : "outline"}
            onClick={() => setMode("challenge")}
            className="px-6"
          >
            挑战模式
          </Button>
          <Button
            variant={mode === "solution" ? "default" : "outline"}
            onClick={() => setMode("solution")}
            className="px-6"
          >
            解答模式
          </Button>
        </div>

        {/* Game content */}
        <div className="min-h-[420px]">
          {mode === "challenge" ? <ModeOne /> : <ModeTwo />}
        </div>

        {/* Rules */}
        <footer
          className={cn(
            "mt-12 pt-8 border-t border-border",
            "text-sm text-muted-foreground"
          )}
        >
          <h2 className="font-semibold text-foreground mb-3">游戏规则</h2>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>从一副扑克牌中选出 4 张牌（A=1, J=11, Q=12, K=13）</li>
            <li>使用加（+）、减（-）、乘（×）、除（÷）四种运算</li>
            <li>每张牌必须且只能使用一次</li>
            <li>可以使用括号改变运算顺序</li>
            <li>最终结果等于 24 即为成功</li>
          </ul>
        </footer>
      </div>
    </main>
  );
}
