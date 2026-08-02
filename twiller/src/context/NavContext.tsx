"use client";

import { createContext, useContext } from "react";

interface NavContextValue {
  openProfile: (userId: string) => void;
  search: (query: string) => void;
  goBack: () => void;
  openPage: (page: string) => void;
}

const NavContext = createContext<NavContextValue>({
  openProfile: () => {},
  search: () => {},
  goBack: () => {},
  openPage: () => {},
});

export const useNav = () => useContext(NavContext);
export const NavProvider = NavContext.Provider;
