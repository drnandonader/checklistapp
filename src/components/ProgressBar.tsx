interface ProgressBarProps {
  value: number
  className?: string
  showLabel?: boolean
}

export function ProgressBar({ value, className = '', showLabel = true }: ProgressBarProps) {
  const color = value >= 80 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-400'
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-8 text-right">{value}%</span>
      )}
    </div>
  )
}
