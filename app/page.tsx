"use client";

import { useMemo, useState } from "react";
import {
  Building2, Users, CircleDollarSign, AlertTriangle, Search, MoreVertical,
  GraduationCap, Dumbbell, Home, BriefcaseBusiness, ArrowLeft, Pencil,
  PauseCircle, PlayCircle, WalletCards, ReceiptText, BarChart3
} from "lucide-react";

type Org = {
  id:string; name:string; industry:string; plan:string; status:string;
  primary_color?:string; secondary_color?:string;
};

const initialOrgs:Org[] = [
  {id:"1",name:"Escuela Blanca Nieves",industry:"Colegio",plan:"Pro",status:"active",primary_color:"#4f46e5",secondary_color:"#eef2ff"},
  {id:"2",name:"Academia Horizonte",industry:"Academia",plan:"Básico",status:"trial",primary_color:"#059669",secondary_color:"#ecfdf5"},
  {id:"3",name:"Condominio Los Alerces",industry:"Condominio",plan:"Premium",status:"active",primary_color:"#d97706",secondary_color:"#fffbeb"}
];

function money(n:number){
  return new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(n);
}

function OrgIcon({industry}:{industry:string}){
  const s=industry.toLowerCase();
  const I=s.includes("coleg")?GraduationCap:s.includes("academ")?Dumbbell:s.includes("condom")?Home:BriefcaseBusiness;
  return <I size={24}/>;
}

export default function Page(){
  const [orgs,setOrgs]=useState(initialOrgs);
  const [query,setQuery]=useState("");
  const [menu,setMenu]=useState<string|null>(null);
  const [selected,setSelected]=useState<Org|null>(null);

  const filtered=useMemo(()=>orgs.filter(o=>`${o.name} ${o.industry} ${o.plan}`.toLowerCase().includes(query.toLowerCase())),[orgs,query]);

  function toggle(org:Org){
    setOrgs(v=>v.map(o=>o.id===org.id?{...o,status:o.status==="suspended"?"active":"suspended"}:o));
    setMenu(null);
  }

  function nextPlan(org:Org){
    const plans=["Básico","Pro","Premium"];
    const i=plans.indexOf(org.plan);
    setOrgs(v=>v.map(o=>o.id===org.id?{...o,plan:plans[(i+1)%plans.length]}:o));
    setMenu(null);
  }

  if(selected){
    return <main style={{minHeight:"100vh",background:"#f6f7fb",padding:20,fontFamily:"Arial,sans-serif"}}>
      <button onClick={()=>setSelected(null)} style={backBtn}><ArrowLeft size={18}/> Volver al Panel Maestro</button>
      <section style={panel}>
        <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center"}}>
          <div>
            <div style={eyebrow}>PANEL DE ORGANIZACIÓN</div>
            <h1 style={{margin:"4px 0"}}>{selected.name}</h1>
            <p style={muted}>{selected.industry} · Plan {selected.plan}</p>
          </div>
          <div style={{...logo,background:selected.secondary_color,color:selected.primary_color}}><OrgIcon industry={selected.industry}/></div>
        </div>
      </section>

      <div style={metricGrid}>
        <Metric title="Personas" value="37" icon={<Users/>}/>
        <Metric title="Recaudación mensual" value={money(124500)} icon={<CircleDollarSign/>}/>
        <Metric title="Cuotas pendientes" value="8" icon={<ReceiptText/>}/>
        <Metric title="Monto vencido" value={money(18200)} icon={<AlertTriangle/>}/>
      </div>

      <section style={panel}>
        <h2>Gestión de {selected.name}</h2>
        <p style={muted}>Ya puedes entrar al panel de la organización. Estos módulos serán los siguientes en conectarse a Supabase.</p>
        <div style={cards}>
          <Action title="Personas / Alumnos" icon={<Users/>}/>
          <Action title="Cuotas" icon={<ReceiptText/>}/>
          <Action title="Pagos" icon={<WalletCards/>}/>
          <Action title="Reportes" icon={<BarChart3/>}/>
        </div>
      </section>
    </main>
  }

  return <main onClick={()=>menu&&setMenu(null)} style={{minHeight:"100vh",background:"#f6f7fb",padding:20,fontFamily:"Arial,sans-serif"}}>
    <section style={panel}>
      <div style={eyebrow}>PANEL MAESTRO</div>
      <h1 style={{margin:"4px 0"}}>Tu plataforma, todos tus clientes.</h1>
      <p style={muted}>Administra organizaciones, planes, pagos y marca desde un solo lugar.</p>
    </section>

    <div style={metricGrid}>
      <Metric title="Organizaciones" value={String(orgs.length)} icon={<Building2/>}/>
      <Metric title="Personas gestionadas" value={String(orgs.length*37)} icon={<Users/>}/>
      <Metric title="Recaudación mensual" value={money(orgs.length*124500)} icon={<CircleDollarSign/>}/>
      <Metric title="Monto vencido" value={money(orgs.length*18200)} icon={<AlertTriangle/>}/>
    </div>

    <section style={panel}>
      <h2 style={{marginBottom:4}}>Organizaciones</h2>
      <p style={muted}>Clientes conectados a tu plataforma.</p>
      <div style={searchBox}><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar colegio, negocio o plan..." style={searchInput}/></div>

      <div style={cards}>
        {filtered.map(org=><article key={org.id} style={card}>
          <div style={{display:"flex",justifyContent:"space-between",position:"relative"}}>
            <div style={{...logo,background:org.secondary_color,color:org.primary_color}}><OrgIcon industry={org.industry}/></div>
            <button onClick={(e)=>{e.stopPropagation();setMenu(menu===org.id?null:org.id)}} style={iconBtn}><MoreVertical/></button>
            {menu===org.id && <div onClick={e=>e.stopPropagation()} style={menuBox}>
              <button style={menuBtn} onClick={()=>alert("Edición de organización: siguiente módulo")}><Pencil size={16}/> Editar</button>
              <button style={menuBtn} onClick={()=>nextPlan(org)}><WalletCards size={16}/> Cambiar plan</button>
              <button style={menuBtn} onClick={()=>toggle(org)}>{org.status==="suspended"?<PlayCircle size={16}/>:<PauseCircle size={16}/>} {org.status==="suspended"?"Activar":"Suspender"}</button>
            </div>}
          </div>

          <h3 style={{marginBottom:4}}>{org.name}</h3>
          <p style={muted}>{org.industry} · {org.plan}</p>
          <div style={{display:"flex",gap:8,margin:"14px 0"}}>
            <span style={badge}>{org.status==="trial"?"Prueba":org.status==="suspended"?"Suspendido":"Activo"}</span>
            <span style={badge}>{org.plan}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderTop:"1px solid #eee",borderBottom:"1px solid #eee",padding:"12px 0"}}>
            <div><strong>37</strong><div style={small}>personas</div></div>
            <div><strong>{money(124500)}</strong><div style={small}>mes</div></div>
          </div>
          <button onClick={()=>setSelected(org)} style={openBtn}>Entrar al panel <span>→</span></button>
        </article>)}
      </div>
    </section>
  </main>
}

function Metric({title,value,icon}:{title:string;value:string;icon:React.ReactNode}){
  return <div style={metric}><div style={metricIcon}>{icon}</div><div><div style={muted}>{title}</div><strong style={{fontSize:26}}>{value}</strong></div></div>
}

function Action({title,icon}:{title:string;icon:React.ReactNode}){
  return <div style={card}><div style={metricIcon}>{icon}</div><h3>{title}</h3><button style={openBtn}>Abrir <span>→</span></button></div>
}

const panel:React.CSSProperties={background:"#fff",border:"1px solid #e7eaf1",borderRadius:20,padding:20,marginBottom:18};
const metricGrid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginBottom:18};
const metric:React.CSSProperties={background:"#fff",border:"1px solid #e7eaf1",borderRadius:18,padding:18,display:"flex",gap:12,alignItems:"center"};
const metricIcon:React.CSSProperties={width:44,height:44,borderRadius:12,display:"grid",placeItems:"center",background:"#eef2ff",color:"#4f46e5"};
const muted:React.CSSProperties={color:"#667085",margin:0};
const eyebrow:React.CSSProperties={fontSize:12,fontWeight:800,letterSpacing:".12em",color:"#6366f1"};
const cards:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:14,marginTop:18};
const card:React.CSSProperties={background:"#fff",border:"1px solid #e7eaf1",borderRadius:18,padding:16,position:"relative"};
const logo:React.CSSProperties={width:46,height:46,borderRadius:14,display:"grid",placeItems:"center"};
const iconBtn:React.CSSProperties={width:40,height:40,border:0,borderRadius:10,background:"#f8fafc",display:"grid",placeItems:"center"};
const badge:React.CSSProperties={fontSize:12,fontWeight:800,padding:"6px 9px",borderRadius:999,background:"#f2f4f7"};
const small:React.CSSProperties={fontSize:12,color:"#98a2b3",marginTop:3};
const openBtn:React.CSSProperties={width:"100%",border:0,background:"transparent",color:"#4f46e5",fontWeight:800,display:"flex",justifyContent:"space-between",padding:"14px 0 0"};
const searchBox:React.CSSProperties={display:"flex",alignItems:"center",gap:8,border:"1px solid #d0d5dd",borderRadius:12,padding:"0 12px",marginTop:16};
const searchInput:React.CSSProperties={width:"100%",border:0,outline:0,padding:"13px 0",fontSize:16};
const menuBox:React.CSSProperties={position:"absolute",right:0,top:44,zIndex:10,minWidth:180,background:"#fff",border:"1px solid #e7eaf1",borderRadius:14,boxShadow:"0 14px 38px rgba(0,0,0,.14)",padding:7};
const menuBtn:React.CSSProperties={width:"100%",border:0,background:"transparent",display:"flex",gap:8,alignItems:"center",padding:"10px",textAlign:"left"};
const backBtn:React.CSSProperties={border:0,background:"transparent",color:"#4f46e5",display:"flex",gap:8,alignItems:"center",fontWeight:800,marginBottom:18};
