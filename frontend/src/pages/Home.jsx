import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TopNav from '../components/TopNav';

export default function Home() {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => setTemplates(data))
      .catch(console.error);
  }, []);

  return (
    <>
      <TopNav />
      <main className="flex-grow pt-32 pb-24 px-6 md:px-12 max-w-[1400px] mx-auto w-full">
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center mb-32 relative">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary-container rounded-full blur-[80px] opacity-40 -z-10"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-secondary-container rounded-full blur-[100px] opacity-30 -z-10"></div>
          
          <div className="lg:col-span-5 flex flex-col items-start z-10">
            <div className="inline-flex items-center gap-2 bg-surface-container-highest px-4 py-2 rounded-full mb-8 shadow-sm">
              <span className="material-symbols-outlined text-secondary text-sm">auto_awesome</span>
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider">The Digital Atelier</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-headline font-extrabold text-on-surface leading-[1.1] tracking-[-0.03em] mb-6">
              Design & Learn Crochet <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dim">with AI</span>
            </h1>
            
            <p className="text-lg md:text-xl font-body text-on-surface-variant leading-relaxed mb-10 max-w-lg">
              Generate custom patterns with AI and learn step-by-step. Perfect for beginners discovering the craft and masters expanding their repertoire.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link to="/create" className="bg-gradient-to-r from-primary to-primary-dim text-on-primary px-8 py-4 rounded-full font-label font-bold text-base hover:scale-[1.02] transition-transform shadow-[0_12px_24px_rgba(101,77,181,0.25)] w-full sm:w-auto text-center">
                Create Your First Pattern
              </Link>
              <button className="bg-surface-container-low text-on-surface px-8 py-4 rounded-full font-label font-bold text-base hover:bg-surface-container-highest transition-colors w-full sm:w-auto text-center">
                Explore Gallery
              </button>
            </div>
          </div>
          
          <div className="lg:col-span-7 relative">
            <div className="relative w-full aspect-[4/3] lg:aspect-auto lg:h-[600px] bg-surface-container-highest rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(52,50,51,0.06)] group">
              <img alt="cozy handmade aesthetic" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfr0Diz8rHzJmxu8vJxkoX2xpgQ6dh-ggXdHaZ3Os37nJ0N1cdsdTYyQNvVUYbZhIjsDJAJPQW_b5LOlCsRq8s8Djd7qxOz2HSKe7pK__wHxCdE904IXUlbCdNL0SxLV2VDqkicNcAxTHmG1Appahc0PsjS5cb-kHSlVYQp7jHZuGTRYcy2leuRVTJkmDyow7UhfruK5PoCVNACRgFXA6tUEu3y6-DHEU_TnZXat3Xig4yuPRC1Pq7BToAD10BqFL8LTBS6Wcbh_c" />
            </div>
          </div>
        </section>

        {/* Templates Section (Dynamic) */}
        <section className="mb-24">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-on-surface mb-12 tracking-tight">Available Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {templates.map(tpl => (
              <div key={tpl.id} className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/10 flex flex-col hover:shadow-md transition-shadow">
                <div className="w-full h-48 bg-surface-container-highest rounded-lg mb-4 overflow-hidden relative">
                   <div className="absolute top-2 right-2 px-3 py-1 bg-surface/80 backdrop-blur-md rounded-full text-xs font-bold text-on-surface">
                     {tpl.difficulty}
                   </div>
                   <img src={`https://picsum.photos/seed/${encodeURIComponent(tpl.name)}/400/300`} alt={tpl.name} className="w-full h-full object-cover opacity-80 mix-blend-multiply" />
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-2">{tpl.name}</h3>
                <p className="text-sm text-on-surface-variant mb-6 flex-grow">{tpl.description}</p>
                <Link to={`/create/${tpl.id}`} className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-bold text-center hover:bg-primary/20 transition-colors">
                  Customize Template
                </Link>
              </div>
            ))}
            {templates.length === 0 && <p className="text-on-surface-variant col-span-3 text-center">Loading templates...</p>}
          </div>
        </section>
      </main>
    </>
  );
}
