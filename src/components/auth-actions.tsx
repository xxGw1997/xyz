import { LogInIcon, LogOut } from "lucide-react";

import { authClient } from "@/lib/auth-client";

import { useAuthContext } from "./providers/auth-provider";
import { Skeleton } from "./ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { UserAvatar } from "./user-avatar";
import { LoginForm } from "./login-form";

export function AuthInlineActions() {
  const userInfo = useAuthContext();

  const { data, isPending } = userInfo.session;

  if (isPending) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  } else if (data?.user) {
    return <AccountDialog user={data.user} />;
  } else {
    return <LoginDialog />;
  }
}

export function LoginDialog({
  defaultOpen = false,
}: {
  defaultOpen?: boolean;
}) {
  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <LogInIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome Cloudflare next template</DialogTitle>
          <DialogDescription>
            Sign in to keep reading and managing content
          </DialogDescription>
        </DialogHeader>
        <LoginForm />
      </DialogContent>
    </Dialog>
  );
}

function AccountDialog({
  user,
}: {
  user: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null | undefined;
  };
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <UserAvatar name={user.name} avatar={user.image} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome, {user.name}</DialogTitle>
          <DialogDescription>Email: {user.email}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="link" onClick={() => authClient.signOut()}>
            <LogOut />
            Log out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
