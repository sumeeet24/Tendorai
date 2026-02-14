'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  BarChart3,
  FileText,
  AlertTriangle,
  CheckCircle,
  Search,
  Upload,
  Zap,
  TrendingUp,
  Clock,
  ArrowRight,
  Bot,
  Activity,
  ShieldCheck,
  Globe
} from 'lucide-react'
import { CompanyProfile, TenderProfile } from '@/types'
import clsx from 'clsx'

interface DashboardStats {
  totalTenders: number
  eligibleCount: number
  highRiskCount: number
  processingCount: number
}

interface Props {
  profile: CompanyProfile
  tenders: TenderProfile[]
  stats: DashboardStats
  userId: string
}

export default function DashboardClient({ profile, tenders, stats, userId }: Props) {
  const [aiQuery, setAiQuery] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  }

  const handleAiQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiQuery.trim()) return
    // In a real app, this would route to the chat page with context
    // For now, we'll just simulate an action or redirect
    window.location.href = `/tenders?q=${encodeURIComponent(aiQuery)}`
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-7xl mx-auto space-y-8 pb-12"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Command Center
            </h1>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
              <Bot className="mr-1 h-3 w-3" />
              AI Agent Active
            </span>
          </div>
          <p className="text-lg text-gray-600">
            Welcome back, <span className="font-semibold text-gray-900">{profile.company_name}</span>.
            <span className="hidden sm:inline"> System is monitoring your tender pipeline.</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right hidden md:block">
              <div className="text-sm font-medium text-gray-900">
                {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div className="text-xs text-gray-500 flex items-center justify-end gap-1">
                <Activity className="h-3 w-3 text-green-500" />
                System Operational
              </div>
           </div>
           <Link
             href="/tenders/new"
             className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition-all hover:scale-105"
           >
             <Upload className="-ml-1 mr-2 h-4 w-4" />
             Upload Tender
           </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Tenders"
          value={stats.totalTenders}
          icon={FileText}
          trend="+2 this week"
          color="blue"
        />
        <StatsCard
          title="Eligible Matches"
          value={stats.eligibleCount}
          icon={CheckCircle}
          trend={`${stats.totalTenders > 0 ? Math.round((stats.eligibleCount / stats.totalTenders) * 100) : 0}% success rate`}
          color="green"
        />
        <StatsCard
          title="Critical Risks"
          value={stats.highRiskCount}
          icon={AlertTriangle}
          trend="Requires attention"
          color="red"
          alert={stats.highRiskCount > 0}
        />
        <StatsCard
          title="Processing"
          value={stats.processingCount}
          icon={Zap}
          trend="AI analyzing..."
          color="amber"
          animate={stats.processingCount > 0}
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Tender Feed */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">

          {/* Market Opportunity Widget (Mock) */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                <Globe className="h-5 w-5" />
                Market Intelligence
              </h2>
              <p className="text-indigo-100 mb-6 max-w-lg">
                Our AI has detected 3 new high-value tenders matching your profile in the last 24 hours.
              </p>
              <div className="flex gap-3">
                <button className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors shadow-sm">
                  View Opportunities
                </button>
                <button className="bg-indigo-500/30 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500/40 transition-colors backdrop-blur-sm">
                  Dismiss
                </button>
              </div>
            </div>
          </div>

          {/* Recent Tenders List */}
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
             <div className="p-5 border-b border-gray-100 flex items-center justify-between">
               <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                 <Activity className="h-5 w-5 text-gray-400" />
                 Recent Activity
               </h3>
               <Link href="/tenders" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
                 View All
               </Link>
             </div>
             <ul className="divide-y divide-gray-100">
               {tenders.length === 0 ? (
                 <li className="p-8 text-center text-gray-500">
                   No recent tenders found. Start by uploading a document.
                 </li>
               ) : (
                 tenders.map((tender) => (
                   <li key={tender.id} className="group hover:bg-gray-50 transition-colors">
                     <Link href={`/tenders/${tender.id}`} className="block p-5">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4 min-w-0">
                           <div className={clsx(
                             "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                             tender.processed ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                           )}>
                             {tender.processed ? <FileText className="h-5 w-5" /> : <Clock className="h-5 w-5 animate-pulse" />}
                           </div>
                           <div className="min-w-0">
                             <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                               {tender.tender_name || tender.tender_id_ref || "Untitled Tender"}
                             </p>
                             <div className="flex items-center gap-2 mt-1">
                               <span className="text-xs text-gray-500">
                                 {new Date(tender.created_at).toLocaleDateString()}
                               </span>
                               {tender.processed && (
                                 <>
                                   <span className="text-gray-300">•</span>
                                   <EligibilityBadge result={tender.metadata?.eligibility_result} />
                                 </>
                               )}
                             </div>
                           </div>
                         </div>
                         <div className="flex items-center gap-4">
                            {/* Risk Indicator */}
                            {tender.metadata?.risks && tender.metadata.risks.length > 0 && (
                              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">{tender.metadata.risks.length} Risks</span>
                              </div>
                            )}
                            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all" />
                         </div>
                       </div>
                     </Link>
                   </li>
                 ))
               )}
             </ul>
          </div>
        </motion.div>

        {/* Right Column: AI Assistant & Tools */}
        <motion.div variants={itemVariants} className="space-y-6">

           {/* AI Assistant Widget */}
           <div className="bg-white rounded-xl shadow-lg ring-1 ring-gray-900/5 p-6 border-t-4 border-indigo-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">AI Assistant</h3>
                  <p className="text-xs text-gray-500">Ask me anything about your tenders</p>
                </div>
              </div>

              <form onSubmit={handleAiQuerySubmit} className="relative">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="e.g., Show high risk clauses..."
                  className="block w-full rounded-lg border-0 py-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
                <button
                  type="submit"
                  disabled={!aiQuery.trim()}
                  className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-indigo-600 disabled:opacity-50 transition-colors"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">SUGGESTED ACTIONS</p>
                <div className="space-y-2">
                  <button onClick={() => setAiQuery("Summarize recent risks")} className="w-full text-left text-xs py-2 px-3 rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors truncate">
                    "Summarize recent risks"
                  </button>
                  <button onClick={() => setAiQuery("Check eligibility for latest tender")} className="w-full text-left text-xs py-2 px-3 rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors truncate">
                    "Check eligibility for latest tender"
                  </button>
                </div>
              </div>
           </div>

           {/* Quick Actions */}
           <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/tenders/new" className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all group text-center">
                  <Upload className="h-6 w-6 text-gray-400 group-hover:text-indigo-600 mb-2" />
                  <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700">Upload Tender</span>
                </Link>
                <Link href="/company" className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all group text-center">
                  <ShieldCheck className="h-6 w-6 text-gray-400 group-hover:text-indigo-600 mb-2" />
                  <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700">Update Profile</span>
                </Link>
                <Link href="/tenders" className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all group text-center">
                  <Search className="h-6 w-6 text-gray-400 group-hover:text-indigo-600 mb-2" />
                  <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700">Search All</span>
                </Link>
                <div className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed text-center">
                  <TrendingUp className="h-6 w-6 text-gray-400 mb-2" />
                  <span className="text-xs font-medium text-gray-500">Analytics (Soon)</span>
                </div>
              </div>
           </div>

        </motion.div>
      </div>
    </motion.div>
  )
}

function StatsCard({ title, value, icon: Icon, trend, color, alert, animate }: any) {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-600 ring-blue-600/20",
    green: "bg-green-50 text-green-600 ring-green-600/20",
    red: "bg-red-50 text-red-600 ring-red-600/20",
    amber: "bg-amber-50 text-amber-600 ring-amber-600/20",
  }

  return (
    <div className={clsx(
      "bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6 hover:shadow-md transition-shadow relative overflow-hidden",
      alert && "ring-2 ring-red-500/50"
    )}>
      {animate && (
        <div className="absolute top-0 right-0 p-2">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className={clsx("p-3 rounded-lg ring-1 ring-inset", colorStyles[color as keyof typeof colorStyles])}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center text-xs">
        <span className={clsx(
          "font-medium",
          alert ? "text-red-600" : "text-gray-500"
        )}>
          {trend}
        </span>
      </div>
    </div>
  )
}

function EligibilityBadge({ result }: { result?: any }) {
  if (!result) return <span className="text-xs text-gray-400">Analysis Pending</span>

  if (result.eligible === true) {
    return (
      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
        Eligible
      </span>
    )
  }
  if (result.eligible === false) {
    return (
      <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
        Not Eligible
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
      Review Needed
    </span>
  )
}
