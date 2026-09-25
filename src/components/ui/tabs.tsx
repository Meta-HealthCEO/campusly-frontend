"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { FOCUS_RING, MOTION } from "./focus"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-full flex-wrap items-end gap-1 border-b border-border text-muted-foreground group-data-vertical/tabs:w-fit group-data-vertical/tabs:flex-col group-data-vertical/tabs:border-b-0",
  {
    variants: {
      // Both names give the underline list (spec §4); `default` stays so existing call sites keep working (ruling R12).
      variant: {
        default: "",
        line: "",
      },
    },
    defaultVariants: {
      variant: "line",
    },
  }
)

function TabsList({
  className,
  variant = "line",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex min-h-11 items-center justify-center gap-1.5 px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground hover:text-foreground data-active:text-foreground md:min-h-9",
        FOCUS_RING,
        MOTION,
        "group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-transparent data-active:after:bg-primary",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
