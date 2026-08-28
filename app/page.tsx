"use client";

 

import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

import {

  ArrowLeft, BarChart3, CircleDollarSign, GraduationCap, Loader2,

  LogIn, LogOut, Mail, Plus, ReceiptText, RefreshCw, Search, UserPlus,

  Users, WalletCards, X

} from "lucide-react";

 

const BLANCA_SLUG = "escuela-blanca-nieves";

 

type Org = {

  id: string;

  name: string;

  slug: string;

  industry: string | null;

  plan: string | null;

  status: string | null;

  primary_color: string | null;

  secondary_color: string | null;

};

 

type Customer = {

  id: string;

  org_id: string;

  name: string;

  phone: string | null;

  email: string | null;

  notes: string | null;

  active: boolean;

  created_at: string;

};

 

type Invoice = {

  id: string;

  org_id: string;

  customer_id: string;

  concept: string;

  amount: number;

  due_date: string;

  status: "pending" | "paid" | "cancelled";

  paid_at: string | null;

  created_at: string;

};

 

type Payment = {

  id: string;

  org_id: string;

  invoice_id: string | null;

  customer_id: string;

  amount: number;

  method: string | null;

  reference: string | null;

  paid_at: string;

  created_at: string;

};

 

type Module = "home" | "people" | "fees" | "payments" | "reports";

 

function money(n: number) {

  return new Intl.NumberFormat("es-CL", {

    style: "currency",

    currency: "CLP",

    maximumFractionDigits: 0,

  }).format(n || 0);

}

 

export default function Page() {

  const [sessionReady, setSessionReady] = useState(false);

  const [userEmail, setUserEmail] = useState("");

  const [password, setPassword] = useState("");

  const [authMessage, setAuthMessage] = useState("");

  const [authLoading, setAuthLoading] = useState(false);

  const [loggedIn, setLoggedIn] = useState(false);

 

  const [org, setOrg] = useState<Org | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [payments, setPayments] = useState<Payment[]>([]);

  const [loading, setLoading] = useState(false);

  const [module, setModule] = useState<Module>("home");

  const [search, setSearch] = useState("");

  const [personModal, setPersonModal] = useState(false);

  const [feeModal, setFeeModal] = useState(false);

  const [paymentModal, setPaymentModal] = useState(false);

 

  const [personForm, setPersonForm] = useState({ name: "", phone: "", email: "", notes: "" });

  const [feeForm, setFeeForm] = useState({ customer_id: "", concept: "Cuota mensual", amount: "", due_date: "" });

  const [paymentForm, setPaymentForm] = useState({ customer_id: "", invoice_id: "", amount: "", method: "Transferencia", reference: "" });

 

  useEffect(() => {

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {

      if (!mounted) return;

      setLoggedIn(!!data.session);

      setSessionReady(true);

    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {

      setLoggedIn(!!session);

    });

    return () => {

      mounted = false;

      authSub.subscription.unsubscribe();

    };

  }, []);

 

  useEffect(() => {

    if (!loggedIn) return;

    loadAll();

  }, [loggedIn]);

 

  useEffect(() => {

    if (!org?.id || !loggedIn) return;

 

    const channel = supabase

      .channel(`blanca-nieves-${org.id}`)

      .on("postgres_changes", { event: "*", schema: "public", table: "customers", filter: `org_id=eq.${org.id}` }, loadAll)

      .on("postgres_changes", { event: "*", schema: "public", table: "invoices", filter: `org_id=eq.${org.id}` }, loadAll)

      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `org_id=eq.${org.id}` }, loadAll)

      .subscribe();

 

    return () => {

      supabase.removeChannel(channel);

    };

  }, [org?.id, loggedIn]);

 

  async function signIn(e: React.FormEvent) {

    e.preventDefault();

    setAuthLoading(true);

    setAuthMessage("");

    const { error } = await supabase.auth.signInWithPassword({ email: userEmail, password });

    setAuthLoading(false);

    if (error) setAuthMessage("No se pudo iniciar sesión. Revisa el correo y la contraseña.");

  }

 

  async function sendMagicLink() {

    if (!userEmail.trim()) {

      setAuthMessage("Escribe primero tu correo.");

      return;

    }

    setAuthLoading(true);

    setAuthMessage("");

    const { error } = await supabase.auth.signInWithOtp({

      email: userEmail,

      options: { emailRedirectTo: window.location.origin },

    });

    setAuthLoading(false);

    setAuthMessage(error ? "No se pudo enviar el enlace." : "Enlace de acceso enviado a tu correo.");

  }

 

  async function logout() {

    await supabase.auth.signOut();

    setOrg(null);

    setCustomers([]);

    setInvoices([]);

    setPayments([]);

  }

 

  async function loadAll() {

    setLoading(true);

    const { data: orgData, error: orgError } = await supabase

      .from("organizations")

      .select("id,name,slug,industry,plan,status,primary_color,secondary_color")

      .eq("slug", BLANCA_SLUG)

      .single();

 

    if (orgError || !orgData) {

      setOrg(null);

      setLoading(false);

      return;

    }

 

    setOrg(orgData as Org);

 

    const [c, i, p] = await Promise.all([

      supabase.from("customers").select("*").eq("org_id", orgData.id).order("name"),

      supabase.from("invoices").select("*").eq("org_id", orgData.id).order("due_date", { ascending: false }),

      supabase.from("payments").select("*").eq("org_id", orgData.id).order("paid_at", { ascending: false }),

    ]);

 

    setCustomers((c.data || []) as Customer[]);

    setInvoices((i.data || []) as Invoice[]);

    setPayments((p.data || []) as Payment[]);

    setLoading(false);

  }

 

  async function addPerson(e: React.FormEvent) {

    e.preventDefault();

    if (!org || !personForm.name.trim()) return;

    await supabase.from("customers").insert({

      org_id: org.id,

      name: personForm.name.trim(),

      phone: personForm.phone.trim() || null,

      email: personForm.email.trim() || null,

      notes: personForm.notes.trim() || null,

      active: true,

    });

    setPersonForm({ name: "", phone: "", email: "", notes: "" });

    setPersonModal(false);

    await loadAll();

  }

 

  async function togglePerson(person: Customer) {

    await supabase.from("customers").update({ active: !person.active }).eq("id", person.id);

    await loadAll();

  }

 

  async function addFee(e: React.FormEvent) {

    e.preventDefault();

    if (!org || !feeForm.customer_id || !feeForm.amount || !feeForm.due_date) return;

    await supabase.from("invoices").insert({

      org_id: org.id,

      customer_id: feeForm.customer_id,

      concept: feeForm.concept.trim() || "Cuota mensual",

      amount: Number(feeForm.amount),

      due_date: feeForm.due_date,

      status: "pending",

    });

    setFeeForm({ customer_id: "", concept: "Cuota mensual", amount: "", due_date: "" });

    setFeeModal(false);

    await loadAll();

  }

 

  async function addPayment(e: React.FormEvent) {

    e.preventDefault();

    if (!org || !paymentForm.customer_id || !paymentForm.amount) return;

    const invoiceId = paymentForm.invoice_id || null;

    await supabase.from("payments").insert({

      org_id: org.id,

      customer_id: paymentForm.customer_id,

      invoice_id: invoiceId,

      amount: Number(paymentForm.amount),

      method: paymentForm.method,

      reference: paymentForm.reference.trim() || null,

      paid_at: new Date().toISOString(),

    });

    if (invoiceId) {

      await supabase.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", invoiceId);

    }

    setPaymentForm({ customer_id: "", invoice_id: "", amount: "", method: "Transferencia", reference: "" });

    setPaymentModal(false);

    await loadAll();

  }

 

  const pendingInvoices = invoices.filter((x) => x.status === "pending");

  const paidTotal = payments.reduce((sum, x) => sum + Number(x.amount || 0), 0);

  const pendingTotal = pendingInvoices.reduce((sum, x) => sum + Number(x.amount || 0), 0);

  const overdueInvoices = pendingInvoices.filter((x) => new Date(x.due_date) < new Date());

  const overdueTotal = overdueInvoices.reduce((sum, x) => sum + Number(x.amount || 0), 0);

 

  const filteredCustomers = useMemo(

    () => customers.filter((c) => `${c.name} ${c.phone || ""} ${c.email || ""}`.toLowerCase().includes(search.toLowerCase())),

    [customers, search]

  );

 

  if (!sessionReady) {

    return <Centered><Loader2 className="spin" /> Preparando acceso...</Centered>;

  }

 

  if (!loggedIn) {

    return (

      <main className="authPage">

        <section className="authCard">

          <div className="schoolIcon"><GraduationCap /></div>

          <p className="eyebrow">CUOTAFÁCIL · ACCESO SEGURO</p>

          <h1>Escuela Blanca Nieves</h1>

          <p className="muted">Inicia sesión para ver alumnos, cuotas y pagos reales.</p>

          <form onSubmit={signIn} className="stack">

            <label>Correo<input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required /></label>

            <label>Contraseña<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>

            <button className="primary wide" disabled={authLoading}>{authLoading ? <Loader2 className="spin" size={18} /> : <LogIn size={18} />} Iniciar sesión</button>

          </form>

          <button className="secondary wide" onClick={sendMagicLink} disabled={authLoading}><Mail size={18} /> Enviarme enlace de acceso</button>

          {authMessage && <div className="notice">{authMessage}</div>}

        </section>

      </main>

    );

  }

 

  if (loading && !org) return <Centered><Loader2 className="spin" /> Cargando Escuela Blanca Nieves...</Centered>;

 

  if (!org) {

    return <Centered>No se pudo acceder a Escuela Blanca Nieves. Cierra sesión y vuelve a entrar.</Centered>;

  }

 

  return (

    <main className="realApp">

      <header className="realTopbar">

        <div>

          <p className="eyebrow">ORGANIZACIÓN REAL · SUPABASE</p>

          <h1>{org.name}</h1>

          <p className="muted">Datos sincronizados en tiempo real.</p>

        </div>

        <div className="topActions">

          <button className="secondary" onClick={loadAll}><RefreshCw size={17} /> Actualizar</button>

          <button className="secondary" onClick={logout}><LogOut size={17} /> Salir</button>

        </div>

      </header>

 

      {module !== "home" && <button className="backButton" onClick={() => setModule("home")}><ArrowLeft size={18} /> Volver al resumen</button>}

 

      {module === "home" && <>

        <div className="metrics">

          <Metric label="Personas / Alumnos" value={String(customers.filter((c) => c.active).length)} icon={<Users />} />

          <Metric label="Recaudación registrada" value={money(paidTotal)} icon={<CircleDollarSign />} />

          <Metric label="Cuotas pendientes" value={String(pendingInvoices.length)} icon={<ReceiptText />} />

          <Metric label="Monto vencido" value={money(overdueTotal)} icon={<WalletCards />} />

        </div>

 

        <section className="panel">

          <h2>Gestión de {org.name}</h2>

          <p className="muted">Estos módulos ya trabajan con la base real de la organización.</p>

          <div className="moduleGrid">

            <ModuleCard title="Personas / Alumnos" text={`${customers.length} registros reales`} icon={<Users />} onClick={() => setModule("people")} />

            <ModuleCard title="Cuotas" text={`${pendingInvoices.length} pendientes`} icon={<ReceiptText />} onClick={() => setModule("fees")} />

            <ModuleCard title="Pagos" text={money(paidTotal)} icon={<WalletCards />} onClick={() => setModule("payments")} />

            <ModuleCard title="Reportes" text="Resumen actualizado" icon={<BarChart3 />} onClick={() => setModule("reports")} />

          </div>

        </section>

      </>}

 

      {module === "people" && <section className="panel">

        <div className="sectionHead">

          <div><h2>Personas / Alumnos</h2><p className="muted">Registros reales de Escuela Blanca Nieves.</p></div>

          <button className="primary" onClick={() => setPersonModal(true)}><UserPlus size={18} /> Agregar</button>

        </div>

        <div className="searchBox"><Search size={18} /><input placeholder="Buscar por nombre, teléfono o correo..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>

        <div className="tableWrap"><table><thead><tr><th>Nombre</th><th>Contacto</th><th>Estado</th><th></th></tr></thead><tbody>

          {filteredCustomers.length === 0 ? <tr><td colSpan={4}>Aún no hay alumnos registrados.</td></tr> : filteredCustomers.map((p) => <tr key={p.id}><td><strong>{p.name}</strong><small>{p.notes || "Sin observaciones"}</small></td><td>{p.phone || p.email || "Sin contacto"}</td><td><span className={p.active ? "badge active" : "badge inactive"}>{p.active ? "Activo" : "Inactivo"}</span></td><td><button className="linkButton" onClick={() => togglePerson(p)}>{p.active ? "Desactivar" : "Activar"}</button></td></tr>)}

        </tbody></table></div>

      </section>}

 

      {module === "fees" && <section className="panel">

        <div className="sectionHead"><div><h2>Cuotas</h2><p className="muted">Cargos reales asociados a cada alumno.</p></div><button className="primary" onClick={() => setFeeModal(true)}><Plus size={18}/> Nueva cuota</button></div>

        <div className="tableWrap"><table><thead><tr><th>Alumno</th><th>Concepto</th><th>Monto</th><th>Vence</th><th>Estado</th></tr></thead><tbody>

          {invoices.length === 0 ? <tr><td colSpan={5}>Aún no hay cuotas registradas.</td></tr> : invoices.map((i) => <tr key={i.id}><td>{customers.find((c) => c.id === i.customer_id)?.name || "Alumno"}</td><td>{i.concept}</td><td>{money(i.amount)}</td><td>{i.due_date}</td><td><span className={`badge ${i.status}`}>{i.status === "paid" ? "Pagada" : i.status === "cancelled" ? "Cancelada" : "Pendiente"}</span></td></tr>)}

        </tbody></table></div>

      </section>}

 

      {module === "payments" && <section className="panel">

        <div className="sectionHead"><div><h2>Pagos</h2><p className="muted">Historial real de pagos registrados.</p></div><button className="primary" onClick={() => setPaymentModal(true)}><Plus size={18}/> Registrar pago</button></div>

        <div className="tableWrap"><table><thead><tr><th>Alumno</th><th>Monto</th><th>Método</th><th>Fecha</th></tr></thead><tbody>

          {payments.length === 0 ? <tr><td colSpan={4}>Aún no hay pagos registrados.</td></tr> : payments.map((p) => <tr key={p.id}><td>{customers.find((c) => c.id === p.customer_id)?.name || "Alumno"}</td><td>{money(p.amount)}</td><td>{p.method || "-"}</td><td>{new Date(p.paid_at).toLocaleDateString("es-CL")}</td></tr>)}

        </tbody></table></div>

      </section>}

 

      {module === "reports" && <section className="panel">

        <h2>Reportes</h2><p className="muted">Resumen calculado directamente desde los datos reales.</p>

        <div className="metrics reportMetrics">

          <Metric label="Alumnos activos" value={String(customers.filter((c) => c.active).length)} icon={<Users />} />

          <Metric label="Total pagado" value={money(paidTotal)} icon={<CircleDollarSign />} />

          <Metric label="Total pendiente" value={money(pendingTotal)} icon={<ReceiptText />} />

          <Metric label="Vencido" value={money(overdueTotal)} icon={<WalletCards />} />

        </div>

      </section>}

 

      {personModal && <Modal title="Agregar persona / alumno" onClose={() => setPersonModal(false)}><form onSubmit={addPerson} className="stack"><label>Nombre completo<input value={personForm.name} onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })} required /></label><label>Teléfono<input value={personForm.phone} onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })} /></label><label>Correo<input type="email" value={personForm.email} onChange={(e) => setPersonForm({ ...personForm, email: e.target.value })} /></label><label>Observaciones<textarea value={personForm.notes} onChange={(e) => setPersonForm({ ...personForm, notes: e.target.value })} /></label><button className="primary wide">Guardar alumno</button></form></Modal>}

 

      {feeModal && <Modal title="Nueva cuota" onClose={() => setFeeModal(false)}><form onSubmit={addFee} className="stack"><label>Alumno<select value={feeForm.customer_id} onChange={(e) => setFeeForm({ ...feeForm, customer_id: e.target.value })} required><option value="">Seleccionar...</option>{customers.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Concepto<input value={feeForm.concept} onChange={(e) => setFeeForm({ ...feeForm, concept: e.target.value })} /></label><label>Monto<input type="number" min="1" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} required /></label><label>Fecha de vencimiento<input type="date" value={feeForm.due_date} onChange={(e) => setFeeForm({ ...feeForm, due_date: e.target.value })} required /></label><button className="primary wide">Crear cuota</button></form></Modal>}

 

      {paymentModal && <Modal title="Registrar pago" onClose={() => setPaymentModal(false)}><form onSubmit={addPayment} className="stack"><label>Alumno<select value={paymentForm.customer_id} onChange={(e) => setPaymentForm({ ...paymentForm, customer_id: e.target.value, invoice_id: "" })} required><option value="">Seleccionar...</option>{customers.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Cuota asociada<select value={paymentForm.invoice_id} onChange={(e) => setPaymentForm({ ...paymentForm, invoice_id: e.target.value })}><option value="">Pago sin cuota específica</option>{pendingInvoices.filter((i) => !paymentForm.customer_id || i.customer_id === paymentForm.customer_id).map((i) => <option key={i.id} value={i.id}>{i.concept} · {money(i.amount)}</option>)}</select></label><label>Monto<input type="number" min="1" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required /></label><label>Método<select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}><option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option><option>Otro</option></select></label><label>Referencia<input value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} /></label><button className="primary wide">Guardar pago</button></form></Modal>}

    </main>

  );

}

 

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {

  return <article className="metric"><div className="metricIcon">{icon}</div><div><p>{label}</p><strong>{value}</strong></div></article>;

}

 

function ModuleCard({ title, text, icon, onClick }: { title: string; text: string; icon: React.ReactNode; onClick: () => void }) {

  return <button className="moduleCard" onClick={onClick}><div className="metricIcon">{icon}</div><h3>{title}</h3><p>{text}</p><span>Abrir →</span></button>;

}

 

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {

  return <div className="modalBack" onMouseDown={onClose}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="modalHead"><h2>{title}</h2><button className="iconBtn" onClick={onClose}><X /></button></div>{children}</div></div>;

}

 

function Centered({ children }: { children: React.ReactNode }) {

  return <main className="centered"><div className="notice">{children}</div></main>;

}
