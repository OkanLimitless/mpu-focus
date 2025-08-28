export function InlineSkeleton({ className = "h-5 w-20" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-muted ${className}`} aria-hidden />
  )
}

export default InlineSkeleton

