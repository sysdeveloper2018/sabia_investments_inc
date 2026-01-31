import React, { useState, useRef, useEffect } from 'react';
import { CommunicationLog, ContactRole, Property } from '../types';
import { MessageSquare, Mail, Phone, Calendar, Send, CheckSquare, Square, Save, User, Mic, Loader2, StopCircle, X } from 'lucide-react';
import { draftEmail } from '../services/geminiService';

interface CommunicationLogProps {
  logs: CommunicationLog[];
  onAddLog: (log: CommunicationLog) => void;
  properties: Property[];
  initialPropertyId?: string | null;
}

const CommunicationLogComponent: React.FC<CommunicationLogProps> = ({ logs, onAddLog, properties, initialPropertyId }) => {
    // Mode State: 'log' for manual entry, 'draft' for AI email generation
    const [mode, setMode] = useState<'log' | 'draft'>('log');
    
    // State for filtering history
    const [filterPropertyId, setFilterPropertyId] = useState<string | null>(null);

    // --- AI Composer State ---
    const [drafting, setDrafting] = useState(false);
    const [aiPrompt, setAiPrompt] = useState({
        recipient: '',
        role: 'Contractor',
        topic: '',
        details: '',
        tone: 'Professional'
    });
    const [generatedDraft, setGeneratedDraft] = useState('');

    // --- Manual Log State ---
    const [newLog, setNewLog] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'Call' as const,
        contactName: '',
        contactRole: 'Contractor',
        propertyId: '',
        summary: '',
        followUp: false
    });

    // --- Voice Input State ---
    const [listeningField, setListeningField] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);

    // Update internal state when prop changes
    useEffect(() => {
        if (initialPropertyId) {
            setFilterPropertyId(initialPropertyId);
            setNewLog(prev => ({ ...prev, propertyId: initialPropertyId }));
            setMode('log'); // Switch to log mode so they can enter data immediately
        }
    }, [initialPropertyId]);

    // Cleanup recording on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const toggleVoiceInput = (fieldId: string, stateSetter: React.Dispatch<React.SetStateAction<any>>, fieldKey: string) => {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        
        if (!SpeechRecognition) {
            alert("Voice input is not supported in this browser.");
            return;
        }

        // STOP if currently listening to THIS field (Toggle Off)
        if (listeningField === fieldId) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            setListeningField(null);
            return;
        }

        // STOP if listening to ANOTHER field (Switch context)
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }

        // START new session
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Key: Persistent listening
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setListeningField(fieldId);
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                }
            }
            
            if (finalTranscript) {
                stateSetter((prev: any) => {
                    const current = prev[fieldKey] || '';
                    // Append with space if needed
                    const spacer = (current && !current.endsWith(' ')) ? ' ' : '';
                    return {
                        ...prev,
                        [fieldKey]: current + spacer + finalTranscript.trim()
                    };
                });
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Speech error:", event.error);
            // Don't auto-stop on 'no-speech' in continuous mode, but some browsers might.
            if(event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                 setListeningField(null);
                 recognitionRef.current = null;
            }
        };

        recognition.onend = () => {
             // If stopped externally (browser timeout or permission revoke), sync state
             if (recognitionRef.current === recognition) {
                 setListeningField(null);
                 recognitionRef.current = null;
             }
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const handleDraft = async () => {
        setDrafting(true);
        const result = await draftEmail(
            aiPrompt.recipient,
            aiPrompt.role,
            aiPrompt.topic,
            aiPrompt.details,
            aiPrompt.tone as any
        );
        setGeneratedDraft(result);
        setDrafting(false);
    };

    const handleSaveLog = () => {
        if (!newLog.contactName || !newLog.summary) return;

        const entry: CommunicationLog = {
            id: Date.now().toString(),
            propertyId: newLog.propertyId,
            contactId: newLog.contactName, // Using name as ID for simple display
            contactRole: newLog.contactRole as ContactRole,
            date: newLog.date,
            type: newLog.type,
            summary: newLog.summary,
            followUpRequired: newLog.followUp
        };
        
        onAddLog(entry);
        
        // Reset Form
        setNewLog(prev => ({
            ...prev,
            summary: '',
            contactName: '',
            followUp: false
        }));
    };

    const inputClass = "w-full p-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-vestra-gold outline-none";

    // Filtering logic
    const filteredLogs = filterPropertyId ? logs.filter(l => l.propertyId === filterPropertyId) : logs;
    const activeProperty = properties.find(p => p.id === filterPropertyId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Col: History */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Communication History</h2>
                
                {/* Active Filter Banner */}
                {filterPropertyId && (
                    <div className="flex justify-between items-center bg-slate-800 p-3 rounded-lg border border-slate-700 animate-in fade-in">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-500">Filtered By Property</span>
                            <span className="text-sm font-bold text-vestra-gold">{activeProperty?.address || 'Unknown Property'}</span>
                        </div>
                        <button 
                            onClick={() => setFilterPropertyId(null)}
                            className="text-xs flex items-center gap-1 text-slate-400 hover:text-white bg-slate-700 px-2 py-1 rounded"
                        >
                            <X size={12} /> Clear Filter
                        </button>
                    </div>
                )}

                <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden max-h-[600px] overflow-y-auto no-scrollbar">
                    {filteredLogs.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                            <MessageSquare size={40} className="mb-2 opacity-20" />
                            <p>{filterPropertyId ? 'No logs found for this property.' : 'No communications recorded yet.'}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {[...filteredLogs].reverse().map(log => (
                                <div key={log.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase
                                                ${log.type === 'Email' ? 'bg-blue-900/30 text-blue-400' : 
                                                  log.type === 'Call' ? 'bg-green-900/30 text-green-400' : 
                                                  log.type === 'Text' ? 'bg-purple-900/30 text-purple-400' :
                                                  'bg-slate-800 text-slate-400'}`}>
                                                {log.type === 'Call' && <Phone size={10} />}
                                                {log.type === 'Email' && <Mail size={10} />}
                                                {log.type === 'Meeting' && <User size={10} />}
                                                {log.type === 'Text' && <MessageSquare size={10} />}
                                                {log.type}
                                            </span>
                                            <span className="text-xs text-slate-500">{log.date}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-200 text-sm">
                                            {log.contactId} 
                                            <span className="text-slate-500 font-normal ml-1 text-xs">({log.contactRole})</span>
                                        </p>
                                        <p className="text-sm text-slate-300 mt-1 leading-relaxed">{log.summary}</p>
                                    </div>
                                    {log.followUpRequired && (
                                        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-red-900/20 text-red-400 text-xs font-medium rounded border border-red-900/30">
                                            <Calendar size={12} /> Follow-up Required
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Col: Tools */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                     <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="text-vestra-gold">✦</span> Communication
                    </h2>
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                        <button 
                            onClick={() => setMode('log')}
                            className={`px-3 py-1 text-xs font-bold rounded transition-colors ${mode === 'log' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            Log Activity
                        </button>
                        <button 
                            onClick={() => setMode('draft')}
                            className={`px-3 py-1 text-xs font-bold rounded transition-colors ${mode === 'draft' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            AI Composer
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 transition-all">
                    {mode === 'log' ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                                <Save size={18} className="text-vestra-gold" />
                                Record Interaction
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Date</label>
                                    <input 
                                        type="date" 
                                        className={inputClass}
                                        value={newLog.date}
                                        onChange={e => setNewLog({...newLog, date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Type</label>
                                    <select 
                                        className={inputClass}
                                        value={newLog.type}
                                        onChange={e => setNewLog({...newLog, type: e.target.value as any})}
                                    >
                                        <option>Call</option>
                                        <option>Email</option>
                                        <option>Text</option>
                                        <option>Meeting</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Related Property (Optional)</label>
                                <select 
                                    className={inputClass}
                                    value={newLog.propertyId}
                                    onChange={e => setNewLog({...newLog, propertyId: e.target.value})}
                                >
                                    <option value="">-- General / None --</option>
                                    {properties.map(p => (
                                        <option key={p.id} value={p.id}>{p.address}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Contact Name</label>
                                    <input 
                                        placeholder="e.g. John Doe" 
                                        className={inputClass}
                                        value={newLog.contactName}
                                        onChange={e => setNewLog({...newLog, contactName: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Role</label>
                                    <select 
                                        className={inputClass}
                                        value={newLog.contactRole}
                                        onChange={e => setNewLog({...newLog, contactRole: e.target.value})}
                                    >
                                        <option>Contractor</option>
                                        <option>Agent</option>
                                        <option>Buyer</option>
                                        <option>Lawyer</option>
                                        <option>Investor</option>
                                        <option>Tenant</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase block">Summary / Notes</label>
                                    <button 
                                        type="button"
                                        onClick={() => toggleVoiceInput('summary', setNewLog, 'summary')}
                                        className={`text-[10px] flex items-center gap-1 uppercase font-bold px-2 py-0.5 rounded transition-all
                                            ${listeningField === 'summary' ? 'bg-red-900/30 text-red-400 animate-pulse border border-red-900/50' : 'bg-slate-800 text-vestra-gold hover:bg-slate-700'}`}
                                    >
                                        {listeningField === 'summary' ? <><StopCircle size={10} /> Stop Rec</> : <><Mic size={10} /> Speak</>}
                                    </button>
                                </div>
                                <textarea 
                                    placeholder="Details of conversation..." 
                                    className={`${inputClass} h-24`}
                                    value={newLog.summary}
                                    onChange={e => setNewLog({...newLog, summary: e.target.value})}
                                />
                            </div>

                            <div 
                                className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-800 rounded transition-colors" 
                                onClick={() => setNewLog(prev => ({...prev, followUp: !prev.followUp}))}
                            >
                                {newLog.followUp ? <CheckSquare size={18} className="text-red-400" /> : <Square size={18} className="text-slate-500" />}
                                <span className={`text-sm ${newLog.followUp ? 'text-red-400 font-medium' : 'text-slate-400'}`}>Flag for Follow-up</span>
                            </div>

                            <button 
                                onClick={handleSaveLog}
                                disabled={!newLog.contactName || !newLog.summary}
                                className="w-full bg-vestra-gold text-slate-900 py-3 rounded-lg font-bold hover:bg-yellow-500 transition-colors flex justify-center items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={18} /> Save Log Entry
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                             <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                                <MessageSquare size={18} className="text-vestra-gold" />
                                AI Email Assistant
                             </h3>
                             <p className="text-xs text-slate-400 bg-slate-800/50 p-3 rounded border border-slate-700">
                                Use Gemini AI to draft professional emails to your contractors, lawyers, or buyers instantly.
                             </p>
                             
                             <div className="grid grid-cols-2 gap-3">
                                 <div>
                                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Recipient</label>
                                     <input 
                                        placeholder="Name" 
                                        className={inputClass}
                                        value={aiPrompt.recipient}
                                        onChange={e => setAiPrompt({...aiPrompt, recipient: e.target.value})}
                                     />
                                 </div>
                                 <div>
                                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Role</label>
                                     <select 
                                        className={inputClass}
                                        value={aiPrompt.role}
                                        onChange={e => setAiPrompt({...aiPrompt, role: e.target.value})}
                                     >
                                        <option>Contractor</option>
                                        <option>Lawyer</option>
                                        <option>Buyer</option>
                                        <option>Investor</option>
                                     </select>
                                 </div>
                            </div>
                            
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase block">Topic</label>
                                    <button 
                                        type="button"
                                        onClick={() => toggleVoiceInput('topic', setAiPrompt, 'topic')}
                                        className={`text-[10px] flex items-center gap-1 uppercase font-bold px-2 py-0.5 rounded transition-all
                                            ${listeningField === 'topic' ? 'bg-red-900/30 text-red-400 animate-pulse border border-red-900/50' : 'bg-slate-800 text-vestra-gold hover:bg-slate-700'}`}
                                    >
                                        {listeningField === 'topic' ? <><StopCircle size={10} /> Stop Rec</> : <><Mic size={10} /> Speak</>}
                                    </button>
                                </div>
                                <input 
                                    placeholder="e.g. Delay in plumbing work" 
                                    className={inputClass}
                                    value={aiPrompt.topic}
                                    onChange={e => setAiPrompt({...aiPrompt, topic: e.target.value})}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase block">Key Details</label>
                                    <button 
                                        type="button"
                                        onClick={() => toggleVoiceInput('details', setAiPrompt, 'details')}
                                        className={`text-[10px] flex items-center gap-1 uppercase font-bold px-2 py-0.5 rounded transition-all
                                            ${listeningField === 'details' ? 'bg-red-900/30 text-red-400 animate-pulse border border-red-900/50' : 'bg-slate-800 text-vestra-gold hover:bg-slate-700'}`}
                                    >
                                        {listeningField === 'details' ? <><StopCircle size={10} /> Stop Rec</> : <><Mic size={10} /> Speak</>}
                                    </button>
                                </div>
                                <textarea 
                                    placeholder="Points to include..." 
                                    className={`${inputClass} h-20`}
                                    value={aiPrompt.details}
                                    onChange={e => setAiPrompt({...aiPrompt, details: e.target.value})}
                                />
                            </div>

                             <div className="flex justify-between items-end gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tone</label>
                                    <select 
                                        className={inputClass}
                                        value={aiPrompt.tone}
                                        onChange={e => setAiPrompt({...aiPrompt, tone: e.target.value})}
                                    >
                                        <option>Professional</option>
                                        <option>Friendly</option>
                                        <option>Firm</option>
                                    </select>
                                </div>
                                <button 
                                    onClick={handleDraft}
                                    disabled={drafting}
                                    className="bg-vestra-gold text-slate-900 px-6 py-2 rounded-lg text-sm font-bold hover:bg-yellow-500 flex items-center gap-2 shadow-lg h-10"
                                >
                                    {drafting ? 'Generating...' : <><Send size={16} /> Draft Email</>}
                                </button>
                            </div>

                            {generatedDraft && (
                                <div className="mt-6 pt-4 border-t border-slate-800 animate-in fade-in">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Generated Draft</label>
                                        <button className="text-xs text-vestra-gold font-bold hover:underline" onClick={() => navigator.clipboard.writeText(generatedDraft)}>
                                            Copy
                                        </button>
                                    </div>
                                    <textarea 
                                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded text-sm text-slate-300 h-40 focus:ring-1 focus:ring-vestra-gold outline-none"
                                        value={generatedDraft}
                                        onChange={(e) => setGeneratedDraft(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommunicationLogComponent;