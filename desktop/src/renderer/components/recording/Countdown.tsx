interface CountdownProps {
  value: number
}

export default function Countdown({ value }: CountdownProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div
        key={value}
        className="text-8xl font-bold text-white animate-pulse"
      >
        {value}
      </div>
    </div>
  )
}
