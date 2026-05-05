"use client"

import { Map } from "lucide-react"

export default function SidebarHeader() {
  return (
    <div className="flex items-center gap-3 px-5 py-5 border-b border-border/40">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15">
        <Map className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h1 className="text-base font-semibold tracking-tight text-foreground">
          RO-MAP Explorer
        </h1>
        <p className="text-[11px] text-muted-foreground tracking-wide uppercase">
          GIS Dashboard
        </p>
      </div>
    </div>
  )
}
