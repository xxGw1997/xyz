import type { ReactNode } from "react";
import { AuthInlineActions } from "@/components/auth-actions";
import { Logo } from "@/components/logo";
import ThemeSwitcher from "@/components/theme-switer";
import { useCommonDisplayStatus } from "@/hooks/use-common-status";

type DefaultLayoutProps = {
  children: ReactNode;
};

export function DefaultLayout({ children }: DefaultLayoutProps): ReactNode {
  const themeSwitcherShow = useCommonDisplayStatus(
    (state) => state.themeSwitcherShow,
  );
  const authInlineActionsShow = useCommonDisplayStatus(
    (state) => state.authInlineActionsShow,
  );

  return (
    <>
      {children}
      <div className="fixed top-5 left-5 z-50">
        <Logo />
      </div>
      <div className="fixed top-5 right-5 z-50 flex items-center gap-x-3">
        {themeSwitcherShow && <ThemeSwitcher />}
        {authInlineActionsShow && <AuthInlineActions />}
      </div>
    </>
  );
}
