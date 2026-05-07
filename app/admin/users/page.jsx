"use client"

import { useEffect, useState } from "react"

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/users?search=${search}&filter=${filter}&page=${page}`)
        const json = await res.json()
        if (res.ok) {
          setUsers(json.users)
          setTotalPages(json.pages)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    const timer = setTimeout(load, 500)
    return () => clearTimeout(timer)
  }, [search, filter, page])

  const handleAction = async (userId, action) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      })
      if (res.ok) {
        const updated = await res.json()
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, ...updated.user } : u))
      }
    } catch (err) { console.error(err) }
  }

  return (
    <div className="animate-fade-in font-mono">
      <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
        <h2 className="text-[14px] font-black text-[#171717] tracking-[0.1em]">USER_DATABASE</h2>
        <div className="flex gap-4 items-center">
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-[11px] p-2 bg-gray-50 border border-[#e5e5e5] rounded outline-none focus:border-[#534AB7] w-[240px]" 
            placeholder="SEARCH_BY_ID_OR_NAME..." 
          />
          <select 
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            className="text-[11px] p-2 bg-white border border-[#e5e5e5] rounded outline-none cursor-pointer"
          >
            <option value="all">ALL_RECORDS</option>
            <option value="verified">VERIFIED_ONLY</option>
            <option value="suspended">SUSPENDED</option>
            <option value="low_rating">RATING_FLOOR_ALT</option>
          </select>
        </div>
      </div>

      <div className="border border-[#e5e5e5] rounded-[4px] bg-white overflow-hidden shadow-sm">
        <div className="tbl-row grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1.2fr] font-black !bg-[#fafafa] !border-b-[#e5e5e5] uppercase !text-[10px] tracking-wider px-4">
          <span className="tbl-hd">identity</span>
          <span className="tbl-hd">email_addr</span>
          <span className="tbl-hd">trust_score</span>
          <span className="tbl-hd">ops_count</span>
          <span className="tbl-hd">state</span>
          <span className="tbl-hd text-right">commands</span>
        </div>
        
        {loading ? (
          <div className="p-20 text-center text-[11px] text-[#999] animate-pulse uppercase tracking-[0.2em]">QUERYING_USER_REGISTRY...</div>
        ) : users.map(user => (
          <UserRow key={user._id} user={user} onAction={handleAction} />
        ))}

        {!loading && users.length === 0 && (
          <div className="p-20 text-center text-[11px] text-[#999] italic uppercase tracking-widest">NO_RECORDS_MATCH_QUERY</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex gap-2 justify-center">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button 
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 text-[10px] font-black rounded border transition-all ${page === i + 1 ? 'bg-[#534AB7] text-white border-[#534AB7] shadow-sm' : 'bg-white text-[#999] border-[#e5e5e5] hover:border-[#534AB7]'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function UserRow({ user, onAction }) {
  const status = user.publicSuspended ? 'suspended' : user.isIdVerified ? 'verified' : user.flagCount > 0 ? 'flagged' : 'active'
  const sc = { active: 'bdg-g', verified: 'bdg-p', flagged: 'bdg-a', suspended: 'bdg-r' }[status] || 'bdg-gray'
  const rating = user.communityRating || 5.0
  const rcolor = rating < 3 ? '#E24B4A' : rating >= 4.5 ? '#1D9E75' : '#171717'

  return (
    <div className="tbl-row grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1.2fr] px-4 hover:bg-gray-50/50 transition-colors">
      <span className="font-black text-[12px] truncate pr-4 text-[#171717]">{user.displayName}</span>
      <span className="text-[#777] text-[11px] truncate pr-4">{user.email}</span>
      <span style={{ color: rcolor }} className="font-black text-[12px]">{rating.toFixed(1)}</span>
      <span className="text-[#777] text-[11px] font-bold">{user.totalPublicHangouts || 0}</span>
      <span><span className={`badge ${sc} !text-[9px] font-black uppercase tracking-tighter px-2`}>{status}</span></span>
      <span className="flex gap-2 justify-end">
        {status === 'suspended' ? (
          <button onClick={() => onAction(user._id, 'restore')} className="text-[9px] font-black px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded hover:bg-emerald-600 hover:text-white transition-all uppercase">restore</button>
        ) : (
          <>
            <button onClick={() => onAction(user._id, 'suspend')} className="text-[9px] font-black px-2 py-1 bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-600 hover:text-white transition-all uppercase">suspend</button>
            <button onClick={() => onAction(user._id, 'warn')} className="text-[9px] font-black px-2 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded hover:bg-amber-600 hover:text-white transition-all uppercase">warn</button>
          </>
        )}
      </span>
    </div>
  )
}
