import React, { useState } from 'react';
import { Contractor, WorkItem, WorkStatus, Property } from '../types';
import { HardHat, Hammer, CheckCircle, Clock, Download, Briefcase } from 'lucide-react';
import { downloadCSV, formatCurrency } from '../utils';

interface ProjectTrackerProps {
  properties: Property[];
  contractors: Contractor[];
  workItems: WorkItem[];
  onAddContractor: (c: Contractor) => void;
  onAddWorkItem: (w: WorkItem) => void;
}

const ProjectTracker: React.FC<ProjectTrackerProps> = ({ 
  properties, contractors, workItems, onAddContractor, onAddWorkItem 
}) => {
  const [activeTab, setActiveTab] = useState<'contractors' | 'work'>('work');
  const [isConFormOpen, setIsConFormOpen] = useState(false);
  const [isWorkFormOpen, setIsWorkFormOpen] = useState(false);

  // Form States
  const [newContractor, setNewContractor] = useState<Partial<Contractor>>({});
  const [newWork, setNewWork] = useState<Partial<WorkItem>>({ status: WorkStatus.PENDING, isBundle: false });

  const handleExportContractors = () => downloadCSV(contractors, 'sabia_contractors');
  const handleExportWork = () => downloadCSV(workItems, 'sabia_work_log');

  const submitContractor = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newContractor.businessName) return;
    onAddContractor({
      id: Date.now().toString(),
      businessName: newContractor.businessName!,
      contactName: newContractor.contactName || '',
      email: newContractor.email || '',
      phone: newContractor.phone || '',
      specialty: newContractor.specialty || 'General',
    } as Contractor);
    setIsConFormOpen(false);
    setNewContractor({});
  };

  const submitWork = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newWork.description || !newWork.propertyId) return;
    onAddWorkItem({
        id: Date.now().toString(),
        propertyId: newWork.propertyId!,
        contractorId: newWork.contractorId!,
        description: newWork.description!,
        category: newWork.category || 'General',
        estimatedCost: Number(newWork.estimatedCost) || 0,
        actualCost: Number(newWork.actualCost) || 0,
        status: newWork.status as WorkStatus,
        isBundle: newWork.isBundle || false,
        startDate: new Date().toISOString(),
    } as WorkItem);
    setIsWorkFormOpen(false);
    setNewWork({ status: WorkStatus.PENDING, isBundle: false });
  };

  const inputClass = "w-full p-2 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-vestra-gold focus:border-transparent outline-none text-slate-100 placeholder-slate-500";
  const labelClass = "text-xs font-bold text-slate-400 uppercase";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white">Project Management</h2>
        <div className="flex gap-2">
           <button 
             onClick={() => setActiveTab('work')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'work' ? 'bg-vestra-gold text-slate-900 font-bold' : 'text-slate-400 hover:bg-slate-800'}`}
           >
             Work Tracker
           </button>
           <button 
             onClick={() => setActiveTab('contractors')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'contractors' ? 'bg-vestra-gold text-slate-900 font-bold' : 'text-slate-400 hover:bg-slate-800'}`}
           >
             Contractors
           </button>
        </div>
      </div>

      {activeTab === 'contractors' && (
        <div className="space-y-4 animate-in fade-in duration-300">
           <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg text-slate-200">Contractor Database</h3>
              <div className="flex gap-2">
                 <button onClick={handleExportContractors} className="p-2 border border-slate-700 text-slate-300 rounded-md hover:bg-slate-800"><Download size={16}/></button>
                 <button onClick={() => setIsConFormOpen(!isConFormOpen)} className="px-3 py-2 bg-vestra-gold text-slate-900 rounded-md font-bold text-sm hover:bg-yellow-500 transition-colors">
                   + Add Contractor
                 </button>
              </div>
           </div>

           {isConFormOpen && (
             <form onSubmit={submitContractor} className="bg-slate-900 p-6 rounded-lg shadow-xl border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Business Name" className={inputClass} required onChange={e => setNewContractor({...newContractor, businessName: e.target.value})} />
                <input placeholder="Contact Person" className={inputClass} onChange={e => setNewContractor({...newContractor, contactName: e.target.value})} />
                <input placeholder="Specialty (e.g. Plumbing)" className={inputClass} onChange={e => setNewContractor({...newContractor, specialty: e.target.value})} />
                <input placeholder="Phone" className={inputClass} onChange={e => setNewContractor({...newContractor, phone: e.target.value})} />
                <button className="col-span-1 md:col-span-2 bg-vestra-gold text-slate-900 py-2 rounded font-bold hover:bg-yellow-500">Save Contractor</button>
             </form>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {contractors.map(c => (
               <div key={c.id} className="bg-slate-900 p-4 rounded-lg shadow-lg border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Briefcase size={18} className="text-vestra-gold" />
                        <h4 className="font-bold text-white">{c.businessName}</h4>
                    </div>
                    <p className="text-sm text-slate-400 mb-1">Contact: {c.contactName}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">{c.specialty}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 text-sm text-slate-300">
                    <p>{c.phone}</p>
                    <p className="truncate">{c.email}</p>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {activeTab === 'work' && (
        <div className="space-y-4 animate-in fade-in duration-300">
           <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg text-slate-200">Work Log & Expenses</h3>
              <div className="flex gap-2">
                 <button onClick={handleExportWork} className="p-2 border border-slate-700 text-slate-300 rounded-md hover:bg-slate-800"><Download size={16}/></button>
                 <button onClick={() => setIsWorkFormOpen(!isWorkFormOpen)} className="px-3 py-2 bg-vestra-gold text-slate-900 rounded-md font-bold text-sm hover:bg-yellow-500 transition-colors">
                   + Log Work
                 </button>
              </div>
           </div>

           {isWorkFormOpen && (
             <form onSubmit={submitWork} className="bg-slate-900 p-6 rounded-lg shadow-xl border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className={labelClass}>Property</label>
                  <select className={inputClass} required onChange={e => setNewWork({...newWork, propertyId: e.target.value})}>
                     <option value="">Select Property...</option>
                     {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                  </select>
                </div>
                <div>
                   <label className={labelClass}>Contractor</label>
                   <select className={inputClass} required onChange={e => setNewWork({...newWork, contractorId: e.target.value})}>
                     <option value="">Select Contractor...</option>
                     {contractors.map(c => <option key={c.id} value={c.id}>{c.businessName} ({c.specialty})</option>)}
                   </select>
                </div>
                <div>
                   <label className={labelClass}>Description</label>
                   <input className={inputClass} placeholder="e.g. Roof Repair" required onChange={e => setNewWork({...newWork, description: e.target.value})} />
                </div>
                <div>
                   <label className={labelClass}>Est. Cost</label>
                   <input type="number" className={inputClass} onChange={e => setNewWork({...newWork, estimatedCost: parseFloat(e.target.value)})} />
                </div>
                <div>
                   <label className={labelClass}>Actual Cost</label>
                   <input type="number" className={inputClass} onChange={e => setNewWork({...newWork, actualCost: parseFloat(e.target.value)})} />
                </div>
                <div className="flex items-center gap-2">
                   <input type="checkbox" id="bundle" className="accent-vestra-gold" onChange={e => setNewWork({...newWork, isBundle: e.target.checked})} />
                   <label htmlFor="bundle" className="text-sm text-slate-300">Is Bundle?</label>
                </div>
                <div>
                   <label className={labelClass}>Status</label>
                   <select className={inputClass} onChange={e => setNewWork({...newWork, status: e.target.value as WorkStatus})}>
                      {Object.values(WorkStatus).map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
                <button className="col-span-1 md:col-span-2 bg-vestra-gold text-slate-900 py-2 rounded font-bold hover:bg-yellow-500">Save Work Item</button>
             </form>
           )}

           <div className="bg-slate-900 rounded-lg shadow-lg border border-slate-800 overflow-hidden">
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                 <tr>
                   <th className="p-4">Property</th>
                   <th className="p-4">Description</th>
                   <th className="p-4 hidden md:table-cell">Contractor</th>
                   <th className="p-4">Cost (Act/Est)</th>
                   <th className="p-4">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800">
                 {workItems.map(item => {
                   const prop = properties.find(p => p.id === item.propertyId);
                   const cont = contractors.find(c => c.id === item.contractorId);
                   return (
                     <tr key={item.id} className="hover:bg-slate-800/50 transition-colors text-slate-300">
                       <td className="p-4 font-medium text-white">{prop?.address || 'Unknown'}</td>
                       <td className="p-4">
                         <div className="flex flex-col">
                           <span>{item.description}</span>
                           {item.isBundle && <span className="text-xs bg-purple-900/50 text-purple-300 w-max px-2 py-0.5 rounded mt-1 border border-purple-800">Bundle</span>}
                         </div>
                       </td>
                       <td className="p-4 hidden md:table-cell text-slate-400">{cont?.businessName || 'N/A'}</td>
                       <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white">{formatCurrency(item.actualCost)}</span>
                            <span className="text-xs text-slate-500">Est: {formatCurrency(item.estimatedCost)}</span>
                          </div>
                       </td>
                       <td className="p-4">
                         <span className={`px-2 py-1 rounded-full text-xs font-medium border
                           ${item.status === WorkStatus.COMPLETED ? 'bg-green-900/30 text-green-400 border-green-800' : 
                             item.status === WorkStatus.IN_PROGRESS ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 
                             'bg-slate-800 text-slate-400 border-slate-700'}`}>
                           {item.status}
                         </span>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default ProjectTracker;