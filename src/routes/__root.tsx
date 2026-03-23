import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AuthInlineActions } from "@/components/auth-actions";
import ThemeSwitcher from "@/components/theme-switer";
import { Logo } from "@/components/logo";
import { useCommonDisplayStatus } from "@/hooks/use-common-status";

const RootLayout = () => {
  const themeSwitcherShow = useCommonDisplayStatus(
    (state) => state.themeSwitcherShow
  );
  const authInlineActionsShow = useCommonDisplayStatus(
    (state) => state.authInlineActionsShow
  );

  return (
    <>
      <Outlet />
      <div className="fixed top-5 left-5 z-50">
        <Logo />
      </div>
      <div className="fixed top-5 right-5 flex gap-x-3 items-center">
        {themeSwitcherShow && <ThemeSwitcher />}
        {authInlineActionsShow && <AuthInlineActions />}
      </div>
    </>
  );
};

export const Route = createRootRoute({ component: RootLayout });
