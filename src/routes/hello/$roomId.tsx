import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Phone, Mic, MicOff, Video, VideoOff, MonitorUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/hello/$roomId")({
  params: {
    parse: (param) => ({
      roomId: param.roomId as string,
    }),
    stringify: ({ roomId }) => ({
      roomId,
    }),
  },
  component: MeetingRoom,
});

export default function MeetingRoom() {
  const { roomId } = Route.useParams();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream>(null);
  const remoteStream = useRef<MediaStream>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const config = useRef<{ ws: string; servers: any }>({
    ws: `wss://zzwlove.xyz/api/room/connect?name=zzw`,
    servers: undefined,
  });

  const navigate = useNavigate();
  if (!roomId || roomId !== "zzw") {
    navigate({
      to: "/hello",
    });
  }

  const sendMessage = (
    data: string | ArrayBuffer | Blob | ArrayBufferView | any,
  ) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket not open – cannot send");
    }
  };

  const handleMessages = async (e: MessageEvent<any>) => {
    const msg = JSON.parse(e.data);

    switch (msg.type) {
      case "joined":
        await makeCall();
        break;
      case "candidate":
        await acceptCandidate(msg.candidate);
        break;
      case "offer":
        await answerCall(msg.offer);
        break;
      case "answer":
        await startCall(msg.answer);
        break;
      case "left":
        endCall();
        break;
      default:
        break;
    }
  };

  const endCall = () => {
    peerConnection.current?.close();
    // remoteVideoRef.current?.classList.add("-z-1");
  };

  const connectToPeer = async () => {
    peerConnection.current = new RTCPeerConnection(config.current.servers);
    remoteStream.current = new MediaStream();

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream.current;
      // remoteVideoRef.current.classList.add("z-1");
    }

    if (!localStream.current) await startLocalPlayback();
    if (localStream.current) {
      const stream = localStream.current;
      localStream.current.getTracks().forEach((t) => {
        peerConnection.current?.addTrack(t, stream);
      });
    }

    peerConnection.current.ontrack = (e) => {
      e.streams[0].getTracks().forEach((t) => {
        remoteStream.current?.addTrack(t);
      });
    };

    peerConnection.current.onicecandidate = (e) => {
      if (e.candidate) {
        sendMessage({ type: "candidate", candidate: e.candidate });
      }
    };
  };

  const startLocalPlayback = async () => {
    localStream.current = await navigator.mediaDevices.getUserMedia({
      video: {
        width: {
          min: 1280,
          ideal: 1920,
        },
        height: {
          min: 720,
          ideal: 1080,
        },
      },
      audio: true,
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream.current;
      localVideoRef.current.play().catch(console.error);
    }
  };

  const makeCall = async () => {
    await connectToPeer();
    const offer = await peerConnection.current?.createOffer();
    await peerConnection.current?.setLocalDescription(offer);
    sendMessage({ type: "offer", offer });
  };

  const acceptCandidate = async (c: RTCIceCandidate) => {
    try {
      await peerConnection.current?.addIceCandidate(c);
    } catch (error) {
      console.error("Error adding ice candidate", error);
    }
  };

  const answerCall = async (offer: RTCSessionDescriptionInit) => {
    await connectToPeer();
    await peerConnection.current?.setRemoteDescription(offer);
    const answer = await peerConnection.current?.createAnswer();
    await peerConnection.current?.setLocalDescription(answer);
    sendMessage({ type: "answer", answer });
  };

  const startCall = async (answer: RTCSessionDescriptionInit) => {
    await peerConnection.current?.setRemoteDescription(answer);
  };

  const connectWebsocket = async () => {
    if (location.hostname === "localhost") {
      config.current = {
        ws: "ws://localhost:5173/api/room/connect?name=zzw",
        servers: { iceServers: [{ urls: "stun:stun.cloudflare.com:53" }] },
      };
    } else {
      const beforeConfig = await fetch(
        `/api/room/gen-ice-servers?name=${roomId}`,
      );
      const data = await beforeConfig.json();
      config.current = {
        ws: `wss://zzwlove.xyz/api/room/connect`,
        servers: data,
      };
    }
    // CONNECT WEBSOCKET
    wsRef.current = new WebSocket(config.current.ws);

    wsRef.current.onopen = () => {
      sendMessage({ type: "joined" });
    };

    wsRef.current.onmessage = handleMessages;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    connectWebsocket();

    startLocalPlayback();

    return () => clearInterval(timer);
  }, []);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleHangUp = () => {};

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
  };

  const handleShareScreen = () => {
    // Screen share placeholder
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground">
              Meeting Room
            </h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {roomId}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground font-mono">
              {formatTime(elapsedTime)}
            </div>
          </div>
        </div>
      </header>

      {/* Video Container */}
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col gap-6">
        <div className="flex-1 grid lg:grid-cols-2 gap-4">
          {/* Remote User Video - Main Display */}
          <Card className="relative overflow-hidden bg-muted flex items-center justify-center aspect-video lg:aspect-auto">
            {/* <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Video className="w-10 h-10 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  Waiting for participant...
                </p>
              </div>
            </div> */}
            <video
              ref={remoteVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            />
            <div className="absolute bottom-4 left-4 z-1">
              <Badge className="bg-background/80 text-foreground backdrop-blur-sm">
                Remote User
              </Badge>
            </div>
          </Card>

          {/* Local User Video - Self View */}
          <Card className="relative overflow-hidden bg-muted flex items-center justify-center aspect-video lg:aspect-auto">
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            <div
              className={`absolute inset-0 flex items-center justify-center ${isVideoOff ? "bg-muted" : "bg-muted/0"}`}
            >
              {isVideoOff && (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <VideoOff className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-muted-foreground">Camera is off</p>
                </div>
              )}
            </div>
            <div className="absolute bottom-4 left-4">
              <Badge className="bg-background/80 text-foreground backdrop-blur-sm">
                You
              </Badge>
            </div>
            {isVideoOff && (
              <div className="absolute top-4 right-4">
                <Badge
                  variant="secondary"
                  className="bg-background/80 backdrop-blur-sm"
                >
                  Video Off
                </Badge>
              </div>
            )}
          </Card>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-center gap-3 pb-4">
          {/* Mute/Unmute */}
          <Button
            size="lg"
            variant={isMuted ? "destructive" : "secondary"}
            onClick={toggleMute}
            className="rounded-full w-14 h-14"
          >
            {isMuted ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
            <span className="sr-only">{isMuted ? "Unmute" : "Mute"}</span>
          </Button>

          {/* Video On/Off */}
          <Button
            size="lg"
            variant={isVideoOff ? "destructive" : "secondary"}
            onClick={toggleVideo}
            className="rounded-full w-14 h-14"
          >
            {isVideoOff ? (
              <VideoOff className="w-5 h-5" />
            ) : (
              <Video className="w-5 h-5" />
            )}
            <span className="sr-only">
              {isVideoOff ? "Turn on camera" : "Turn off camera"}
            </span>
          </Button>

          {/* Share Screen */}
          <Button
            size="lg"
            variant="secondary"
            onClick={handleShareScreen}
            className="rounded-full w-14 h-14"
          >
            <MonitorUp className="w-5 h-5" />
            <span className="sr-only">Share screen</span>
          </Button>

          {/* Hang Up */}
          <Button
            size="lg"
            variant="destructive"
            onClick={handleHangUp}
            className="rounded-full w-14 h-14 bg-destructive hover:bg-destructive/90"
          >
            <Phone className="w-5 h-5" />
            <span className="sr-only">Hang up</span>
          </Button>
        </div>
      </main>
    </div>
  );
}
