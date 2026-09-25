"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"
import { FOCUS_RING, MOTION } from "./focus"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-input p-0.5 data-checked:bg-primary disabled:opacity-50 data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-destructive data-[size=sm]:h-4 data-[size=sm]:w-7 after:absolute after:-inset-x-3 after:-inset-y-2",
        FOCUS_RING,
        MOTION,
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 rounded-full bg-card shadow-card transition-transform duration-150 ease-standard data-checked:translate-x-4 group-data-[size=sm]/switch:size-3 group-data-[size=sm]/switch:data-checked:translate-x-3"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
