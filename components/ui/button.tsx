import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* Apple Hit Targets: controls at least 44×44pt for touch */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 min-h-[44px]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 min-w-[44px]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 min-w-[44px]",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground min-w-[44px]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 min-w-[44px]",
        ghost: "hover:bg-accent hover:text-accent-foreground min-w-[44px]",
        link: "text-primary underline-offset-4 hover:underline min-w-0",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-11 rounded-md px-4 text-sm",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-11 w-11 min-w-[44px] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
