"use client";

import { createContext, useContext } from "react";

interface NavContextValue {
  openProfile: (userId: string) => void;
  search: (query: string) => void;
  goBack: () => void;
}

const NavContext = createContext<NavContextValue>({
  openProfile: () => {},
  search: () => {},
  goBack: () => {},
});

export const useNav = () => useContext(NavContext);
export const NavProvider = NavContext.Provider;
