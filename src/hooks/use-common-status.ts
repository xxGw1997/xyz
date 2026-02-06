import { create } from "zustand";

type State = {
  themeSwitcherShow: boolean;
  authInlineActionsShow: boolean;
};

type Action = {
  setThemeSwitcherShow: (show: State["themeSwitcherShow"]) => void;
  setAuthInlineActionsShow: (lastName: State["authInlineActionsShow"]) => void;
};

export const useCommonDisplayStatus = create<State & Action>((set) => ({
  themeSwitcherShow: true,
  authInlineActionsShow: true,
  setThemeSwitcherShow: (show) => set(() => ({ themeSwitcherShow: show })),
  setAuthInlineActionsShow: (show) =>
    set(() => ({ authInlineActionsShow: show })),
}));
