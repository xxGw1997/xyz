import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AuthInlineActions } from "@/components/auth-actions";
import ThemeSwitcher from "@/components/theme-switer";

const RootLayout = () => (
  <>
    <Outlet />
    <div className="fixed top-5 right-5 flex gap-x-3 items-center">
      <ThemeSwitcher />
      <AuthInlineActions />
    </div>
  </>
);

export const Route = createRootRoute({ component: RootLayout });
