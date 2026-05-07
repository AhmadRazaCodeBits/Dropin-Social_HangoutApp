"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const passwordStrength = getPasswordStrength(password)

  async function handleSignup(e) {
    e.preventDefault()
    if (!name || !email || !password) return setStatus("Please fill in all required fields")

    setStatus("")
    setLoading(true)
    try {
      const s = await fetch(`/api/auth/signup`, {
        method: "POST",
        body: JSON.stringify({ name, email, phone, password }),
        headers: { "Content-Type": "application/json" },
      })
      const sd = await s.json()
      if (!s.ok) return setStatus(sd.error || "Signup failed")
      setStatus("Account created — redirecting to login...")
      router.push("/login")
    } catch (err) {
      setStatus(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 70% 50% at 70% 30%, rgba(99, 102, 241, 0.08), transparent 60%),
          radial-gradient(ellipse 50% 40% at 30% 70%, rgba(239, 95, 31, 0.06), transparent 50%),
          linear-gradient(160deg, #0f121a 0%, #131824 40%, #0f121a 100%)
        `,
      }}
    >
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-glow-sm">
            <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Join DropIn</h1>
          <p className="mt-2 text-sm text-slate-400">
            Set up your profile and start sharing quick hangout signals with friends.
          </p>
        </div>

        <section className="glass-strong rounded-4xl p-6 sm:p-8">
          <form className="space-y-4" onSubmit={handleSignup}>
            <div>
              <label htmlFor="signup-name" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Full name</label>
              <input id="signup-name" value={name} onChange={(e) => setName(e.target.value)} className="input-glow w-full" placeholder="Your name" required autoComplete="name" />
            </div>

            <div>
              <label htmlFor="signup-email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Email</label>
              <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-glow w-full" placeholder="you@example.com" required autoComplete="email" />
            </div>

            <div>
              <label htmlFor="signup-phone" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Phone <span className="text-slate-600">(optional)</span></label>
              <input id="signup-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-glow w-full" placeholder="+1 (555) 123-4567" autoComplete="tel" />
            </div>

            <div>
              <label htmlFor="signup-password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Password</label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-glow w-full !pr-12"
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </>
                    )}
                  </svg>
                </button>
              </div>

              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="mt-2 animate-fade-in">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          level <= passwordStrength.level
                            ? passwordStrength.color
                            : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`mt-1 text-xs ${passwordStrength.textColor}`}>{passwordStrength.label}</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-white w-full !py-3.5"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </span>
              ) : "Create account"}
            </button>
          </form>

          {status && (
            <p className={`mt-4 text-center text-sm animate-fade-in ${status.includes("redirect") ? "text-emerald-400" : "text-red-400"}`}>
              {status}
            </p>
          )}
        </section>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-white underline underline-offset-4 transition-colors hover:text-ember-300">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}

function getPasswordStrength(password) {
  if (!password) return { level: 0, label: "", color: "", textColor: "" }

  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password)) score++

  const configs = {
    1: { label: "Weak", color: "bg-red-500", textColor: "text-red-400" },
    2: { label: "Fair", color: "bg-amber-500", textColor: "text-amber-400" },
    3: { label: "Good", color: "bg-emerald-500", textColor: "text-emerald-400" },
    4: { label: "Strong", color: "bg-blue-500", textColor: "text-blue-400" },
  }

  return { level: score, ...configs[score] || configs[1] }
}