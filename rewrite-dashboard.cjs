const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/Dashboard.tsx');
let content = fs.readFileSync(file, 'utf-8');

// 1. Add activeTab to state
content = content.replace(
  `  const [activeModal, setActiveModal] = useState<string | null>(null);`,
  `  const [activeModal, setActiveModal] = useState<string | null>(null);\n  const [activeTab, setActiveTab] = useState<'overview' | 'hr' | 'it' | 'audit'>('overview');`
);

// 2. Replace the return block entirely, up to <Suspense
const beforeReturn = content.split('  return (\n    <PageLayout title="System Overview">')[0];
const afterSuspense = content.split('      <Suspense fallback={null}>')[1];

const newReturn = `  return (
    <PageLayout title="System Overview">
      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB] mb-8 overflow-x-auto hide-scrollbar">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'hr', label: 'HR Analytics', icon: Users },
          { id: 'it', label: 'IT & Security', icon: Shield },
          { id: 'audit', label: 'Audit Logs', icon: Clock }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={\`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap \${
              activeTab === tab.id
                ? 'border-[#6366F1] text-[#6366F1]'
                : 'border-transparent text-[#6B7280] hover:text-[#111827] hover:border-[#D1D5DB]'
            }\`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-8">
              {/* Top Stat Cards */}
              <AnimatePresence mode="wait" initial={false}>
                {employeesLoading || devicesLoading ? (
                  <motion.div key="skeleton-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-9 h-9 bg-gray-200 rounded-xl" />
                          <div className="w-12 h-4 bg-gray-200 rounded" />
                        </div>
                        <div className="w-24 h-3 bg-gray-200 rounded mb-2" />
                        <div className="w-16 h-8 bg-gray-200 rounded" />
                      </div>
                    ))}
                    <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                  </motion.div>
                ) : (
                  <motion.div key="content-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat) => (
                      <button 
                        key={stat.label} 
                        onClick={() => setActiveModal(stat.label)} 
                        className="block group outline-none text-left w-full"
                      >
                        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm group-hover:border-[#6366F1] group-hover:shadow-md transition-all duration-200 cursor-pointer h-full">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-[#F3F4F6] rounded-xl text-[#111827] group-hover:bg-[#EEF2FF] group-hover:text-[#6366F1] transition-colors">
                              <stat.icon className="w-5 h-5" />
                            </div>
                            
                            <div className={\`flex items-center gap-1 text-[0.625rem] font-bold uppercase \${stat.color}\`}>
                              Live
                              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </div>
                          </div>
                          <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider group-hover:text-[#4B5563] transition-colors">{stat.label}</p>
                          <p className="text-3xl font-black text-[#111827] mt-1 group-hover:text-[#6366F1] transition-colors">{stat.value}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="wait" initial={false}>
                  {employeesLoading ? (
                    <motion.div key="skeleton-growth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col lg:col-span-2">
                      <div className="w-48 h-6 bg-slate-200 rounded-full mb-8" />
                      <div className="flex-1 min-h-[300px] border-b border-l border-slate-100 relative">
                        <div className="absolute w-full h-[1px] bg-slate-50 bottom-1/4" />
                        <div className="absolute w-full h-[1px] bg-slate-50 bottom-2/4" />
                        <div className="absolute w-full h-[1px] bg-slate-50 bottom-3/4" />
                      </div>
                      <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                    </motion.div>
                  ) : (
                    <motion.div key="content-growth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} onClick={(e) => { e.stopPropagation(); setActiveModal('Workforce Growth Trend'); }}  className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col lg:col-span-2 cursor-pointer hover:border-[#6366F1] hover:shadow-md transition-all group">
                      <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-[#9CA3AF]" />
                        Workforce Growth Trend
                      </h3>
                      <div className="flex-1 min-h-[300px]">
                        {growthTrend.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={growthTrend} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis dataKey="month" label={{ value: 'Month & Year', position: 'bottom', fill: '#9CA3AF', fontSize: '0.6875rem', fontWeight: 'bold' }} axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#6B7280', fontWeight: 'bold' }} dy={10} />
                              <YAxis label={{ value: 'Employees', angle: -90, position: 'insideLeft', offset: -5, fill: '#9CA3AF', fontSize: '0.6875rem', fontWeight: 'bold' }} axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#6B7280', fontWeight: 'bold' }} />
                              <RechartsTooltip content={<CustomTooltip chartType="growth" />} cursor={{ stroke: isDark ? '#2D3344' : '#E5E7EB', strokeWidth: 2 }} wrapperStyle={{ zIndex: 9999 }} />
                              <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1', strokeWidth: 2, stroke: '#ffffff' }} activeDot={{ r: 6 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No growth data available.</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait" initial={false}>
                  {employeesLoading ? (
                    <motion.div key="skeleton-hires" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col lg:col-span-1">
                      <div className="w-56 h-6 bg-slate-200 rounded-full mb-6" />
                      <div className="flex-1 space-y-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                            <div className="space-y-2 flex-1">
                              <div className="w-32 h-3 bg-slate-200 rounded-full" />
                              <div className="w-24 h-2 bg-slate-100 rounded-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                      <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                    </motion.div>
                  ) : (
                    <motion.div key="content-hires" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} onClick={(e) => { e.stopPropagation(); setActiveModal('Recent Hires Pipeline'); }}  className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col lg:col-span-1 cursor-pointer hover:border-[#6366F1] hover:shadow-md transition-all group">
                      <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-[#9CA3AF]" />
                        Recent Hires Pipeline
                      </h3>
                      <div className="flex-1 space-y-3">
                        {recentHires.length ? (
                          recentHires.map((emp) => (
                            <div key={emp.id} className="flex items-center justify-between p-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#D1D5DB] transition-colors">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center shrink-0 shadow-sm text-xs font-black text-[#111827]">
                                  {(emp.fullName || 'UN').substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-[#111827] truncate">{emp.fullName || 'Unnamed Employee'}</p>
                                  <p className="text-[0.625rem] font-black uppercase tracking-wider text-[#6B7280] truncate mt-0.5">{emp.department || 'Unassigned Dept'}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <p className="text-xs font-bold text-[#111827]">{formatTime(emp.createdAt || emp.created_at)}</p>
                                <p className="text-[0.5625rem] font-black uppercase text-[#10B981] tracking-wider mt-1 bg-green-50 px-2 py-0.5 rounded-full inline-block">Joined</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#9CA3AF]">
                            <Users className="w-8 h-8 mb-3 opacity-20" />
                            <p className="text-sm font-bold">No recent hires in the last 30 days.</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === 'hr' && (
            <motion.div key="hr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence mode="wait" initial={false}>
                {employeesLoading || accountsLoading ? (
                  <motion.div key="skeleton-dept" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col">
                    <div className="w-56 h-6 bg-slate-200 rounded-full mb-8" />
                    <div className="flex-1 min-h-[300px] flex flex-col justify-between py-4 border-l border-slate-100">
                      {[80, 60, 40, 90, 50].map((w, i) => (
                        <div key={i} className="h-8 bg-slate-100 rounded-r-md" style={{ width: \`\${w}%\` }} />
                      ))}
                    </div>
                    <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                  </motion.div>
                ) : (
                  <motion.div key="content-dept" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} onClick={(e) => { e.stopPropagation(); setActiveModal('Department Distribution'); }}  className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col cursor-pointer hover:border-[#6366F1] hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-[#9CA3AF]" />
                        Department Distribution
                      </h3>
                      <div className="flex items-center bg-[#F3F4F6] p-1 rounded-lg">
                        <button
                          onClick={() => setDeptFilterType('internal')}
                          className={\`px-3 py-1 text-xs font-bold rounded-md transition-colors \${deptFilterType === 'internal' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'}\`}
                        >
                          Internal
                        </button>
                        <button
                          onClick={() => setDeptFilterType('external')}
                          className={\`px-3 py-1 text-xs font-bold rounded-md transition-colors \${deptFilterType === 'external' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'}\`}
                        >
                          External
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 min-h-[300px]">
                      {departmentDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={departmentDistribution} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#6B7280', fontWeight: 'bold' }} />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: '0.6875rem', fill: '#111827', fontWeight: 'bold' }} width={90} />
                            <RechartsTooltip content={<CustomTooltip chartType="department" />} cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F9FAFB' }} wrapperStyle={{ zIndex: 9999 }} />
                            <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={24} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No data available.</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                {employeesLoading ? (
                  <motion.div key="skeleton-work" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col">
                    <div className="w-40 h-6 bg-slate-200 rounded-full mb-6" />
                    <div className="flex-1 min-h-[300px] flex items-center justify-center">
                      <div className="w-48 h-48 rounded-full border-[1.5rem] border-slate-100" />
                    </div>
                    <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                  </motion.div>
                ) : (
                  <motion.div key="content-work" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} onClick={(e) => { e.stopPropagation(); setActiveModal('Work Arrangement'); }}  className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col cursor-pointer hover:border-[#6366F1] hover:shadow-md transition-all group">
                    <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-[#9CA3AF]" />
                      Work Arrangement
                    </h3>
                    <div className="flex-1 min-h-[300px] flex items-center justify-center relative">
                      {siteDistribution.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={siteDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="count"
                                stroke="none"
                              >
                                {siteDistribution.map((entry, index) => (
                                  <Cell key={\`cell-\${index}\`} fill={SITE_COLORS[entry.site] || COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip content={<CustomTooltip chartType="site" />} wrapperStyle={{ zIndex: 9999 }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                            <span className="text-3xl font-black text-[#111827]">{totalPersonnel}</span>
                            <span className="text-[0.625rem] font-black uppercase tracking-wider text-[#6B7280]">Total</span>
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No site data available.</div>
                      )}
                    </div>
                    {siteDistribution.length > 0 && (
                      <div className="mt-6 grid grid-cols-2 gap-3 pt-6 border-t border-[#F3F4F6]">
                        {siteDistribution.map((entry, index) => (
                          <div key={entry.site} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: SITE_COLORS[entry.site] || COLORS[index % COLORS.length] }} />
                            <span className="text-xs font-bold text-[#4B5563] truncate">{entry.site}</span>
                            <span className="text-sm font-black text-[#111827] ml-auto">{entry.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                {employeesLoading ? (
                  <motion.div key="skeleton-attrition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col xl:col-span-1">
                    <div className="w-48 h-6 bg-slate-200 rounded-full mb-8" />
                    <div className="flex-1 min-h-[300px] border-b border-l border-slate-100 relative">
                      <div className="absolute w-full h-[1px] bg-slate-50 bottom-1/4" />
                      <div className="absolute w-full h-[1px] bg-slate-50 bottom-2/4" />
                      <div className="absolute w-full h-[1px] bg-slate-50 bottom-3/4" />
                    </div>
                    <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                  </motion.div>
                ) : (
                  <motion.div key="content-attrition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} onClick={(e) => { e.stopPropagation(); setActiveModal('Employee Turnover'); }}  className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col xl:col-span-1 cursor-pointer hover:border-[#6366F1] hover:shadow-md transition-all group">
                    <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-[#9CA3AF]" />
                      Employee Turnover
                    </h3>
                    <div className="flex-1 min-h-[300px]">
                      {attritionTimeline.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={attritionTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: '0.6875rem', fill: '#6B7280', fontWeight: 'bold' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#6B7280', fontWeight: 'bold' }} />
                            <RechartsTooltip content={<CustomTooltip chartType="attrition" />} cursor={{ stroke: isDark ? '#2D3344' : '#E5E7EB', strokeWidth: 2 }} wrapperStyle={{ zIndex: 9999 }} />
                            <Legend wrapperStyle={{ fontSize: '0.75rem', fontWeight: 'bold', paddingTop: '10px' }} />
                            <Line type="monotone" dataKey="hires" name="New Hires" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="separations" name="Separations" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No turnover data available.</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'it' && (
            <motion.div key="it" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence mode="wait" initial={false}>
                {devicesLoading ? (
                  <motion.div key="skeleton-sec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col">
                    <div className="w-48 h-6 bg-slate-200 rounded-full mb-6" />
                    <div className="flex-1 min-h-[300px] flex items-center justify-center">
                      <div className="w-40 h-40 rounded-full border-[2rem] border-slate-100" />
                    </div>
                    <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                  </motion.div>
                ) : (
                  <motion.div key="content-sec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} onClick={(e) => { e.stopPropagation(); setActiveModal('Security Compliance'); }}  className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col cursor-pointer hover:border-[#6366F1] hover:shadow-md transition-all group">
                    <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#9CA3AF]" />
                      Security Compliance
                    </h3>
                    <div className="flex-1 min-h-[300px] flex items-center justify-center relative">
                      {securityCompliance.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={securityCompliance}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={2}
                              dataKey="count"
                              stroke="none"
                            >
                              {securityCompliance.map((entry, index) => (
                                <Cell key={\`cell-\${index}\`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip content={<CustomTooltip chartType="compliance" />} wrapperStyle={{ zIndex: 9999 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No compliance data.</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                {employeesLoading || devicesLoading ? (
                  <motion.div key="skeleton-dept-comp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col xl:col-span-1">
                    <div className="w-56 h-6 bg-slate-200 rounded-full mb-8" />
                    <div className="flex-1 min-h-[300px] flex items-end justify-between gap-4 border-b border-slate-100 pb-2">
                      {[60, 80, 40, 100, 70, 50].map((h, i) => (
                        <div key={i} className="w-full bg-slate-100 rounded-t-md" style={{ height: \`\${h}%\` }} />
                      ))}
                    </div>
                    <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                  </motion.div>
                ) : (
                  <motion.div key="content-dept-comp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} onClick={(e) => { e.stopPropagation(); setActiveModal('Compliance by Dept'); }}  className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col xl:col-span-1 cursor-pointer hover:border-[#6366F1] hover:shadow-md transition-all group">
                    <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-[#9CA3AF]" />
                      Compliance by Dept
                    </h3>
                    <div className="flex-1 min-h-[300px]">
                      {complianceByDepartment.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={complianceByDepartment} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: '0.6875rem', fill: '#6B7280', fontWeight: 'bold' }} dy={10} tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#6B7280', fontWeight: 'bold' }} />
                            <RechartsTooltip content={<CustomTooltip chartType="complianceDept" />} cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F9FAFB' }} wrapperStyle={{ zIndex: 9999 }} />
                            <Legend wrapperStyle={{ fontSize: '0.75rem', fontWeight: 'bold', paddingTop: '10px' }} />
                            <Bar dataKey="Compliant" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} barSize={32} />
                            <Bar dataKey="NonCompliant" name="Non-Compliant" stackId="a" fill="#DC2626" radius={[4, 4, 0, 0]} barSize={32} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No data available.</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                {devicesLoading ? (
                  <motion.div key="skeleton-alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col">
                    <div className="w-40 h-6 bg-slate-200 rounded-full mb-8" />
                    <div className="flex-1 space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="w-full h-16 bg-slate-50 border border-slate-100 rounded-xl" />
                      ))}
                    </div>
                    <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                  </motion.div>
                ) : (
                  <motion.div key="content-alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} onClick={(e) => { e.stopPropagation(); setActiveModal('Security Alerts'); }}  className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col cursor-pointer hover:border-[#6366F1] hover:shadow-md transition-all group">
                    <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-[#9CA3AF]" />
                      Security Alerts
                    </h3>
                    <div className="flex-1 space-y-4">
                      {securityAlerts.map((alert) => (
                        <div key={alert.label} className="flex items-center justify-between p-4 rounded-xl border transition-colors" style={{ borderColor: 'var(--color-border)', backgroundColor: alert.bg }}>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg shadow-sm" style={{ backgroundColor: 'var(--color-surface)', color: alert.color }}>
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[0.625rem] font-black uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{alert.label}</p>
                              <p className="text-lg font-black" style={{ color: alert.color }}>{alert.value} Devices</p>
                            </div>
                          </div>
                          {canViewAssets && (
                            <Link to="/assets" className="text-[0.625rem] font-black uppercase hover:underline px-2 py-1 rounded transition-colors" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>Fix</Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'audit' && (
            <motion.div key="audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 gap-6">
              <AnimatePresence mode="wait" initial={false}>
                {logsLoading ? (
                  <motion.div key="skeleton-logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col">
                    <div className="w-48 h-6 bg-slate-200 rounded-full mb-8" />
                    <div className="flex-1 space-y-6">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-start gap-4">
                          <div className="w-2 h-2 rounded-full bg-slate-200 mt-1.5 shrink-0" />
                          <div className="space-y-2 flex-1">
                            <div className="w-48 h-3 bg-slate-200 rounded-full" />
                            <div className="w-32 h-2 bg-slate-100 rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                  </motion.div>
                ) : (
                  <motion.div key="content-logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} onClick={(e) => { e.stopPropagation(); setActiveModal('Recent Activity Logs'); }}  className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col cursor-pointer hover:border-[#6366F1] hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#9CA3AF]" />
                        Recent Activity Logs
                      </h3>
                      {canViewAuditLogs && (
                        <Link to="/logs" className="text-xs font-black uppercase text-[#2563EB] hover:text-[#1D4ED8] hover:underline">
                          View All
                        </Link>
                      )}
                    </div>
                    <div className="flex-1 space-y-5">
                      {logs.length ? (
                        logs.slice(0, 10).map((log) => (
                          <div key={log.id} className="flex items-start gap-4">
                            <div className="w-2 h-2 rounded-full bg-[#111827] mt-1.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-[#111827]">
                                {log.userEmail || 'System'} <span className="font-medium text-[#6B7280]">{actionLabel(log.action).toLowerCase()}</span>
                              </p>
                              <p className="text-xs text-[#4B5563] mt-1">{log.details?.fullName || log.details?.employeeNumber || log.entityType}</p>
                              <p className="text-[0.625rem] text-[#9CA3AF] uppercase font-bold mt-1">{formatTime(log.createdAt)}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm font-bold text-[#9CA3AF]">No audit activity yet.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Suspense fallback={null}>`;

content = beforeReturn + newReturn + afterSuspense;
fs.writeFileSync(file, content);
