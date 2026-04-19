import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SideNav from '../components/SideNav';

export default function Create() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(templateId || '1');
  const [title, setTitle] = useState('');
  const [size, setSize] = useState('medium');
  const [color, setColor] = useState('Lavender');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => {
        setTemplates(data);
        if (!selectedTemplate && data.length > 0) {
          setSelectedTemplate(data[0].id);
        }
      });
  }, []);

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    setIsGenerating(true);
    
    try {
      const res = await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate,
          title: title || 'My Custom Pattern',
          customization: { size, color }
        })
      });
      const data = await res.json();
      
      // Initialize progress
      const progRes = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId: data.id })
      });
      const progData = await progRes.json();
      
      navigate(`/tracker/${data.id}`);
    } catch (e) {
      console.error(e);
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <SideNav />
      
      <main className="flex-grow p-12 lg:p-20 relative overflow-y-auto">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary-fixed-dim/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          
          <header className="mb-16">
            <h2 className="text-[3.5rem] font-bold font-headline text-on-surface tracking-[-0.02em] leading-tight mb-4">
              Draft your next masterpiece.
            </h2>
            <p className="text-on-surface-variant text-lg font-body max-w-2xl leading-relaxed">
              Select your base pattern, choose your customizations, and let our engine generate a precision crochet pattern tailored just for you.
            </p>
          </header>

          <div className="bg-surface-container-lowest rounded-[1.5rem] p-8 md:p-12 shadow-[0_20px_40px_-10px_rgba(26,28,31,0.06)] relative border border-outline-variant/10">
            
            <div className="mb-12">
              <label className="block text-sm font-bold text-primary mb-3 uppercase tracking-[0.05em] font-label">Pattern Title</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-surface-container-low text-on-surface rounded-lg p-4 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-fixed-dim/30 transition-all duration-300 font-body" 
                  placeholder="e.g. Cozy Ocean Blanket"
                />
              </div>
            </div>

            <div className="mb-12">
              <label className="block text-sm font-bold text-primary mb-4 uppercase tracking-[0.05em] font-label">Base Template</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map(tpl => (
                  <button 
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl transition-colors duration-200 group ${selectedTemplate === tpl.id ? 'bg-primary/5 border-2 border-primary text-primary' : 'border border-outline-variant/15 hover:bg-surface-container-low text-on-surface-variant'}`}
                  >
                    <span className="material-symbols-outlined text-3xl">{tpl.id === 'template_001' ? 'scarf' : tpl.id === 'template_002' ? 'shopping_bag' : 'toys'}</span>
                    <span className="font-bold">{tpl.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
              <div>
                <label className="block text-sm font-bold text-primary mb-4 uppercase tracking-[0.05em] font-label">Scale</label>
                <div className="flex flex-wrap gap-3">
                  {['small', 'medium', 'large'].map(s => (
                    <button 
                      key={s}
                      onClick={() => setSize(s)}
                      className={`px-5 py-2 rounded-full border transition-colors text-sm capitalize ${size === s ? 'bg-surface-container-highest text-on-surface font-bold border-transparent' : 'border-outline-variant/30 text-on-surface-variant hover:border-primary/50 font-medium'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-primary mb-4 uppercase tracking-[0.05em] font-label">Yarn Color</label>
                <div className="flex flex-wrap gap-3">
                  {['Lavender', 'Mint', 'Coral', 'Sage', 'Charcoal'].map(c => (
                    <button 
                      key={c}
                      onClick={() => setColor(c)}
                      className={`px-5 py-2 rounded-full border transition-colors text-sm ${color === c ? 'bg-surface-container-highest text-on-surface font-bold border-transparent' : 'border-outline-variant/30 text-on-surface-variant hover:border-primary/50 font-medium'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-outline-variant/10 flex justify-end items-center gap-6">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-gradient-to-r from-primary to-primary-dim text-on-primary rounded-xl px-10 py-4 font-bold text-lg hover:scale-[1.02] active:scale-95 transition-transform duration-200 shadow-lg shadow-primary/20 flex items-center gap-3 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">{isGenerating ? 'hourglass_empty' : 'magic_button'}</span>
                {isGenerating ? 'Generating...' : 'Generate Pattern'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
