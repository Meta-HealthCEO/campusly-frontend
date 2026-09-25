"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"

import { cn } from "@/lib/utils"
import { FOCUS_RING, MOTION } from "./focus"
import { CheckIcon } from "lucide-react"

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-input bg-card data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 group-has-disabled/field:opacity-50 aria-invalid:border-destructive after:absolute after:-inset-3 md:after:inset-0",
        FOCUS_RING,
        MOTION,
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
