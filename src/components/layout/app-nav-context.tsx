"use client"

import { createContext, useContext } from "react"

export const AppNavContext = createContext<{ openMenu?: () => void }>({})

export function useAppNav() {
  return useContext(AppNavContext)
}