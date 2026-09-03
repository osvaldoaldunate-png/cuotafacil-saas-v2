"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";

type Role = "loading" | "admin" | "client" | "none";
type ClientModule =
  | "home"
  | "students"
  | "payments"
  | "submissions"
  | "summary";

type Organization = {
  id: string;
  name: string;
  slug: string;
};

type Membership = {
  org_id: string;
  role: string;
};

type Student = {
  id: number;
  student: string;
  guardian: string | null;
  phone: string | null;
  course: string | null;
  amount: number | null;
  notes: string | null;
};

type Payment = {
  id: number;
  student_id: number;
  year: number;
  month: string;
  paid: boolean;
  paid_date: string | null;
};

type Submission = {
  id: number;
  student_id: number;
  year: number;
  months: string[] | string | null;
  amount: number | null;
  status: string | null;
  receipt_path: string | null;
};

function money(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function Page() {
  const [sessionReady, setSessionReady] = useState(false);
  const [role, setRole] = useState<Role>("loading");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [recoveryMode, setRecoveryMode] = useState(false);
const [newPassword, setNewPassword] = useState("");

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [loadingData, setLoadingData] = useState(false);
  const [module, setModule] = useState<ClientModule>("home");
  const [adminOrganizationView, setAdminOrganizationView] = useState(false);
  const [search, setSearch] = useState("");
  const [showStudentForm, setShowStudentForm] = useState(false);

const [studentForm, setStudentForm] = useState({
  student: "",
  guardian: "",
  phone: "",
  course: "",
  amount: "",
  notes: "",
});

useEffect(() => {
  let mounted = true;

  async function initializeAuth() {
    try {
      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
      );

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      // 1. Procesar explícitamente tokens enviados por Supabase
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!mounted) return;

        if (error) {
          console.error("SET SESSION ERROR:", error);
          setRole("none");
          setSessionReady(true);
          setMessage(`No se pudo validar el enlace: ${error.message}`);
          return;
        }

        // Limpiar los tokens sensibles de la barra del navegador
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        // Si es recuperación de contraseña
        if (type === "recovery") {
          setRecoveryMode(true);
          setRole("none");
          setSessionReady(true);
          return;
        }

        // Si es Magic Link u otro acceso válido
        if (data.session?.user) {
          await resolveAccess(data.session.user.id);

          if (mounted) {
            setSessionReady(true);
          }

          return;
        }
      }

      // 2. Revisar si ya existe una sesión guardada
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session?.user) {
        await resolveAccess(session.user.id);
      } else {
        setRole("none");
      }

      if (mounted) {
        setSessionReady(true);
      }
    } catch (error) {
      console.error("AUTH INITIALIZATION ERROR:", error);

      if (mounted) {
        setRole("none");
        setSessionReady(true);
        setMessage("No se pudo iniciar la sesión. Intenta nuevamente.");
      }
    }
  }

  initializeAuth();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (!mounted) return;

    if (event === "PASSWORD_RECOVERY") {
      setRecoveryMode(true);
      setRole("none");
      setSessionReady(true);
      return;
    }

    if (event === "SIGNED_OUT") {
      setRole("none");
      setRecoveryMode(false);
      clearData();
      setSessionReady(true);
      return;
    }

    if (event === "SIGNED_IN" && session?.user) {
      setTimeout(() => {
        resolveAccess(session.user.id).finally(() => {
          if (mounted) {
            setSessionReady(true);
          }
        });
      }, 0);
    }
  });

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []); 
  
  async function resolveAccess(userId: string) {
    setRole("loading");
    setMessage("");

    const { data: adminData, error: adminError } = await supabase
  .from("platform_admins")
  .select("user_id")
  .eq("user_id", userId)
  .maybeSingle();

console.log("CUOTAFACIL ACCESS DEBUG", {
  authUserId: userId,
  adminData,
  adminError,
});

if (adminError) {
  console.error("PLATFORM ADMIN ERROR:", adminError);
  setRole("none");
  setMessage(`Error verificando administrador: ${adminError.message}`);
  return;
}

if (adminData) {
  setRole("admin");
  await loadMasterPanel();
  return;
}

    const { data: membershipData, error: membershipError } = await supabase
      .from("memberships")
      .select("org_id,role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membershipData) {
      setRole("none");
      setMessage("Tu usuario existe, pero todavía no tiene una organización asignada.");
      return;
    }

    const membership = membershipData as Membership;

    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("id,name,slug")
      .eq("id", membership.org_id)
      .single();

    if (orgError || !orgData) {
      setRole("none");
      setMessage("No se pudo encontrar la organización asociada a este usuario.");
      return;
    }

    setOrganization(orgData as Organization);
    setRole("client");
    await loadBlancaNieves();
  }
async function changePassword(e: React.FormEvent) {
  e.preventDefault();
  setAuthLoading(true);
  setMessage("");

  if (newPassword.length < 8) {
    setMessage("La nueva contraseña debe tener al menos 8 caracteres.");
    setAuthLoading(false);
    return;
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    setMessage(`No se pudo cambiar la contraseña: ${error.message}`);
    setAuthLoading(false);
    return;
  }

  setMessage("Contraseña actualizada correctamente.");
  setRecoveryMode(false);
  setNewPassword("");
  await supabase.auth.signOut();
  setRole("none");
  setAuthLoading(false);
}
  async function requestPasswordReset() {
  setMessage("");

  const cleanEmail = email.trim();

  if (!cleanEmail) {
    setMessage("Primero ingresa tu correo electrónico.");
    return;
  }

  setAuthLoading(true);

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: "https://cuotafacil-saas-v2.vercel.app",
  });

  if (error) {
    console.error("PASSWORD RESET ERROR:", error);
    setMessage(`No se pudo enviar el correo: ${error.message}`);
    setAuthLoading(false);
    return;
  }

  setMessage(
    "Te enviamos un correo para crear una nueva contraseña. Revisa también Spam."
  );
  setAuthLoading(false);
}
  async function signIn(e: React.FormEvent) {
  e.preventDefault();
  setAuthLoading(true);
  setMessage("");

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    console.error("SUPABASE LOGIN ERROR:", error);
    setMessage(`Error de acceso: ${error.message}`);
  }

  setAuthLoading(false);
}

  async function logout() {
    await supabase.auth.signOut();
    clearData();
    setRole("none");
    setPassword("");
  }

  function clearData() {
    setOrganization(null);
    setOrganizations([]);
    setStudents([]);
    setPayments([]);
    setSubmissions([]);
    setModule("home");
  }

  async function loadMasterPanel() {
    setLoadingData(true);

    const { data } = await supabase
      .from("organizations")
      .select("id,name,slug")
      .order("name");

    setOrganizations((data || []) as Organization[]);

    await loadBlancaNieves(false);
    setLoadingData(false);
  }

  async function loadBlancaNieves(showLoader = true) {
    if (showLoader) setLoadingData(true);

    const [studentsResult, paymentsResult, submissionsResult] =
      await Promise.all([
        supabase.from("students").select("*").order("student"),
        supabase.from("payments").select("*").order("id", { ascending: false }),
        supabase
          .from("payment_submissions")
          .select("*")
          .order("id", { ascending: false }),
      ]);

    setStudents((studentsResult.data || []) as Student[]);
    setPayments((paymentsResult.data || []) as Payment[]);
    setSubmissions((submissionsResult.data || []) as Submission[]);

    if (showLoader) setLoadingData(false);
  }
async function saveStudent() {
  if (!studentForm.student.trim()) {
    setMessage("Debes ingresar el nombre del alumno.");
    return;
  }

  setLoadingData(true);
  setMessage("");

  const { error } = await supabase.from("students").insert({
    student: studentForm.student.trim(),
    guardian: studentForm.guardian.trim() || null,
    phone: studentForm.phone.trim() || null,
    course: studentForm.course.trim() || null,
    amount: studentForm.amount ? Number(studentForm.amount) : 0,
    notes: studentForm.notes.trim() || null,
  });

  if (error) {
    console.error("SAVE STUDENT ERROR:", error);
    setMessage(`No se pudo guardar el alumno: ${error.message}`);
    setLoadingData(false);
    return;
  }

  setStudentForm({
    student: "",
    guardian: "",
    phone: "",
    course: "",
    amount: "",
    notes: "",
  });

  setShowStudentForm(false);

  await loadBlancaNieves(false);

  setMessage("Alumno agregado correctamente.");
  setLoadingData(false);
}
  const totalExpected = useMemo(
    () => students.reduce((sum, s) => sum + Number(s.amount || 0), 0),
    [students]
  );

  const paidCount = useMemo(
    () => payments.filter((p) => p.paid).length,
    [payments]
  );

  const approvedSubmissions = useMemo(
    () => submissions.filter((s) => s.status === "approved").length,
    [submissions]
  );

  const pendingSubmissions = useMemo(
    () =>
      submissions.filter(
        (s) => s.status !== "approved" && s.status !== "rejected"
      ).length,
    [submissions]
  );

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;

    return students.filter((s) =>
      `${s.student} ${s.guardian || ""} ${s.phone || ""} ${s.course || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [students, search]);

  if (!recoveryMode && (!sessionReady || role === "loading")) {
    return (
      <Centered>
        <Loader2 className="spin" size={28} />
        Preparando CuotaFácil...
      </Centered>
    );
  }
if (recoveryMode) {
  return (
    <main style={styles.authPage}>
      <section style={styles.authCard}>
        <div style={styles.authIcon}>
          <ShieldCheck size={30} />
        </div>

        <p style={styles.eyebrow}>CUOTAFÁCIL · RECUPERACIÓN DE ACCESO</p>

        <h1 style={styles.authTitle}>Crear nueva contraseña</h1>

        <p style={styles.muted}>
          Escribe una contraseña nueva para tu cuenta de CuotaFácil.
        </p>

        <form onSubmit={changePassword} style={styles.form}>
          <label style={styles.label}>
            Nueva contraseña
            <input
              style={styles.input}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
            />
          </label>

          <button style={styles.primaryButton} disabled={authLoading}>
            {authLoading ? (
              <Loader2 className="spin" size={18} />
            ) : (
              <ShieldCheck size={18} />
            )}
            Guardar nueva contraseña
          </button>
        </form>

        {message && <div style={styles.notice}>{message}</div>}
      </section>
    </main>
  );
}
  if (role === "none") {
    return (
      <main style={styles.authPage}>
        <section style={styles.authCard}>
          <div style={styles.authIcon}>
            <GraduationCap size={30} />
          </div>

          <p style={styles.eyebrow}>CUOTAFÁCIL · ACCESO SEGURO</p>

          <h1 style={styles.authTitle}>Bienvenido a CuotaFácil</h1>

          <p style={styles.muted}>
            Ingresa con tu cuenta. El sistema abrirá automáticamente el panel
            que corresponde a tu perfil.
          </p>

          <form onSubmit={signIn} style={styles.form}>
            <label style={styles.label}>
              Correo electrónico
              <input
                style={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.cl"
                required
              />
            </label>

            <label style={styles.label}>
              Contraseña
              <input
                style={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            <button style={styles.primaryButton} disabled={authLoading}>
              {authLoading ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <LogIn size={18} />
              )}
              Iniciar sesión
            </button>
            <button
  type="button"
  onClick={requestPasswordReset}
  disabled={authLoading}
  style={{
    border: "none",
    background: "transparent",
    color: "#5b4df7",
    fontWeight: 700,
    cursor: authLoading ? "not-allowed" : "pointer",
    padding: "10px 0 2px",
    fontSize: 14,
  }}
>
  ¿Olvidaste tu contraseña?
</button>
          </form>

          {message && <div style={styles.notice}>{message}</div>}

          <div style={styles.securityBox}>
            <ShieldCheck size={20} />
            <span>Acceso protegido mediante Supabase Auth</span>
          </div>
        </section>
      </main>
    );
  }

  if (role === "admin" && adminOrganizationView) {
  return (
    <main style={styles.app}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>ADMINISTRACIÓN DE ORGANIZACIÓN</p>

          <h1 style={styles.title}>
            {organization?.name || "Escuela Blanca Nieves"}
          </h1>

          <p style={styles.muted}>
            Vista administrativa desde el Panel Maestro de CuotaFácil.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button
            style={styles.secondaryButton}
            onClick={() => {
              setAdminOrganizationView(false);
              setOrganization(null);
              setModule("home");
            }}
          >
            <ArrowLeft size={17} />
            Volver al Panel Maestro
          </button>

          <button
            style={styles.secondaryButton}
            onClick={() => loadBlancaNieves()}
          >
            <RefreshCw size={17} />
            Actualizar
          </button>

          <button style={styles.secondaryButton} onClick={logout}>
            <LogOut size={17} />
            Salir
          </button>
        </div>
      </header>

      {module !== "home" && module !== "summary" && (
  <button
    style={styles.backButton}
    onClick={() => setModule("home")}
  >
    <ArrowLeft size={18} />
    Volver al resumen
  </button>
)}

      {module === "home" && (
        <>
          <section style={styles.metricGrid}>
            <MetricCard
              icon={<Users />}
              label="Alumnos"
              value={String(students.length)}
            />

            <MetricCard
              icon={<CheckCircle2 />}
              label="Pagos registrados"
              value={String(paidCount)}
            />

            <MetricCard
              icon={<ReceiptText />}
              label="Comprobantes"
              value={String(submissions.length)}
            />

            <MetricCard
              icon={<CircleDollarSign />}
              label="Monto mensual base"
              value={money(totalExpected)}
            />
          </section>

          <section style={styles.panel}>
            <h2 style={styles.sectionTitle}>Gestión de Blanca Nieves</h2>

            <p style={styles.muted}>
              Selecciona el módulo que deseas administrar.
            </p>

            <div style={styles.moduleGrid}>
              <ModuleButton
                icon={<Users />}
                title="Alumnos"
                text={`${students.length} registros`}
                onClick={() => setModule("students")}
              />

              <ModuleButton
                icon={<WalletCards />}
                title="Pagos"
                text={`${paidCount} pagos registrados`}
                onClick={() => setModule("payments")}
              />

              <ModuleButton
                icon={<ReceiptText />}
                title="Comprobantes"
                text={`${submissions.length} solicitudes`}
                onClick={() => setModule("submissions")}
              />

              <ModuleButton
                icon={<LayoutDashboard />}
                title="Resumen"
                text={`${approvedSubmissions} aprobados`}
                onClick={() => setModule("summary")}
              />
            </div>
          </section>
        </>
      )}

      {module === "summary" && (
  <section style={styles.panel}>
    <h2 style={styles.sectionTitle}>Resumen general</h2>
    <p style={styles.muted}>
      Estado general de la organización.
    </p>

    <div style={{ ...styles.metricGrid, marginTop: 20 }}>
      <SmallMetric label="Alumnos" value={String(students.length)} />
      <SmallMetric label="Pagos registrados" value={String(paidCount)} />
      <SmallMetric
        label="Comprobantes aprobados"
        value={String(approvedSubmissions)}
      />
      <SmallMetric
        label="Comprobantes pendientes"
        value={String(pendingSubmissions)}
      />
      <SmallMetric
        label="Monto mensual base"
        value={money(totalExpected)}
      />
      <SmallMetric
        label="Comprobantes totales"
        value={String(submissions.length)}
      />
    </div>
  </section>
)}
      {module === "students" && (
  <section style={styles.panel}>
    <div style={styles.panelHeader}>
      <div>
        <h2 style={styles.sectionTitle}>Alumnos</h2>
        <p style={styles.muted}>
          Información real almacenada en la tabla students.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          style={styles.primaryButton}
          onClick={() => setShowStudentForm(true)}
        >
          + Agregar alumno
        </button>

        <div style={styles.searchBox}>
          <Search size={18} />
          <input
            style={styles.searchInput}
            placeholder="Buscar alumno, apoderado o curso..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
    </div>
{showStudentForm && (
  <div
    style={{
      marginTop: 20,
      marginBottom: 20,
      padding: 20,
      border: "1px solid #e4e7ec",
      borderRadius: 16,
      background: "#f9fafb",
    }}
  >
    <h3 style={{ marginTop: 0, marginBottom: 16 }}>
      Nuevo alumno
    </h3>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: 14,
      }}
    >
      <label style={styles.label}>
        Nombre del alumno
        <input
          style={styles.input}
          value={studentForm.student}
          onChange={(e) =>
            setStudentForm({
              ...studentForm,
              student: e.target.value,
            })
          }
          placeholder="Nombre completo"
        />
      </label>

      <label style={styles.label}>
        Apoderado
        <input
          style={styles.input}
          value={studentForm.guardian}
          onChange={(e) =>
            setStudentForm({
              ...studentForm,
              guardian: e.target.value,
            })
          }
          placeholder="Nombre del apoderado"
        />
      </label>

      <label style={styles.label}>
        Teléfono
        <input
          style={styles.input}
          value={studentForm.phone}
          onChange={(e) =>
            setStudentForm({
              ...studentForm,
              phone: e.target.value,
            })
          }
          placeholder="+56 9..."
        />
      </label>

      <label style={styles.label}>
        Curso
        <input
          style={styles.input}
          value={studentForm.course}
          onChange={(e) =>
            setStudentForm({
              ...studentForm,
              course: e.target.value,
            })
          }
          placeholder="Ej: Medio Mayor A"
        />
      </label>

      <label style={styles.label}>
        Monto mensual
        <input
          style={styles.input}
          type="number"
          value={studentForm.amount}
          onChange={(e) =>
            setStudentForm({
              ...studentForm,
              amount: e.target.value,
            })
          }
          placeholder="Ej: 25000"
        />
      </label>

      <label style={styles.label}>
        Observaciones
        <input
          style={styles.input}
          value={studentForm.notes}
          onChange={(e) =>
            setStudentForm({
              ...studentForm,
              notes: e.target.value,
            })
          }
          placeholder="Opcional"
        />
      </label>
    </div>

    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 18,
      }}
    >
      <button
        type="button"
        style={styles.secondaryButton}
        onClick={() => setShowStudentForm(false)}
      >
        Cancelar
      </button>

      <button
        type="button"
        style={styles.primaryButton}
        onClick={saveStudent}
      >
        Guardar alumno
      </button>
    </div>
  </div>
)}
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Alumno</th>
            <th style={styles.th}>Apoderado</th>
            <th style={styles.th}>Teléfono</th>
            <th style={styles.th}>Curso</th>
            <th style={styles.th}>Monto</th>
          </tr>
        </thead>

        <tbody>
          {filteredStudents.map((student) => (
            <tr key={student.id}>
              <td style={styles.td}>
                <strong>{student.student}</strong>
              </td>
              <td style={styles.td}>{student.guardian || "—"}</td>
              <td style={styles.td}>{student.phone || "—"}</td>
              <td style={styles.td}>{student.course || "—"}</td>
              <td style={styles.td}>
                {money(Number(student.amount || 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
)}
      {module === "payments" && (
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Pagos registrados</h2>

          <p style={styles.muted}>
            Mensualidades almacenadas en la tabla payments.
          </p>

          <div style={{ ...styles.tableWrap, marginTop: 18 }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Alumno</th>
                  <th style={styles.th}>Año</th>
                  <th style={styles.th}>Mes</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Fecha pago</th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => {
                  const student = students.find(
                    (s) => s.id === payment.student_id
                  );

                  return (
                    <tr key={payment.id}>
                      <td style={styles.td}>
                        {student?.student || `Alumno #${payment.student_id}`}
                      </td>
                      <td style={styles.td}>{payment.year}</td>
                      <td style={styles.td}>{payment.month}</td>
                      <td style={styles.td}>
                        <span
                          style={
                            payment.paid
                              ? styles.approvedChip
                              : styles.pendingChip
                          }
                        >
                          {payment.paid ? "Pagado" : "Pendiente"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {payment.paid_date || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {module === "submissions" && (
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Comprobantes enviados</h2>

          <p style={styles.muted}>
            Solicitudes almacenadas en payment_submissions.
          </p>

          <div style={{ ...styles.tableWrap, marginTop: 18 }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Alumno</th>
                  <th style={styles.th}>Año</th>
                  <th style={styles.th}>Meses</th>
                  <th style={styles.th}>Monto</th>
                  <th style={styles.th}>Estado</th>
                </tr>
              </thead>

              <tbody>
                {submissions.map((submission) => {
                  const student = students.find(
                    (s) => s.id === submission.student_id
                  );

                  return (
                    <tr key={submission.id}>
                      <td style={styles.td}>
                        {student?.student ||
                          `Alumno #${submission.student_id}`}
                      </td>
                      <td style={styles.td}>{submission.year}</td>
                      <td style={styles.td}>
                        {Array.isArray(submission.months)
                          ? submission.months.join(", ")
                          : String(submission.months || "—")
                              .replaceAll("[", "")
                              .replaceAll("]", "")
                              .replaceAll('"', "")}
                      </td>
                      <td style={styles.td}>
                        {money(Number(submission.amount || 0))}
                      </td>
                      <td style={styles.td}>
                        <StatusChip status={submission.status || "pending"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {loadingData && (
        <div style={styles.loadingOverlay}>
          <Loader2 className="spin" />
          Actualizando información...
        </div>
      )}
    </main>
  );
}
  if (role === "admin") {
    return (
      <main style={styles.app}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>PANEL MAESTRO · CUOTAFÁCIL</p>
            <h1 style={styles.title}>Tu plataforma, todos tus clientes.</h1>
            <p style={styles.muted}>
              Administración general de organizaciones y operaciones.
            </p>
          </div>

          <div style={styles.headerActions}>
            <button style={styles.secondaryButton} onClick={loadMasterPanel}>
              <RefreshCw size={17} />
              Actualizar
            </button>

            <button style={styles.secondaryButton} onClick={logout}>
              <LogOut size={17} />
              Salir
            </button>
          </div>
        </header>

        <section style={styles.metricGrid}>
          <MetricCard
            icon={<Building2 />}
            label="Organizaciones"
            value={String(organizations.length)}
          />
          <MetricCard
            icon={<Users />}
            label="Personas registradas"
            value={String(students.length)}
          />
          <MetricCard
            icon={<WalletCards />}
            label="Pagos registrados"
            value={String(paidCount)}
          />
          <MetricCard
            icon={<ReceiptText />}
            label="Comprobantes aprobados"
            value={String(approvedSubmissions)}
          />
        </section>

        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Organizaciones</h2>
              <p style={styles.muted}>
                Clientes vinculados actualmente a CuotaFácil.
              </p>
            </div>
          </div>

          {loadingData ? (
            <div style={styles.loading}>
              <Loader2 className="spin" />
              Actualizando...
            </div>
          ) : (
            <div style={styles.orgGrid}>
              {organizations.map((org) => (
                <article key={org.id} style={styles.orgCard}>
                  <div style={styles.orgIcon}>
                    <GraduationCap />
                  </div>

                  <h3 style={{ margin: "16px 0 5px" }}>{org.name}</h3>

                  <p style={styles.muted}>Organización activa</p>

                  <div style={styles.chips}>
                    <span style={styles.activeChip}>Activo</span>
                    <span style={styles.planChip}>Cliente</span>
                  </div>

                  {org.slug === "blanca-nieves" && (
                    <div style={styles.orgStats}>
                      <div>
                        <strong>{students.length}</strong>
                        <small> alumnos</small>
                      </div>
                      <div>
                        <strong>{paidCount}</strong>
                        <small> pagos</small>
                      </div>
                    </div>
                  )}

                  <button
  style={styles.openButton}
  onClick={() => {
    setOrganization(org);
    setModule("home");
    setAdminOrganizationView(true);

    if (org.slug === "blanca-nieves") {
      loadBlancaNieves();
    }
  }}
>
  Ver organización →
</button>
                </article>
              ))}

              {organizations.length === 0 && (
                <p style={styles.muted}>Todavía no hay organizaciones.</p>
              )}
            </div>
          )}
        </section>

        <section style={{ ...styles.panel, marginTop: 20 }}>
          <h2 style={styles.sectionTitle}>Resumen Blanca Nieves</h2>
          <p style={styles.muted}>
            Primera organización real conectada a la plataforma.
          </p>

          <div style={{ ...styles.metricGrid, marginTop: 18 }}>
            <SmallMetric label="Alumnos" value={String(students.length)} />
            <SmallMetric label="Pagos" value={String(paidCount)} />
            <SmallMetric
              label="Comprobantes"
              value={String(submissions.length)}
            />
            <SmallMetric
              label="Monto base"
              value={money(totalExpected)}
            />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.app}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>PANEL DE ORGANIZACIÓN</p>
          <h1 style={styles.title}>
            {organization?.name || "Escuela Blanca Nieves"}
          </h1>
          <p style={styles.muted}>
            Datos reales sincronizados con Supabase.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button
            style={styles.secondaryButton}
            onClick={() => loadBlancaNieves()}
          >
            <RefreshCw size={17} />
            Actualizar
          </button>

          <button style={styles.secondaryButton} onClick={logout}>
            <LogOut size={17} />
            Salir
          </button>
        </div>
      </header>

      {module !== "home" && module !== "summary" && (
        <button
          style={styles.backButton}
          onClick={() => setModule("home")}
        >
          <ArrowLeft size={18} />
          Volver al resumen
        </button>
      )}

      {module === "home" && (
        <>
          <section style={styles.metricGrid}>
            <MetricCard
              icon={<Users />}
              label="Alumnos"
              value={String(students.length)}
            />
            <MetricCard
              icon={<CheckCircle2 />}
              label="Pagos registrados"
              value={String(paidCount)}
            />
            <MetricCard
              icon={<ReceiptText />}
              label="Comprobantes"
              value={String(submissions.length)}
            />
            <MetricCard
              icon={<CircleDollarSign />}
              label="Monto mensual base"
              value={money(totalExpected)}
            />
          </section>

          <section style={styles.panel}>
            <h2 style={styles.sectionTitle}>Gestión de Blanca Nieves</h2>
            <p style={styles.muted}>
              Selecciona el módulo que deseas revisar.
            </p>

            <div style={styles.moduleGrid}>
              <ModuleButton
                icon={<Users />}
                title="Alumnos"
                text={`${students.length} registros`}
                onClick={() => setModule("students")}
              />
              <ModuleButton
                icon={<WalletCards />}
                title="Pagos"
                text={`${paidCount} pagos registrados`}
                onClick={() => setModule("payments")}
              />
              <ModuleButton
                icon={<ReceiptText />}
                title="Comprobantes"
                text={`${submissions.length} solicitudes`}
                onClick={() => setModule("submissions")}
              />
              <ModuleButton
  icon={<LayoutDashboard />}
  title="Resumen"
  text={`${approvedSubmissions} aprobados`}
  onClick={() => setModule("summary")}
/>
            </div>
          </section>
        </>
      )}

      {module === "summary" && (
  <section style={styles.panel}>
    <h2 style={styles.sectionTitle}>Resumen general</h2>

    <p style={styles.muted}>
      Estado general de la organización.
    </p>

    <div style={{ ...styles.metricGrid, marginTop: 20 }}>
      <SmallMetric label="Alumnos" value={String(students.length)} />
      <SmallMetric label="Pagos registrados" value={String(paidCount)} />
      <SmallMetric
        label="Comprobantes aprobados"
        value={String(approvedSubmissions)}
      />
      <SmallMetric
        label="Comprobantes pendientes"
        value={String(pendingSubmissions)}
      />
      <SmallMetric
        label="Monto mensual base"
        value={money(totalExpected)}
      />
      <SmallMetric
        label="Comprobantes totales"
        value={String(submissions.length)}
      />
    </div>
  </section>
)}
      {module === "students" && (
  <section style={styles.panel}>
    <div style={styles.panelHeader}>
      <div>
        <h2 style={styles.sectionTitle}>Alumnos</h2>
        <p style={styles.muted}>
          Información real almacenada en la tabla students.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          style={styles.primaryButton}
          onClick={() => setShowStudentForm(true)}
        >
          + Agregar alumno
        </button>

        <div style={styles.searchBox}>
          <Search size={18} />
          <input
            style={styles.searchInput}
            placeholder="Buscar alumno, apoderado o curso..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
    </div>

    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Alumno</th>
            <th style={styles.th}>Apoderado</th>
            <th style={styles.th}>Teléfono</th>
            <th style={styles.th}>Curso</th>
            <th style={styles.th}>Monto</th>
          </tr>
        </thead>

        <tbody>
          {filteredStudents.map((student) => (
            <tr key={student.id}>
              <td style={styles.td}>
                <strong>{student.student}</strong>
              </td>
              <td style={styles.td}>{student.guardian || "—"}</td>
              <td style={styles.td}>{student.phone || "—"}</td>
              <td style={styles.td}>{student.course || "—"}</td>
              <td style={styles.td}>
                {money(Number(student.amount || 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
)}
      {module === "payments" && (
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Pagos registrados</h2>
          <p style={styles.muted}>
            Mensualidades almacenadas en la tabla payments.
          </p>

          <div style={{ ...styles.tableWrap, marginTop: 18 }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Alumno</th>
                  <th style={styles.th}>Año</th>
                  <th style={styles.th}>Mes</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Fecha pago</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const student = students.find(
                    (s) => s.id === payment.student_id
                  );

                  return (
                    <tr key={payment.id}>
                      <td style={styles.td}>
                        {student?.student || `Alumno #${payment.student_id}`}
                      </td>
                      <td style={styles.td}>{payment.year}</td>
                      <td style={styles.td}>{payment.month}</td>
                      <td style={styles.td}>
                        <span
                          style={
                            payment.paid
                              ? styles.approvedChip
                              : styles.pendingChip
                          }
                        >
                          {payment.paid ? "Pagado" : "Pendiente"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {payment.paid_date || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {module === "submissions" && (
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Comprobantes enviados</h2>
          <p style={styles.muted}>
            Solicitudes almacenadas en payment_submissions.
          </p>

          <div style={{ ...styles.tableWrap, marginTop: 18 }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Alumno</th>
                  <th style={styles.th}>Año</th>
                  <th style={styles.th}>Meses</th>
                  <th style={styles.th}>Monto</th>
                  <th style={styles.th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => {
                  const student = students.find(
                    (s) => s.id === submission.student_id
                  );

                  return (
                    <tr key={submission.id}>
                      <td style={styles.td}>
                        {student?.student ||
                          `Alumno #${submission.student_id}`}
                      </td>
                      <td style={styles.td}>{submission.year}</td>
                      <td style={styles.td}>
                        {Array.isArray(submission.months)
                          ? submission.months.join(", ")
                          : String(submission.months || "—")
                              .replaceAll("[", "")
                              .replaceAll("]", "")
                              .replaceAll('"', "")}
                      </td>
                      <td style={styles.td}>
                        {money(Number(submission.amount || 0))}
                      </td>
                      <td style={styles.td}>
                        <StatusChip status={submission.status || "pending"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {loadingData && (
        <div style={styles.loadingOverlay}>
          <Loader2 className="spin" />
          Actualizando información...
        </div>
      )}
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article style={styles.metricCard}>
      <div style={styles.metricIcon}>{icon}</div>
      <div>
        <p style={styles.metricLabel}>{label}</p>
        <strong style={styles.metricValue}>{value}</strong>
      </div>
    </article>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={styles.smallMetric}>
      <span style={styles.muted}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ModuleButton({
  icon,
  title,
  text,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button style={styles.moduleButton} onClick={onClick}>
      <div style={styles.moduleIcon}>{icon}</div>
      <strong style={{ fontSize: 17 }}>{title}</strong>
      <span style={styles.muted}>{text}</span>
      <span style={styles.moduleOpen}>Abrir →</span>
    </button>
  );
}

function StatusChip({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  if (normalized === "approved") {
    return <span style={styles.approvedChip}>Aprobado</span>;
  }

  if (normalized === "rejected") {
    return <span style={styles.rejectedChip}>Rechazado</span>;
  }

  return <span style={styles.pendingChip}>Pendiente</span>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main style={styles.centered}>{children}</main>;
}

const styles: Record<string, CSSProperties> = {
  centered: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    fontFamily: "Arial, sans-serif",
    background: "#f5f7fb",
    color: "#101828",
  },
  authPage: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
    background:
      "radial-gradient(circle at top left,#eef2ff 0,#f7f8fc 40%,#f7f8fc 100%)",
    fontFamily: "Arial, sans-serif",
  },
  authCard: {
    width: "100%",
    maxWidth: 480,
    background: "#fff",
    border: "1px solid #e4e7ec",
    borderRadius: 24,
    padding: 32,
    boxShadow: "0 20px 60px rgba(16,24,40,.10)",
  },
  authIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    color: "#4f46e5",
    background: "#eef2ff",
    marginBottom: 18,
  },
  eyebrow: {
    margin: "0 0 8px",
    color: "#4f46e5",
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: "0.14em",
  },
  authTitle: {
    margin: "0 0 10px",
    fontSize: 32,
    color: "#101828",
  },
  muted: {
    color: "#667085",
    margin: 0,
  },
  form: {
    display: "grid",
    gap: 15,
    marginTop: 24,
  },
  label: {
    display: "grid",
    gap: 7,
    fontWeight: 700,
    fontSize: 14,
    color: "#344054",
  },
  input: {
    width: "100%",
    border: "1px solid #d0d5dd",
    borderRadius: 12,
    padding: "12px 13px",
    outline: "none",
  },
  primaryButton: {
    border: 0,
    borderRadius: 12,
    padding: "13px 16px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #d0d5dd",
    borderRadius: 11,
    background: "#fff",
    padding: "10px 13px",
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontWeight: 700,
    cursor: "pointer",
  },
  notice: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    background: "#fff7ed",
    color: "#9a3412",
    fontSize: 14,
  },
  securityBox: {
    marginTop: 18,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    background: "#f8fafc",
    color: "#667085",
    fontSize: 13,
  },
  app: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "32px",
    fontFamily: "Arial, sans-serif",
    color: "#101828",
  },
  header: {
    maxWidth: 1450,
    margin: "0 auto 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
  },
  headerActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  title: {
    margin: "0 0 7px",
    fontSize: 34,
    letterSpacing: "-0.03em",
  },
  metricGrid: {
    maxWidth: 1450,
    margin: "0 auto 22px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
    gap: 14,
  },
  metricCard: {
    display: "flex",
    gap: 13,
    alignItems: "center",
    background: "#fff",
    border: "1px solid #e4e7ec",
    borderRadius: 18,
    padding: 18,
  },
  metricIcon: {
    width: 46,
    height: 46,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#eef2ff",
    color: "#4f46e5",
    flexShrink: 0,
  },
  metricLabel: {
    color: "#667085",
    fontSize: 13,
    margin: "0 0 4px",
  },
  metricValue: {
    fontSize: 25,
  },
  panel: {
    maxWidth: 1450,
    margin: "0 auto",
    background: "#fff",
    border: "1px solid #e4e7ec",
    borderRadius: 20,
    padding: 22,
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "center",
    flexWrap: "wrap",
  },
  sectionTitle: {
    margin: "0 0 6px",
    fontSize: 24,
  },
  orgGrid: {
    marginTop: 20,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
    gap: 15,
  },
  orgCard: {
    border: "1px solid #e4e7ec",
    borderRadius: 17,
    padding: 18,
  },
  orgIcon: {
    width: 46,
    height: 46,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#eef2ff",
    color: "#4f46e5",
  },
  chips: {
    display: "flex",
    gap: 8,
    marginTop: 14,
  },
  activeChip: {
    borderRadius: 999,
    padding: "5px 9px",
    background: "#ecfdf3",
    color: "#067647",
    fontWeight: 800,
    fontSize: 12,
  },
  planChip: {
    borderRadius: 999,
    padding: "5px 9px",
    background: "#f2f4f7",
    fontWeight: 800,
    fontSize: 12,
  },
  orgStats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    padding: "14px 0",
    marginTop: 14,
    borderTop: "1px solid #e4e7ec",
    borderBottom: "1px solid #e4e7ec",
  },
  openButton: {
    width: "100%",
    border: 0,
    background: "transparent",
    textAlign: "left",
    color: "#4f46e5",
    fontWeight: 800,
    padding: "14px 0 0",
    cursor: "pointer",
  },
  smallMetric: {
    border: "1px solid #e4e7ec",
    borderRadius: 14,
    padding: 15,
    display: "grid",
    gap: 6,
  },
  moduleGrid: {
    marginTop: 20,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 15,
  },
  moduleButton: {
    border: "1px solid #e4e7ec",
    background: "#fff",
    borderRadius: 17,
    padding: 18,
    textAlign: "left",
    cursor: "pointer",
    display: "grid",
    gap: 9,
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "#eef2ff",
    color: "#4f46e5",
  },
  moduleOpen: {
    color: "#4f46e5",
    fontWeight: 800,
    marginTop: 5,
  },
  backButton: {
    maxWidth: 1450,
    margin: "0 auto 16px",
    border: 0,
    background: "transparent",
    color: "#4f46e5",
    fontWeight: 800,
    display: "flex",
    gap: 7,
    alignItems: "center",
    cursor: "pointer",
  },
  searchBox: {
    minWidth: 300,
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #d0d5dd",
    borderRadius: 11,
    padding: "0 11px",
  },
  searchInput: {
    border: 0,
    outline: 0,
    width: "100%",
    padding: "11px 0",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 720,
  },
  th: {
    textAlign: "left",
    padding: "13px 12px",
    fontSize: 12,
    color: "#667085",
    borderBottom: "1px solid #e4e7ec",
  },
  td: {
    padding: "14px 12px",
    borderBottom: "1px solid #f0f1f3",
    fontSize: 14,
  },
  approvedChip: {
    borderRadius: 999,
    padding: "5px 9px",
    background: "#ecfdf3",
    color: "#067647",
    fontWeight: 800,
    fontSize: 12,
  },
  rejectedChip: {
    borderRadius: 999,
    padding: "5px 9px",
    background: "#fef3f2",
    color: "#b42318",
    fontWeight: 800,
    fontSize: 12,
  },
  pendingChip: {
    borderRadius: 999,
    padding: "5px 9px",
    background: "#fff7ed",
    color: "#b54708",
    fontWeight: 800,
    fontSize: 12,
  },
  loading: {
    padding: 35,
    display: "flex",
    justifyContent: "center",
    gap: 10,
    color: "#667085",
  },
  loadingOverlay: {
    position: "fixed",
    right: 20,
    bottom: 20,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    background: "#101828",
    color: "#fff",
    boxShadow: "0 10px 30px rgba(0,0,0,.18)",
  },
};
