import * as React from "react"
import { toast } from "react-hot-toast"

export function useToast() {
  return {
    toast: (options: { title?: string; description?: string; variant?: string }) => {
      const message = options.description || options.title || ""
      
      if (options.variant === "destructive") {
        toast.error(message)
      } else {
        toast.success(message)
      }
    }
  }
}