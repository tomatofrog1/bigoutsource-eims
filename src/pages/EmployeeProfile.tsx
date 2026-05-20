import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, Briefcase, ShieldCheck, 
  FileText, Clock, Edit, ExternalLink, User, Laptop, Info, Key, 
  ShieldAlert, Eye, EyeOff, Globe
} from 'lucide-react';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { MOCK_EMPLOYEES } from '@/src/types';
import { useAuth } from '@/src/contexts/AuthContext';
import { cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';

export default function EmployeeProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const employee = MOCK_EMPLOYEES.find(e => e.id === id) || MOCK_EMPLOYEES[0];
  
  const [showSensitive, setShowSensitive] = useState(false);

  const handleReveal = () => {
    if (user?.role === 'viewer') {
      toast.error('Unauthorized to view sensitive info');
      return;
    }
    setShowSensitive(!showSensitive);
    if (!showSensitive) {
      toast.success('Activity logged: Sensitive data revealed');
    }
  };

  return (
    <PageLayout title={`Profile: ${employee.fullName}`}>
      <div className="flex flex-col gap-8 pb-12">
        <Link to="/directory" className="flex items-center gap-2 text-sm font-bold text-[#6B7280] hover:text-[#111827] transition-colors w-fit uppercase tracking-tighter">
          <ArrowLeft className="w-4 h-4" />
          Employee Directory
        </Link>

        {/* Hero Banner */}
        <div className="relative bg-white rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-sm">
          <div className="h-32 bg-gradient-to-br from-[#111827] via-[#1F2937] to-[#111827]"></div>
          <div className="px-8 pb-8 flex flex-col md:flex-row items-end gap-6 -mt-12">
            <div className="relative">
              <div className="w-32 h-32 rounded-3xl border-8 border-white bg-white shadow-xl overflow-hidden">
                {employee.avatar ? (
                   <img src={employee.avatar} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full bg-[#F3F4F6] flex items-center justify-center text-3xl font-black text-[#9CA3AF]">
                    {employee.fullName.charAt(0)}
                  </div>
                )}
              </div>
              <div className={cn(
                "absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-white",
                employee.status === 'active' ? "bg-green-500" : "bg-gray-400"
              )}></div>
            </div>
            
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-[#111827] tracking-tight">{employee.fullName}</h2>
                  <p className="text-[#6B7280] font-bold mt-1 uppercase text-xs tracking-widest">{employee.employeeId} • {employee.site}</p>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-[#111827] text-white rounded-xl text-sm font-bold hover:bg-[#374151] transition-all shadow-lg shadow-[#11182720]">
                    <Edit className="w-4 h-4" />
                    Update Record
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Info Columns */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Section: Work & Account Information */}
            <section className="bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-[#F3F4F6] rounded-xl text-[#111827]">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-[#111827]">Work & Account Info</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {[
                  { label: 'Account/Project', value: employee.accountAssignment, icon: Briefcase },
                  { label: 'BigOutsource Email', value: employee.boEmail, icon: Mail },
                  { label: 'LMS Account', value: employee.lmsAccount || 'Not Assigned', icon: User },
                  { label: 'Status', value: employee.status.toUpperCase(), icon: Info },
                ].map((item, i) => (
                  <div key={i} className="group">
                    <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1.5">{item.label}</p>
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#111827] transition-colors" />
                      <span className="text-sm font-bold text-[#111827]">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section: Device Information */}
            <section className="bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-sm">
               <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-[#F3F4F6] rounded-xl text-[#111827]">
                  <Laptop className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-[#111827]">Device Assets</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {[
                  { label: 'PC Name', value: employee.pcName, icon: Laptop },
                  { label: 'BIOS Date', value: employee.biosDate, icon: Calendar },
                  { label: 'Remote Access ID', value: employee.rustDeskId, icon: Globe },
                  { label: 'Remote Login ID', value: employee.remoteId, icon: ShieldCheck },
                ].map((item, i) => (
                  <div key={i}>
                    <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1.5">{item.label}</p>
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-[#D1D5DB]" />
                      <span className="text-sm font-bold text-[#111827] font-mono tracking-tight">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 p-5 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <Key className="w-5 h-5 text-[#6B7280]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Windows License Key</p>
                    <p className="text-sm font-mono font-black text-[#111827] bg-[#F3F4F6] px-2 py-0.5 rounded">
                      {showSensitive ? employee.windowsKey : '•••••-•••••-•••••-•••••-•••••'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleReveal}
                  className="flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] bg-white rounded-xl text-xs font-bold text-[#4B5563] hover:text-[#111827] transition-all"
                >
                  {showSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showSensitive ? 'Hide' : 'Reveal Key'}
                </button>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-[#F3F4F6] rounded-xl text-[#111827]">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-[#111827]">Audit Log</h3>
              </div>

              <div className="space-y-4">
                {[
                  {
                    user: 'Miguel Santos',
                    action: 'Updated phone number',
                    field: 'Phone Number',
                    from: '+1 555-0100',
                    to: employee.phone,
                    time: 'Today, 10:42 AM',
                  },
                  {
                    user: 'Admin User',
                    action: 'Changed device assignment',
                    field: 'PC Name',
                    from: 'BO-DSK-00',
                    to: employee.pcName,
                    time: 'Yesterday, 4:18 PM',
                  },
                ].map((log, i) => (
                  <div key={i} className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#111827]">{log.action}</p>
                        <p className="text-xs font-bold text-[#6B7280] mt-1">by {log.user}</p>
                      </div>
                      <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider">{log.time}</p>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold">
                      <div>
                        <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1">Field</p>
                        <p className="text-[#111827]">{log.field}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1">Previous</p>
                        <p className="text-[#9CA3AF] line-through">{log.from}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1">New Value</p>
                        <p className="text-[#111827]">{log.to}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Security & Contact */}
          <div className="lg:col-span-4 space-y-8">
            <section className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
              <h3 className="text-sm font-black text-[#111827] mb-6 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Security Compliance
              </h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-[#E5E7EB] flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">ESET Status</p>
                    <p className="text-sm font-black text-[#111827]">{employee.esetStatus}</p>
                  </div>
                  <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", employee.esetStatus === 'Installed' ? 'bg-green-500' : 'bg-red-500')} />
                </div>
                <div className="p-4 rounded-xl border border-[#E5E7EB] flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">ActivityWatch</p>
                    <p className="text-sm font-black text-[#111827]">{employee.activityWatchStatus}</p>
                  </div>
                  <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", employee.activityWatchStatus === 'Installed' ? 'bg-green-500' : 'bg-red-500')} />
                </div>
              </div>
            </section>

             <section className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
              <h3 className="text-sm font-black text-[#111827] mb-6 uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4" /> Contact & Location
              </h3>
              <div className="space-y-6">
                 <div>
                    <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1">Phone Number</p>
                    <p className="text-sm font-bold text-[#111827]">{employee.phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1">Address</p>
                    <p className="text-sm font-bold text-[#111827] leading-relaxed">{employee.address}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1">Site Office</p>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F3F4F6] rounded-lg w-fit">
                      <MapPin className="w-3.5 h-3.5 text-[#111827]" />
                      <span className="text-xs font-bold text-[#111827]">{employee.site}</span>
                    </div>
                  </div>
              </div>
            </section>

             <section className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
              <h3 className="text-sm font-black text-[#111827] mb-4 uppercase tracking-wider flex items-center gap-2 whitespace-nowrap overflow-hidden">
                <FileText className="w-4 h-4 shrink-0" /> Documents
              </h3>
              <div className="space-y-2">
                {['Contract.pdf', 'ID_Proof.jpg'].map((doc) => (
                  <button key={doc} className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F9FAFB] transition-colors group">
                    <span className="text-xs font-bold text-[#4B5563] group-hover:text-[#111827]">{doc}</span>
                    <ExternalLink className="w-3 h-3 text-[#D1D5DB]" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
