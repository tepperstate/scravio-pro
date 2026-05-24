'use client'

export default function StatsBar() {
  const stats = [
    { value: '2.5M+', label: 'Emails Extracted', icon: '📧' },
    { value: '96%', label: 'Verification Rate', icon: '✓' },
    { value: '6', label: 'Platforms', icon: '🌐' },
    { value: '<2%', label: 'Bounce Rate', icon: '📊' },
  ]

  return (
    <section className="py-16 px-4 bg-gradient-to-r from-slate-900 to-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl mb-2">{stat.icon}</div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-slate-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}