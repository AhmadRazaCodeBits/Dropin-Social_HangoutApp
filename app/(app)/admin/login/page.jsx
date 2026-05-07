"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()

      if (res.ok) {
        router.push("/admin")
      } else {
        setError(data.error || "Login failed")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-scale-in">
        {/* Logo/Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 shadow-2xl mb-6">
            <span className="text-4xl">🔐</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Admin Access</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Administrator authentication required</p>
        </div>

        <div className="glass-strong rounded-[2.5rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle background effect */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dropin.com"
                className="input-glow w-full !py-4 !px-5 !rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Secure Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-glow w-full !py-4 !px-5 !rounded-2xl"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary !py-4 !rounded-2xl font-black uppercase tracking-widest text-xs shadow-glow-indigo disabled:opacity-50 mt-4"
            >
              {loading ? "Authenticating..." : "Establish Connection"}
            </button>
          </form>
        </div>

        <p className="text-center mt-10 text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">
          Secure Terminal &copy; DropIn Systems
        </p>
      </div>
    </div>
  )
}
