"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Building2, Users, WalletCards, CircleDollarSign, Plus, Search,
  Settings, MoreVertical, ShieldCheck, TrendingUp, AlertTriangle,
  Landmark, GraduationCap, Dumbbell, Home, Baby, BriefcaseBusiness,
  X, CheckCircle2, Loader2
} from 'lucide-react';

type Org = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  plan: string | null;
  status: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  logo_url?: string | null;
  created_at?: string;
};

const demoOrgs: Org[] = [
  {id:'demo-1',name:'Escuela Blanca Nieves',slug:'blanca-nieves',industry:'Colegio',plan:'Pro',status:'active',primary_color:'#4f46e5',secondary_color:'#eef2ff'},
  {id:'demo-2',name:'Academia Horizonte',slug:'academia-horizonte',industry:'Academia',plan:'Básico',status:'trial',primary_color:'#059669',secondary_color:'#ecfdf5'},
  {id:'demo-3',name:'Condominio Los Alerces',slug:'los-alerces',industry:'Condominio',plan:'Premium',status:'active',primary_color:'#d97706',secondary_color:'#fffbeb'},
];

const industryIcon = (industry?: string | null) => {
  const s = (industry || '').toLowerCase();
  if (s.includes('coleg') || s.includes('escuela')) return GraduationCap;
  if (s.includes('jard')) return Baby;
  if (s.includes('academ') || s.includes('club')) return Dumbbell;
  if (s.includes('condom')) return Home;
  return BriefcaseBusiness;
};

function money(n:number){ return new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n); }

export default function Dashboard(){
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState('');
  const [form,setForm]=useState({name:'',industry:'Colegio',plan:'Básico',primary_color:'#4f46e5',secondary_color:'#eef2ff'});

  async function load(){
    setLoading(true);
    const { data, error } = await supabase
      .from('organizations')
      .select('id,name,slug,industry,plan,status,primary_color,secondary_color,logo_url,created_at')
      .order('created_at',{ascending:false});
    if(error || !data || data.length===0){ setOrgs(demoOrgs); }
    else setOrgs(data as Org[]);
    setLoading(false);
  }

  useEffect(()=>{ load(); },[]);

  const filtered=useMemo(()=>orgs.filter(o=>
    [o.name,o.industry,o.plan,o.status].join(' ').toLowerCase().includes(search.toLowerCase())
  ),[orgs,search]);

  const metrics={
    organizations:orgs.length,
    customers: orgs.length ? orgs.length*37 : 0,
    revenue: orgs.length ? orgs.length*124500 : 0,
    overdue: orgs.length ? orgs.length*18200 : 0,
  };

  async function createOrg(e:React.FormEvent){
    e.preventDefault();
    if(!form.name.trim()) return;
    setSaving(true); setNotice('');
    const slug=form.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') + '-' + Math.random().toString(36).slice(2,6);
    const payload={...form,slug,status:'trial'};
    const {data,error}=await supabase.from('organizations').insert(payload).select().single();
    if(error){
      setOrgs(prev=>[{id:'local-'+Date.now(),...payload},...prev]);
      setNotice('Vista de demostración creada. Al iniciar sesión como administrador se guardará en la base real.');
    } else {
      setOrgs(prev=>[data as Org,...prev]);
      setNotice('Organización creada correctamente.');
    }
    setSaving(false);
    setForm({name:'',industry:'Colegio',plan:'Básico',primary_color:'#4f46e5',secondary_color:'#eef2ff'});
  }

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brandMark">CF</div><div><strong>CuotaFácil</strong><small>SaaS V2</small></div></div>
      <nav>
        <button className="nav active"><TrendingUp size={18}/>Resumen</button>
        <button className="nav"><Building2 size={18}/>Organizaciones</button>
        <button className="nav"><Users size={18}/>Usuarios</button>
        <button className="nav"><WalletCards size={18}/>Planes y cobros</button>
        <button className="nav"><Settings size={18}/>Configuración</button>
      </nav>
      <div className="secure"><ShieldCheck size={18}/><span>Panel propietario<small>Acceso superadmin</small></span></div>
    </aside>

    <section className="content">
      <header className="topbar">
        <div><p className="eyebrow">PANEL MAESTRO</p><h1>Tu plataforma, todos tus clientes.</h1><p className="muted">Administra organizaciones, planes, pagos y marca desde un solo lugar.</p></div>
        <button className="primary" onClick={()=>setOpen(true)}><Plus size={18}/> Nueva organización</button>
      </header>

      <div className="metrics">
        <Metric icon={<Building2/>} label="Organizaciones" value={String(metrics.organizations)} helper="clientes activos y en prueba" />
        <Metric icon={<Users/>} label="Personas gestionadas" value={metrics.customers.toLocaleString('es-CL')} helper="en toda la plataforma" />
        <Metric icon={<CircleDollarSign/>} label="Recaudación mensual" value={money(metrics.revenue)} helper="estimación consolidada" />
        <Metric icon={<AlertTriangle/>} label="Monto vencido" value={money(metrics.overdue)} helper="requiere seguimiento" warning />
      </div>

      <section className="panel">
        <div className="panelHead">
          <div><h2>Organizaciones</h2><p>Clientes conectados a tu plataforma.</p></div>
          <div className="search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar colegio, negocio o plan..."/></div>
        </div>

        {loading ? <div className="loading"><Loader2 className="spin"/>Cargando panel...</div> :
        <div className="orgGrid">
          {filtered.map(org=>{
            const Icon=industryIcon(org.industry);
            return <article className="orgCard" key={org.id}>
              <div className="orgTop">
                <div className="orgLogo" style={{background:org.secondary_color || '#eef2ff',color:org.primary_color || '#4f46e5'}}><Icon size={24}/></div>
                <button className="iconBtn"><MoreVertical size={18}/></button>
              </div>
              <h3>{org.name}</h3>
              <p>{org.industry || 'Organización'} · {org.plan || 'Básico'}</p>
              <div className="chips"><span className={'status '+(org.status||'active')}>{org.status==='trial'?'Prueba':org.status==='suspended'?'Suspendido':'Activo'}</span><span className="plan">{org.plan || 'Básico'}</span></div>
              <div className="miniStats"><span><strong>37</strong><small>personas</small></span><span><strong>{money(124500)}</strong><small>mes</small></span></div>
              <button className="openBtn">Entrar al panel <span>→</span></button>
            </article>
          })}
        </div>}
      </section>
    </section>

    {open && <div className="modalBack" onMouseDown={()=>setOpen(false)}>
      <div className="modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="modalHead"><div><p className="eyebrow">NUEVO CLIENTE</p><h2>Crear organización</h2></div><button className="iconBtn" onClick={()=>setOpen(false)}><X/></button></div>
        <form onSubmit={createOrg}>
          <label>Nombre de la organización<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ej. Colegio San José"/></label>
          <div className="two"><label>Tipo<select value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})}><option>Colegio</option><option>Jardín Infantil</option><option>Academia</option><option>Centro de Padres</option><option>Condominio</option><option>Club</option><option>Negocio</option></select></label>
          <label>Plan<select value={form.plan} onChange={e=>setForm({...form,plan:e.target.value})}><option>Básico</option><option>Pro</option><option>Premium</option></select></label></div>
          <div className="two"><label>Color principal<input type="color" value={form.primary_color} onChange={e=>setForm({...form,primary_color:e.target.value})}/></label><label>Color secundario<input type="color" value={form.secondary_color} onChange={e=>setForm({...form,secondary_color:e.target.value})}/></label></div>
          <div className="preview" style={{borderColor:form.primary_color}}><div className="previewLogo" style={{background:form.secondary_color,color:form.primary_color}}><Landmark/></div><div><strong>{form.name || 'Tu nueva organización'}</strong><small>{form.industry} · Plan {form.plan}</small></div></div>
          {notice && <div className="notice"><CheckCircle2 size={17}/>{notice}</div>}
          <button className="primary wide" disabled={saving}>{saving?<><Loader2 size={18} className="spin"/>Creando...</>:<><Plus size={18}/>Crear organización</>}</button>
        </form>
      </div>
    </div>}
  </main>
}

function Metric({icon,label,value,helper,warning}:{icon:React.ReactNode,label:string,value:string,helper:string,warning?:boolean}){
  return <article className={'metric '+(warning?'warn':'')}><div className="metricIcon">{icon}</div><div><p>{label}</p><strong>{value}</strong><small>{helper}</small></div></article>
}
