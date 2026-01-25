import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Video, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/hello/")({
  component: MeetingPage,
});

export default function MeetingPage() {
  const [roomCode, setRoomCode] = useState("");
  const navigator = useNavigate();

  const handleCreateRoom = () => {
    // Generate a random room code
    const newRoomCode = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
    console.log("[v0] Creating new room with code:", newRoomCode);
    // In a real app, you would navigate to the new room
    alert(`New meeting room created! Room code: ${newRoomCode}`);
  };

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      navigator({
        to: `/hello/${roomCode.trim()}`,
      });
    } else {
      alert("Please enter a room code");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">
              zz Room
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 text-balance">
              Video meetings for you and i
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
              Connect, collaborate, and create together with secure video
              conferencing
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Create New Meeting Card */}
            <Card className="border-2 border-border hover:border-foreground/20 transition-colors">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                    <Plus className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground mb-2">
                      Create Meeting
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Start a new meeting instantly and invite others to join
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="w-full bg-foreground text-background hover:bg-foreground/90"
                    onClick={handleCreateRoom}
                  >
                    New Meeting
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Join Meeting Card */}
            <Card className="border-2 border-border hover:border-foreground/20 transition-colors">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Video className="w-8 h-8 text-foreground" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground mb-2">
                      Join Meeting
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Enter a room code to join an existing meeting
                    </p>
                  </div>
                  <div className="w-full space-y-3">
                    <Input
                      type="text"
                      placeholder="Enter room code"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleJoinRoom();
                        }
                      }}
                      className="w-full text-center text-lg tracking-wider font-mono h-12"
                      maxLength={12}
                    />
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full border-2 bg-transparent"
                      onClick={handleJoinRoom}
                    >
                      Join Room
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { label: "HD Video", icon: "📹" },
              { label: "Screen Share", icon: "🖥️" },
              { label: "Secure & Private", icon: "🔒" },
              { label: "No Download", icon: "⚡" },
            ].map((feature, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl mb-2">{feature.icon}</div>
                <p className="text-sm text-muted-foreground">{feature.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 zz Room. Secure video conferencing for teams.</p>
        </div>
      </footer>
    </div>
  );
}
