import * as React from "react"

import { cn } from "@/lib/utils"
import { FOCUS_RING, MOTION } from "./focus"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full min-w-0 rounded-control border border-input bg-card px-3 py-2 text-base text-foreground md:text-sm",
        MOTION,
        FOCUS_RING,
        "placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
