"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const STEPS = ["avatar", "details", "done"]

export default function CreateProfilePage() {
  const [step, setStep] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState("")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState("")
  const [address, setAddress] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    setStatus("")
    setLoading(true)
    try {
      const res = await fetch(`/api/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl, phone, city, address }),
      })
      const data = await res.json()
      if (!res.ok) return setStatus(data.error || "Save failed")
      setStep(2)
      setTimeout(() => router.push("/profile"), 2000)
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
          radial-gradient(ellipse 60% 40% at 50% 30%, rgba(239, 95, 31, 0.06), transparent 60%),
          linear-gradient(160deg, #0f121a 0%, #131824 40%, #0f121a 100%)
        `,
      }}
    >
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Progress bar */}
        <div className="mb-8 flex gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i <= step ? "bg-ember-400" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        <div className="glass-strong rounded-4xl p-6 sm:p-8">
          {step === 0 && (
            <div className="animate-fade-in-up">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Step 1 of 2</p>
              <h1 className="mt-2 font-display text-2xl font-bold text-white">Your avatar</h1>
              <p className="mt-2 text-sm text-slate-400">Add a profile picture so friends recognize you.</p>

              {/* Avatar preview */}
              <div className="mt-6 flex justify-center">
                <div className="relative">
                  {avatarUrl ? (
                    <div className="h-24 w-24 overflow-hidden rounded-2xl ring-4 ring-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatarUrl} alt="Avatar preview" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-ember-400 to-amber-400 ring-4 ring-white/10 text-3xl">
                      👤
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="avatar-url" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Image URL
                </label>
                <input
                  id="avatar-url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="input-glow w-full"
                />
              </div>

              <button onClick={() => setStep(1)} className="btn-primary mt-6 w-full">
                Continue
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade-in-up">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Step 2 of 2</p>
              <h1 className="mt-2 font-display text-2xl font-bold text-white">Your details</h1>
              <p className="mt-2 text-sm text-slate-400">Add location info. Your address stays completely private.</p>

              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="profile-phone" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Phone <span className="text-slate-600">(optional)</span>
                  </label>
                  <input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" className="input-glow w-full" />
                </div>
                <div>
                  <label htmlFor="profile-city" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">City</label>
                  <input id="profile-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="New York" className="input-glow w-full" />
                </div>
                <div>
                  <label htmlFor="profile-address" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Address <span className="text-slate-600">(private)</span>
                  </label>
                  <input id="profile-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" className="input-glow w-full" />
                  <p className="mt-1.5 text-xs text-slate-600 flex items-center gap-1">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                    Never shared publicly
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button onClick={() => setStep(0)} className="btn-secondary flex-1">Back</button>
                <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
                  {loading ? "Saving..." : "Save profile"}
                </button>
              </div>

              {status && <p className="mt-4 text-center text-sm text-red-400 animate-fade-in">{status}</p>}
            </div>
          )}

          {step === 2 && (
            <div className="animate-bounce-in py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-3xl">
                ✅
              </div>
              <h1 className="font-display text-2xl font-bold text-white">Profile saved!</h1>
              <p className="mt-2 text-sm text-slate-400">Redirecting to your profile...</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
