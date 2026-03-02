import React, { useState } from 'react';
import { Building, Search, ExternalLink, Phone, Mail, Globe, MapPin, FileText, Plus, Edit, Trash2, Filter } from 'lucide-react';

interface PropertyAppraiser {
  id: string;
  name: string;
  company: string;
  jurisdiction: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  specialties: string[];
  notes: string;
}

const PropertyAppraisers: React.FC = () => {
  const [appraisers, setAppraisers] = useState<PropertyAppraiser[]>([
    {
      id: '1',
      name: 'Miami-Dade County Property Appraiser',
      company: 'Miami-Dade County',
      jurisdiction: 'Miami-Dade County, FL',
      phone: '(305) 375-5443',
      email: 'paomail@miamidade.gov',
      website: 'https://www.miamidade.gov/property',
      address: '111 NW 1st St, Miami, FL 33128',
      specialties: ['Residential', 'Commercial', 'Land'],
      notes: 'Official county appraiser for Miami-Dade properties'
    },
    {
      id: '2',
      name: 'Broward County Property Appraiser',
      company: 'Broward County',
      jurisdiction: 'Broward County, FL',
      phone: '(954) 357-6830',
      email: 'contact@bcpa.net',
      website: 'https://bcpa.net',
      address: '115 S Andrews Ave, Fort Lauderdale, FL 33301',
      specialties: ['Residential', 'Commercial', 'Condominiums'],
      notes: 'Official county appraiser for Broward properties'
    },
    {
      id: '3',
      name: 'Palm Beach County Property Appraiser',
      company: 'Palm Beach County',
      jurisdiction: 'Palm Beach County, FL',
      phone: '(561) 355-3229',
      email: 'pa@pbcgov.org',
      website: 'https://www.pbcgov.org/pa',
      address: '100 Australian Ave, West Palm Beach, FL 33406',
      specialties: ['Residential', 'Commercial', 'Luxury Properties'],
      notes: 'Official county appraiser for Palm Beach properties'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAppraiser, setEditingAppraiser] = useState<PropertyAppraiser | null>(null);
  const [formData, setFormData] = useState<Partial<PropertyAppraiser>>({
    name: '',
    company: '',
    jurisdiction: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    specialties: [],
    notes: ''
  });

  const filteredAppraisers = appraisers.filter(appraiser =>
    appraiser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appraiser.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appraiser.jurisdiction.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddAppraiser = () => {
    if (formData.name && formData.company) {
      const newAppraiser: PropertyAppraiser = {
        id: Date.now().toString(),
        name: formData.name,
        company: formData.company,
        jurisdiction: formData.jurisdiction || '',
        phone: formData.phone || '',
        email: formData.email || '',
        website: formData.website || '',
        address: formData.address || '',
        specialties: formData.specialties || [],
        notes: formData.notes || ''
      };
      
      setAppraisers([...appraisers, newAppraiser]);
      setFormData({
        name: '',
        company: '',
        jurisdiction: '',
        phone: '',
        email: '',
        website: '',
        address: '',
        specialties: [],
        notes: ''
      });
      setShowAddForm(false);
    }
  };

  const handleUpdateAppraiser = () => {
    if (editingAppraiser && formData.name && formData.company) {
      setAppraisers(appraisers.map(a => 
        a.id === editingAppraiser.id 
          ? { ...a, ...formData } as PropertyAppraiser
          : a
      ));
      setEditingAppraiser(null);
      setFormData({
        name: '',
        company: '',
        jurisdiction: '',
        phone: '',
        email: '',
        website: '',
        address: '',
        specialties: [],
        notes: ''
      });
    }
  };

  const handleDeleteAppraiser = (id: string) => {
    setAppraisers(appraisers.filter(a => a.id !== id));
  };

  const openEditForm = (appraiser: PropertyAppraiser) => {
    setEditingAppraiser(appraiser);
    setFormData(appraiser);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Building className="text-vestra-gold" size={36} />
            Property Appraisers
          </h1>
          <p className="text-slate-400 mt-2">Manage property appraiser contacts and resources</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-vestra-gold text-slate-900 px-6 py-3 rounded-lg font-bold hover:bg-yellow-500 transition-colors flex items-center gap-2 shadow-lg"
        >
          <Plus size={20} />
          Add Appraiser
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search appraisers by name, company, or jurisdiction..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-vestra-gold"
          />
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingAppraiser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingAppraiser ? 'Edit Appraiser' : 'Add New Appraiser'}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vestra-gold"
                    placeholder="Appraiser name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Company *</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vestra-gold"
                    placeholder="Company or organization"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Jurisdiction</label>
                <input
                  type="text"
                  value={formData.jurisdiction}
                  onChange={(e) => setFormData({...formData, jurisdiction: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vestra-gold"
                  placeholder="County, city, or service area"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vestra-gold"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vestra-gold"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vestra-gold"
                  placeholder="https://example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vestra-gold"
                  placeholder="123 Main St, City, State 12345"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vestra-gold"
                  rows={3}
                  placeholder="Additional notes or information..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingAppraiser(null);
                  setFormData({
                    name: '',
                    company: '',
                    jurisdiction: '',
                    phone: '',
                    email: '',
                    website: '',
                    address: '',
                    specialties: [],
                    notes: ''
                  });
                }}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingAppraiser ? handleUpdateAppraiser : handleAddAppraiser}
                className="px-6 py-2 bg-vestra-gold hover:bg-yellow-500 rounded-lg font-bold text-slate-900 transition-colors"
              >
                {editingAppraiser ? 'Update' : 'Add'} Appraiser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appraisers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAppraisers.map((appraiser) => (
          <div key={appraiser.id} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-colors">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{appraiser.name}</h3>
                  <p className="text-vestra-gold text-sm font-medium">{appraiser.company}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditForm(appraiser)}
                    className="p-2 text-slate-400 hover:text-vestra-gold transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteAppraiser(appraiser.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              {appraiser.jurisdiction && (
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                  <MapPin size={14} />
                  {appraiser.jurisdiction}
                </div>
              )}
              
              <div className="space-y-2">
                {appraiser.phone && (
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Phone size={14} className="text-slate-500" />
                    <a href={`tel:${appraiser.phone}`} className="hover:text-vestra-gold transition-colors">
                      {appraiser.phone}
                    </a>
                  </div>
                )}
                {appraiser.email && (
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Mail size={14} className="text-slate-500" />
                    <a href={`mailto:${appraiser.email}`} className="hover:text-vestra-gold transition-colors">
                      {appraiser.email}
                    </a>
                  </div>
                )}
                {appraiser.website && (
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Globe size={14} className="text-slate-500" />
                    <a 
                      href={appraiser.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-vestra-gold transition-colors flex items-center gap-1"
                    >
                      Visit Website
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
              
              {appraiser.specialties && appraiser.specialties.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <div className="flex flex-wrap gap-2">
                    {appraiser.specialties.map((specialty, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-slate-800 text-xs text-vestra-gold rounded-full border border-slate-700"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {appraiser.notes && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <div className="flex items-start gap-2">
                    <FileText size={14} className="text-slate-500 mt-0.5" />
                    <p className="text-slate-400 text-sm">{appraiser.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredAppraisers.length === 0 && (
        <div className="text-center py-12">
          <Building size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No appraisers found</h3>
          <p className="text-slate-400 mb-6">
            {searchTerm ? 'Try adjusting your search terms' : 'Add your first property appraiser to get started'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-vestra-gold text-slate-900 px-6 py-2 rounded-lg font-bold hover:bg-yellow-500 transition-colors"
            >
              Add Appraiser
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PropertyAppraisers;
