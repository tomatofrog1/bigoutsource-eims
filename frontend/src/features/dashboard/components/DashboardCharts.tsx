import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

export function GrowthChart({ data, CustomTooltip, isDark }: any) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        <XAxis dataKey="month" label={{ value: 'Month & Year', position: 'bottom', fill: '#9CA3AF', fontSize: '0.6875rem', fontWeight: 'bold' }} axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#6B7280', fontWeight: 'bold' }} dy={10} />
        <YAxis label={{ value: 'Employees', angle: -90, position: 'insideLeft', offset: -5, fill: '#9CA3AF', fontSize: '0.6875rem', fontWeight: 'bold' }} axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#6B7280', fontWeight: 'bold' }} />
        <RechartsTooltip content={<CustomTooltip chartType="growth" />} cursor={{ stroke: isDark ? '#2D3344' : '#E5E7EB', strokeWidth: 2 }} wrapperStyle={{ zIndex: 9999 }} />
        <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1', strokeWidth: 2, stroke: '#ffffff' }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AttritionChart({ data, CustomTooltip, isDark }: any) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: '0.6875rem', fill: '#6B7280', fontWeight: 'bold' }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#6B7280', fontWeight: 'bold' }} />
        <RechartsTooltip content={<CustomTooltip chartType="attrition" />} cursor={{ stroke: isDark ? '#2D3344' : '#E5E7EB', strokeWidth: 2 }} wrapperStyle={{ zIndex: 9999 }} />
        <Legend wrapperStyle={{ fontSize: '0.75rem', fontWeight: 'bold', paddingTop: '10px' }} />
        <Line type="monotone" dataKey="hires" name="New Hires" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="separations" name="Separations" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DepartmentChart({ data, CustomTooltip, COLORS }: any) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
        <XAxis type="number" label={{ value: 'Employees', position: 'bottom', fill: '#9CA3AF', fontSize: '0.6875rem', fontWeight: 'bold' }} axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#6B7280', fontWeight: 'bold' }} dy={10} />
        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#4B5563', fontWeight: 'bold' }} dx={-10} />
        <RechartsTooltip content={<CustomTooltip chartType="department" />} cursor={{ fill: 'rgba(229, 231, 235, 0.4)' }} wrapperStyle={{ zIndex: 9999 }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
          {data.map((entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SiteChart({ data, CustomTooltip, SITE_COLORS }: any) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="count" stroke="none">
          {data.map((entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={SITE_COLORS[entry.site] || '#9CA3AF'} />
          ))}
        </Pie>
        <RechartsTooltip content={<CustomTooltip chartType="site" />} wrapperStyle={{ zIndex: 9999 }} />
        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4B5563' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ComplianceChart({ data, CustomTooltip, isDark }: any) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: '0.6875rem', fill: '#6B7280', fontWeight: 'bold' }} dy={10} tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#6B7280', fontWeight: 'bold' }} />
        <RechartsTooltip content={<CustomTooltip chartType="complianceDept" />} cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F9FAFB' }} wrapperStyle={{ zIndex: 9999 }} />
        <Legend wrapperStyle={{ fontSize: '0.75rem', fontWeight: 'bold', paddingTop: '10px' }} />
        <Bar dataKey="Compliant" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} barSize={32} />
        <Bar dataKey="NonCompliant" name="Non-Compliant" stackId="a" fill="#DC2626" radius={[4, 4, 0, 0]} barSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SecurityOverviewChart({ data, CustomTooltip }: any) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="count" stroke="none">
          {data.map((entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <RechartsTooltip content={<CustomTooltip chartType="compliance" />} wrapperStyle={{ zIndex: 9999 }} />
        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4B5563' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
