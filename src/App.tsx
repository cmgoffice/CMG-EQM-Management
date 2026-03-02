import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Truck,
  Wrench,
  FileText,
  Settings,
  LogOut,
  Plus,
  Search,
  MapPin,
  Calendar,
  User,
  ChevronRight,
  Save,
  Fuel,
  AlertTriangle,
  Briefcase,
  Camera,
  History,
  Mail,
  Filter,
  X,
  Trash2,
  Pencil,
  MoreVertical,
  Database,
  Cloud,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Phone,
  Home,
  Shield,
  FileClock,
  XCircle,
  FilePlus,
  Bell,
  AlertOctagon,
  CheckSquare,
  Activity,
  Droplets,
  PieChart,
  BarChart3,
  Download,
  FileBarChart,
} from "lucide-react";

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDWmurzN4zlvKjuQPE2AVuC3foTFnitVgQ",
  authDomain: "cmg-equipment-supervisor.firebaseapp.com",
  projectId: "cmg-equipment-supervisor",
  storageBucket: "cmg-equipment-supervisor.firebasestorage.app",
  messagingSenderId: "332306227075",
  appId: "1:332306227075:web:68425b0229b1e95b20a0b6",
  measurementId: "G-XRS8ZCRX4P",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "cmg-equipment-supervisor";

// --- CONSTANTS ---
const VEHICLE_TYPES = [
  "รถปิคอัพ",
  "รถหกล้อขนดิน",
  "รถหกล้อรับส่งคน",
  "รถสิบล้อ",
  "รถเฮียบ",
  "รถ JCB",
  "รถ Backhole (PC30)",
  "รถ Backhole (PC200)",
];

const MAINTENANCE_STATUS = [
  {
    value: "Pending",
    label: "🟡 รอการซ่อม",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "InProgress",
    label: "🔵 กำลังซ่อม",
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "Completed",
    label: "🟢 ซ่อมเสร็จแล้ว",
    color: "bg-green-100 text-green-800",
  },
  {
    value: "Cancelled",
    label: "⚪ ยกเลิก",
    color: "bg-gray-100 text-gray-800",
  },
];

// --- COMPONENTS ---

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-slate-100 ${className}`}
  >
    {children}
  </div>
);

const Badge = ({ status, type = "vehicle" }: { status: string; type?: string }) => {
  if (type === "maintenance") {
    const s =
      MAINTENANCE_STATUS.find((x) => x.value === status) ||
      MAINTENANCE_STATUS[0];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.color}`}>
        {s.label}
      </span>
    );
  }

  const styles: Record<string, string> = {
    Ready: "bg-green-100 text-green-800",
    Maintenance: "bg-red-100 text-red-800",
    Busy: "bg-blue-100 text-blue-800",
    Other: "bg-gray-100 text-gray-800",
  };
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        styles[status] || styles.Other
      }`}
    >
      {status === "Ready"
        ? "พร้อมใช้งาน"
        : status === "Maintenance"
        ? "กำลังซ่อม"
        : status === "Busy"
        ? "กำลังทำงาน"
        : status}
    </span>
  );
};

const XCircleIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

// รถ 1 คันสามารถประจำหลายโครงการ ได้ (projectIds array; fallback จาก currentProjectId)
const getVehicleProjectIds = (v: any): string[] => {
  if (v?.projectIds && Array.isArray(v.projectIds) && v.projectIds.length > 0) return v.projectIds;
  return v?.currentProjectId ? [v.currentProjectId] : [];
};

const NavButton = ({ icon: Icon, label, active, onClick, className = "", activeBg = "bg-blue-600 text-white shadow-lg shadow-blue-600/20" }: { icon: any; label: string; active: boolean; onClick: () => void; className?: string; activeBg?: string }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
      active ? `${activeBg} scale-105` : "text-slate-600 hover:bg-slate-100"
    } ${className}`}
  >
    <Icon size={18} /> {label}
  </button>
);

// --- HELPER FUNCTIONS FOR DATE ---
const isToday = (dateString: string) => {
  const today = new Date();
  const date = new Date(dateString);
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const isThisWeek = (dateString: string) => {
  const today = new Date();
  const date = new Date(dateString);
  // Adjust to start of week (Monday)
  const day = today.getDay() || 7;
  if (day !== 1) today.setHours(-24 * (day - 1));
  today.setHours(0, 0, 0, 0);
  // Simple check if date is after start of this week
  return date >= today;
};

const isThisMonth = (dateString: string) => {
  const today = new Date();
  const date = new Date(dateString);
  return (
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

// --- MODALS ---

const ReportDetailModal = ({ report, onClose, vehicleName, projectName }: { report: DailyReport; onClose: () => void; vehicleName: string; projectName: string }) => {
  if (!report) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] animate-fade-in backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl border-0">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white flex justify-between items-start sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FileText size={24} className="opacity-80" /> รายละเอียดงาน
            </h3>
            <p className="text-blue-100 text-sm mt-1">
              {report.date} • {projectName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Truck size={24} />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-lg">
                {vehicleName}
              </div>
              <div className="text-slate-500 text-sm flex gap-3">
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {report.location}
                </span>
                {report.startTime && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {report.startTime} - {report.endTime}
                  </span>
                )}
              </div>
            </div>
            {(report.totalHours || 0) > 0 && (
              <div className="ml-auto bg-green-100 text-green-700 px-3 py-1 rounded-lg font-bold text-sm">
                {report.totalHours} ชม.
              </div>
            )}
          </div>

          {/* ผู้ส่งรายงาน & เลขไมล์/ชม. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">ผู้ส่งรายงาน</label>
              <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg text-slate-700 font-medium">
                {(report as any).submittedByName || "-"}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">เลขไมล์ / เลขชั่วโมง</label>
              <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg text-slate-700 font-medium">
                {(report as any).mileageOrHours || "-"}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                รายละเอียดงาน
              </label>
              <div className="bg-white border border-slate-200 p-4 rounded-xl text-slate-700 leading-relaxed">
                {report.workDetails || "-"}
              </div>
            </div>

            {report.problem && (
              <div>
                <label className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1 block">
                  ปัญหาที่พบ / สาเหตุ
                </label>
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 flex items-start gap-2">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  {report.problem}
                </div>
              </div>
            )}

            {/* Fuel Info Display */}
            {report.fuelLiters > 0 && (
              <div>
                <label className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1 block">
                  การเติมน้ำมัน
                </label>
                <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl text-orange-700 flex items-center gap-2 font-medium">
                  <Fuel size={18} /> เติมน้ำมัน: {report.fuelLiters} ลิตร
                </div>
              </div>
            )}
          </div>

          {/* Photo */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              รูปภาพหน้างาน
            </label>
            {report.photo ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <img
                  src={
                    report.photo.includes("http")
                      ? report.photo
                      : "https://placehold.co/600x400/e2e8f0/64748b?text=Uploaded+Image"
                  }
                  alt="Site Work"
                  className="w-full h-auto object-cover"
                />
              </div>
            ) : (
              <div className="h-32 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                <Camera size={32} className="mb-2 opacity-50" />
                <span className="text-sm">ไม่มีรูปภาพแนบ</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            ปิดหน้าต่าง
          </button>
        </div>
      </Card>
    </div>
  );
};

// --- TYPE INTERFACES ---
interface User {
  id?: string;
  name: string;
  role: string;
  empId: string;
  email?: string;
  status?: string;
  projectId?: string;
  vehicleId?: string;
  vehicleIds?: string[]; // รองรับหลายคัน
}

interface DailyReport {
  id?: string;
  vehicleId: string;
  projectId: string;
  date: string;
  location: string;
  startTime: string;
  endTime: string;
  fuelLiters: number;
  problem: string;
  photo?: string;
  driverId: string;
  workHours: number;
  totalHours?: number;
  workDetails?: string;
  mileageOrHours?: string;
  submittedBy?: string;
  submittedByName?: string;
}

interface Project {
  id?: string;
  jobNo?: string;
  projectName?: string;
  name?: string; // Form uses 'name' instead of 'projectName'
  location?: string;
  pm?: string;
  cm?: string;
  machineRespName?: string;
  machineRespPhone?: string;
  [key: string]: any;
}

interface ProjectFormData {
  jobNo: string;
  name: string;
  location: string;
  pm: string;
  cm: string;
  machineRespName: string;
  machineRespPhone: string;
}

interface Driver {
  id?: string;
  name?: string;
  license?: string;
  phone?: string;
  [key: string]: any;
}

const DELETE_REPORT_CODE = "123456";

// --- DAILY REPORT VIEW (stable component so form state is not lost when Firebase updates) ---
interface DailyReportViewProps {
  dailyReports: DailyReport[];
  vehicles: any[];
  projects: Project[];
  user: User | null;
  addData: (c: string, d: any) => Promise<void>;
  updateData: (c: string, id: string, d: any) => Promise<void>;
  deleteData: (c: string, id: string) => Promise<void>;
  logActivity: (a: string, d: string) => Promise<void>;
  getVehicleName: (id: string) => string;
  getProjectName: (id: string) => string;
  setViewReport: (r: DailyReport | null) => void;
}

function DailyReportViewInner({
  dailyReports,
  vehicles,
  projects,
  user,
  addData,
  updateData,
  deleteData,
  logActivity,
  getVehicleName,
  getProjectName,
  setViewReport,
}: DailyReportViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [reportForm, setReportForm] = useState({
    date: new Date().toISOString().split("T")[0],
    location: "",
    startTime: "",
    endTime: "",
    workDetails: "",
    problem: "",
    photo: "",
    fuelLiters: 0,
    mileageOrHours: "",
  });
  const reportFormRef = useRef(reportForm);

  const getReportForm = () => (isModalOpen ? reportFormRef.current : reportForm);

  const setReportFormField = (update: Partial<typeof reportForm>) => {
    const next = { ...reportFormRef.current, ...update };
    reportFormRef.current = next;
    if (isModalOpen) setReportForm(next);
  };

  const [reportToDelete, setReportToDelete] = useState<DailyReport | null>(null);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState("");

  const [breakdownForm, setBreakdownForm] = useState({
    projectId: "",
    vehicleId: "",
    date: new Date().toISOString().split("T")[0],
    time: "",
    symptoms: "",
    location: "",
    photo: "",
  });

  const openModal = (report: DailyReport | null = null) => {
    if (report) {
      setEditingReport(report);
      setSelectedProjectId(report.projectId);
      setSelectedVehicleId(report.vehicleId);
      const initial = {
        date: report.date,
        location: report.location,
        startTime: report.startTime || "",
        endTime: report.endTime || "",
        workDetails: report.workDetails || "",
        problem: report.problem || "",
        photo: report.photo || "",
        fuelLiters: report.fuelLiters || 0,
        mileageOrHours: (report as any).mileageOrHours || "",
      };
      reportFormRef.current = initial;
      setReportForm(initial);
    } else {
      setEditingReport(null);
      setSelectedProjectId("");
      setSelectedVehicleId("");
      const initial = {
        date: new Date().toISOString().split("T")[0],
        location: "",
        startTime: "",
        endTime: "",
        workDetails: "",
        problem: "",
        photo: "",
        fuelLiters: 0,
        mileageOrHours: "",
      };
      reportFormRef.current = initial;
      setReportForm(initial);
    }
    setIsModalOpen(true);
  };

  const openBreakdownModal = () => {
    setBreakdownForm({
      projectId: "",
      vehicleId: "",
      date: new Date().toISOString().split("T")[0],
      time: "",
      symptoms: "",
      location: "",
      photo: "",
    });
    setIsBreakdownModalOpen(true);
  };

  const filteredVehicles = useMemo(() => {
    if (!selectedProjectId) return [];
    return vehicles.filter((v) => getVehicleProjectIds(v).includes(selectedProjectId));
  }, [selectedProjectId, vehicles]);

  const displayReports = useMemo(() => {
    if (!user) return [];
    if (user.role === "Admin") return dailyReports;
    const key = user.empId || user.id || "";
    return dailyReports.filter((r: any) => (r.submittedBy === key));
  }, [dailyReports, user]);

  const breakdownVehicles = useMemo(() => {
    if (!breakdownForm.projectId) return [];
    return vehicles.filter((v) => getVehicleProjectIds(v).includes(breakdownForm.projectId));
  }, [breakdownForm.projectId, vehicles]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = getReportForm();
    if (
      !selectedProjectId ||
      !selectedVehicleId ||
      !form.location ||
      !form.startTime ||
      !form.endTime ||
      !form.workDetails
    )
      return alert("กรุณากรอกข้อมูลสำคัญให้ครบถ้วน");

    let totalHours = 0;
    if (form.startTime && form.endTime) {
      const [startH, startM] = form.startTime.split(":").map(Number);
      const [endH, endM] = form.endTime.split(":").map(Number);
      let start = startH + startM / 60;
      let end = endH + endM / 60;
      if (end < start) end += 24;
      totalHours = parseFloat((end - start).toFixed(2));
    }

    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    const isMachine = selectedVehicle
      ? selectedVehicle.type.includes("Backhole") ||
        selectedVehicle.type.includes("JCB") ||
        selectedVehicle.type.includes("เฮียบ")
      : false;

    const payload = {
      vehicleId: selectedVehicleId,
      projectId: selectedProjectId,
      type: isMachine ? "Machinery" : "Vehicle",
      totalHours: totalHours,
      distance: 0,
      submittedBy: user?.empId || user?.id || "",
      submittedByName: user?.name || "",
      ...form,
    };

    if (editingReport && editingReport.id) {
      await updateData("daily_reports", editingReport.id, payload);
      logActivity(
        "Edit Daily Report",
        `Edited report for ${selectedVehicle?.plate}`
      );
      alert("แก้ไขรายงานสำเร็จ!");
    } else {
      await addData("daily_reports", payload);
      logActivity(
        "Daily Report",
        `Submitted report for ${selectedVehicle?.plate}`
      );
      alert("บันทึกรายงานสำเร็จ!");
    }
    setIsModalOpen(false);
  };

  const handleBreakdownSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !breakdownForm.projectId ||
      !breakdownForm.vehicleId ||
      !breakdownForm.time ||
      !breakdownForm.symptoms ||
      !breakdownForm.location
    ) {
      return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    }

    const payload = {
      ...breakdownForm,
      reporterName: user?.name || "",
      reporterId: user?.empId || "",
      status: "New",
    };

    await addData("breakdown_reports", payload);
    logActivity(
      "Breakdown Alert",
      `Reported breakdown for vehicle ID: ${breakdownForm.vehicleId}`
    );
    setIsBreakdownModalOpen(false);
    alert("แจ้งรถเสียไปยังแอดมินแล้ว จะทำการติดต่อกลับโดยเร็ว");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReportFormField({ photo: "https://placehold.co/600x400/png?text=Mock+Image" });
      alert("อัพโหลดรูปภาพจำลองสำเร็จ (Mock Upload)");
    }
  };

  const handleBreakdownPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBreakdownForm({
        ...breakdownForm,
        photo: "https://placehold.co/600x400/png?text=Breakdown+Image",
      });
      alert("อัพโหลดรูปภาพสำเร็จ (Mock)");
    }
  };

  return (
    <div className="space-y-8 p-2">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
          <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
            <FileText size={28} />
          </div>
          รายงานประจำวัน
        </h2>
        <div className="flex gap-4">
          <button
            onClick={openBreakdownModal}
            className="bg-red-200 text-red-800 px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-red-300 shadow-md transition-all font-bold"
          >
            <AlertOctagon size={20} /> แจ้งรถเสีย
          </button>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all font-medium"
          >
            <Plus size={20} /> ส่งบันทึกรายงาน
          </button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-1 py-1 text-xs">วันที่</th>
                <th className="px-1 py-1 text-xs">โครงการ / รถ</th>
                <th className="px-1 py-1 text-xs">เวลา</th>
                <th className="px-1 py-1 text-xs">รายละเอียด</th>
                <th className="px-1 py-1 text-center text-xs">น้ำมัน</th>
                <th className="px-1 py-1 text-center text-xs">เลขไมล์/ชม.</th>
                <th className="px-1 py-1 text-xs">ผู้ส่งรายงาน</th>
                <th className="px-1 py-1 text-xs text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayReports.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setViewReport(r)}
                  className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                >
                  <td className="px-1 py-1 whitespace-nowrap text-slate-500 text-xs">
                    {r.date}
                  </td>
                  <td className="px-1 py-1">
                    <div className="font-bold text-slate-800 text-xs">
                      {getVehicleName(r.vehicleId)}
                    </div>
                    <div className="text-xs text-blue-500 bg-blue-50 inline-block px-1 py-0.5 rounded mt-0.5">
                      {getProjectName(r.projectId)}
                    </div>
                  </td>
                  <td className="px-1 py-1 whitespace-nowrap">
                    <div className="text-xs">
                      {r.startTime} - {r.endTime}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                      ({r.totalHours} ชม.)
                    </div>
                  </td>
                  <td className="px-1 py-1 max-w-md truncate text-slate-600 text-xs">
                    {r.workDetails}
                  </td>
                  <td className="px-1 py-1 text-center text-xs font-medium text-green-600">
                    {(() => {
                      if (!r.fuelLiters) return "-";
                      const fuelValue = typeof r.fuelLiters === 'string' ? parseFloat(r.fuelLiters) : r.fuelLiters;
                      if (fuelValue > 500) {
                        const dieselPrice = 35;
                        const liters = (fuelValue / dieselPrice).toFixed(1);
                        return `${liters}`;
                      }
                      return `${fuelValue.toFixed(1)} ล.`;
                    })()}
                  </td>
                  <td className="px-1 py-1 text-center text-xs text-slate-700">
                    {(r as any).mileageOrHours || "-"}
                  </td>
                  <td className="px-1 py-1 text-xs text-slate-700">
                    {(r as any).submittedByName || "-"}
                  </td>
                  <td
                    className="px-1 py-1 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {user?.role === "Admin" && (
                      <span className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openModal(r)}
                          className="p-0.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="แก้ไข"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => setReportToDelete(r)}
                          className="p-0.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="ลบ"
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {displayReports.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-1 py-2 text-center text-slate-400 text-xs">
                    {user?.role === "Admin" ? "ไม่มีข้อมูล" : "ยังไม่มีรายงานที่คุณส่ง"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] animate-fade-in backdrop-blur-sm bg-black/40 overflow-y-auto flex justify-center pt-20 pb-8 px-4">
          <Card className="w-full max-w-2xl max-h-[calc(100vh-6rem)] overflow-y-auto shadow-2xl border-0 relative z-[10000] shrink-0">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  {editingReport ? (
                    <Pencil size={24} />
                  ) : (
                    <FileText size={24} />
                  )}
                </div>
                {editingReport ? "แก้ไขรายงาน" : "ส่งบันทึกรายงาน"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">
                    1. โครงการ <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input-field"
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setSelectedVehicleId("");
                    }}
                  >
                    <option value="">-- เลือกโครงการ --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.jobNo} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">
                    2. ทะเบียนรถ <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input-field"
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                  >
                    <option value="">-- เลือกรถ (ทุกคัน) --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} : {v.type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">3. วันที่ (Auto)</label>
                  <input
                    type="date"
                    className="input-field bg-slate-100 text-slate-500"
                    value={getReportForm().date}
                    disabled
                  />
                </div>
                <div>
                  <label className="label">
                    4. สถานที่ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={getReportForm().location}
                    onChange={(e) => setReportFormField({ location: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">
                    5. เริ่มงาน (HH:MM){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    className="input-field"
                    value={getReportForm().startTime}
                    onChange={(e) => setReportFormField({ startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">
                    6. สิ้นสุด (HH:MM) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    className="input-field"
                    value={getReportForm().endTime}
                    onChange={(e) => setReportFormField({ endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">
                    7. เติมน้ำมัน (ลิตร){" "}
                    <span className="text-xs text-slate-400 font-normal">
                      (ใส่ 0 หากไม่ได้เติม)
                    </span>
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={getReportForm().fuelLiters}
                    onChange={(e) =>
                      setReportFormField({ fuelLiters: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="label">เลขไมล์/ชั่วโมง (ถ้ามี)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="ระบุเลขไมล์หรือชั่วโมงทำงาน"
                    value={getReportForm().mileageOrHours || ""}
                    onChange={(e) => setReportFormField({ mileageOrHours: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">
                  8. รายละเอียดงาน <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="input-field h-32"
                  value={getReportForm().workDetails}
                  onChange={(e) => setReportFormField({ workDetails: e.target.value })}
                ></textarea>
              </div>
              <div>
                <label className="label">9. ปัญหาหน้างาน</label>
                <input
                  type="text"
                  className="input-field"
                  value={getReportForm().problem}
                  onChange={(e) => setReportFormField({ problem: e.target.value })}
                />
              </div>
              <div>
                <label className="label">10. รูปภาพ</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:bg-slate-50 relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handlePhotoUpload}
                  />
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Camera size={32} className="text-blue-400" />
                    <span>
                      {getReportForm().photo ? "เปลี่ยนรูปภาพ" : "อัพโหลดรูปภาพ"}
                    </span>
                    {getReportForm().photo && (
                      <span className="text-green-600 text-sm font-medium">
                        ✅ มีรูปภาพแล้ว
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-end gap-4 rounded-b-2xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleReportSubmit}
                className="btn-primary shadow-lg shadow-blue-600/20"
              >
                บันทึก
              </button>
            </div>
          </Card>
        </div>
      )}

      {reportToDelete && (
        <div className="fixed inset-0 z-[9999] animate-fade-in backdrop-blur-sm bg-black/40 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-0">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <div className="bg-red-100 p-2 rounded-lg text-red-600">
                  <Trash2 size={24} />
                </div>
                ลบรายการบันทึกประจำวัน
              </h3>
              <p className="text-slate-600 text-sm mt-2">
                รายงานวันที่ {reportToDelete.date} – {getVehicleName(reportToDelete.vehicleId)} ({getProjectName(reportToDelete.projectId)})
              </p>
            </div>
            <div className="p-6 space-y-4">
              <label className="label">กรอกรหัสยืนยัน (123456)</label>
              <input
                type="password"
                inputMode="numeric"
                className="input-field"
                placeholder="กรอกรหัส 123456"
                value={deleteConfirmCode}
                onChange={(e) => setDeleteConfirmCode(e.target.value)}
                autoFocus
              />
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setReportToDelete(null);
                  setDeleteConfirmCode("");
                }}
                className="btn-secondary"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (deleteConfirmCode !== DELETE_REPORT_CODE) {
                    alert("รหัสไม่ถูกต้อง กรุณากรอก 123456");
                    return;
                  }
                  if (!reportToDelete.id) return;
                  await deleteData("daily_reports", reportToDelete.id);
                  logActivity("Delete Daily Report", `Deleted report ${reportToDelete.date} - ${getVehicleName(reportToDelete.vehicleId)}`);
                  setReportToDelete(null);
                  setDeleteConfirmCode("");
                  setViewReport(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                ลบรายการ
              </button>
            </div>
          </Card>
        </div>
      )}

      {isBreakdownModalOpen && (
        <div className="fixed inset-0 z-[9999] animate-fade-in backdrop-blur-sm bg-black/60 overflow-y-auto flex justify-center pt-20 pb-8 px-4">
          <Card className="w-full max-w-2xl max-h-[calc(100vh-6rem)] overflow-y-auto shadow-2xl border-0 relative z-[10000] shrink-0">
            <div className="p-6 border-b border-red-100 flex justify-between items-center bg-red-50 sticky top-0 z-10 shrink-0">
              <h3 className="text-2xl font-bold text-red-800 flex items-center gap-3">
                <div className="bg-red-200 p-2 rounded-lg text-red-700">
                  <AlertOctagon size={24} />
                </div>
                แจ้งรถเสีย
              </h3>
              <button
                onClick={() => setIsBreakdownModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-red-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">
                    1. โครงการ <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input-field"
                    value={breakdownForm.projectId}
                    onChange={(e) => {
                      setBreakdownForm({
                        ...breakdownForm,
                        projectId: e.target.value,
                        vehicleId: "",
                      });
                    }}
                  >
                    <option value="">-- เลือกโครงการ --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.jobNo} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">
                    2. ทะเบียนรถ <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input-field"
                    value={breakdownForm.vehicleId}
                    onChange={(e) =>
                      setBreakdownForm({
                        ...breakdownForm,
                        vehicleId: e.target.value,
                      })
                    }
                    disabled={!breakdownForm.projectId}
                  >
                    <option value="">-- เลือกรถ --</option>
                    {breakdownVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} : {v.type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">3. ผู้แจ้งรถเสีย (Auto)</label>
                  <input
                    type="text"
                    className="input-field bg-slate-100 text-slate-500"
                    value={user?.name || ""}
                    disabled
                  />
                </div>
                <div>
                  <label className="label">4. วันที่รถเสีย (Auto)</label>
                  <input
                    type="date"
                    className="input-field bg-slate-100 text-slate-500"
                    value={breakdownForm.date}
                    disabled
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">
                    5. เวลาที่รถเสีย <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    className="input-field"
                    value={breakdownForm.time}
                    onChange={(e) =>
                      setBreakdownForm({
                        ...breakdownForm,
                        time: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label">
                    7. สถานที่รถเสีย <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={breakdownForm.location}
                    onChange={(e) =>
                      setBreakdownForm({
                        ...breakdownForm,
                        location: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="label">
                  6. อาการเสีย <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="input-field h-24"
                  placeholder="ระบุอาการเสีย..."
                  value={breakdownForm.symptoms}
                  onChange={(e) =>
                    setBreakdownForm({
                      ...breakdownForm,
                      symptoms: e.target.value,
                    })
                  }
                ></textarea>
              </div>
              <div>
                <label className="label">8. รูปถ่าย (1 ภาพ)</label>
                <div className="border-2 border-dashed border-red-200 rounded-xl p-6 text-center cursor-pointer hover:bg-red-50 relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleBreakdownPhotoUpload}
                  />
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Camera size={32} className="text-red-400" />
                    <span>
                      {breakdownForm.photo
                        ? "เปลี่ยนรูปภาพ"
                        : "อัพโหลดรูปภาพ"}
                    </span>
                    {breakdownForm.photo && (
                      <span className="text-green-600 text-sm font-medium">
                        ✅ มีรูปภาพแล้ว
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-end gap-4 rounded-b-2xl">
              <button
                onClick={() => setIsBreakdownModalOpen(false)}
                className="btn-secondary"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleBreakdownSubmit}
                className="btn-primary bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20"
              >
                แจ้งรถเสีย
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- REPORT HISTORY VIEW (read-only for driver, export CSV) ---
interface ReportHistoryViewProps {
  dailyReports: DailyReport[];
  user: User | null;
  getVehicleName: (id: string) => string;
  getProjectName: (id: string) => string;
}

function ReportHistoryViewInner({ dailyReports, user, getVehicleName, getProjectName }: ReportHistoryViewProps) {
  const myReports = useMemo(() => {
    if (!user) return [];
    const list =
      user.role === "Admin"
        ? dailyReports
        : dailyReports.filter((r) => {
            const key = user.empId || user.id || "";
            return (r as any).submittedBy === key;
          });
    return list.sort((a, b) => new Date(b.date || "0").getTime() - new Date(a.date || "0").getTime());
  }, [dailyReports, user]);

  const exportCSV = () => {
    const headers = ["วันที่", "โครงการ", "ทะเบียนรถ", "เวลาเริ่ม", "เวลาสิ้นสุด", "ชม.", "สถานที่", "รายละเอียดงาน", "น้ำมัน(ลิตร)", "เลขไมล์/ชั่วโมง", "ปัญหาหน้างาน"];
    const rows = myReports.map((r) => [
      r.date,
      getProjectName(r.projectId),
      getVehicleName(r.vehicleId),
      r.startTime || "",
      r.endTime || "",
      String(r.totalHours ?? ""),
      r.location || "",
      (r.workDetails || "").replace(/"/g, '""'),
      String(typeof r.fuelLiters === "number" ? r.fuelLiters : (r as any).fuelLiters ?? ""),
      (r as any).mileageOrHours || "",
      (r.problem || "").replace(/"/g, '""'),
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ประวัติรายงาน_${user?.name || "user"}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-2">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
          <div className="bg-teal-100 p-2.5 rounded-xl text-teal-600">
            <FileBarChart size={28} />
          </div>
          {user?.role === "Admin" ? "ประวัติรายงาน (ทั้งหมด)" : "ประวัติรายงานของฉัน"}
        </h2>
        <button
          onClick={exportCSV}
          disabled={myReports.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={20} /> Export CSV
        </button>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-xs">วันที่</th>
                <th className="px-3 py-2 text-xs">โครงการ / รถ</th>
                <th className="px-3 py-2 text-xs">เวลา</th>
                <th className="px-3 py-2 text-xs">รายละเอียด</th>
                <th className="px-3 py-2 text-xs text-center">น้ำมัน</th>
                <th className="px-3 py-2 text-xs">เลขไมล์/ชั่วโมง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myReports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3 py-2 whitespace-nowrap text-slate-600">{r.date}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-800">{getVehicleName(r.vehicleId)}</div>
                    <div className="text-blue-600 bg-blue-50/80 inline-block px-1.5 py-0.5 rounded text-xs mt-0.5">
                      {getProjectName(r.projectId)}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.startTime} - {r.endTime}
                    <span className="text-slate-400 ml-1">({r.totalHours} ชม.)</span>
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate text-slate-600">{r.workDetails}</td>
                  <td className="px-3 py-2 text-center font-medium text-green-600">
                    {r.fuelLiters != null ? String(r.fuelLiters) : "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{(r as any).mileageOrHours || "-"}</td>
                </tr>
              ))}
              {myReports.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    ยังไม่มีประวัติรายงานที่คุณส่ง (รายงานที่ส่งหลังจากอัปเดตระบบจะแสดงที่นี่)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// --- MAIN APP COMPONENT ---

export default function App() {
  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState<User | null>(null); // Local UI User State
  const [firebaseUser, setFirebaseUser] = useState<any>(null); // Firebase Auth User
  const [authError, setAuthError] = useState<string | null>(null); // Track Auth Errors
  const [activeTab, setActiveTab] = useState<string>("daily"); // Default to daily for user
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Data State (Synced with Firestore)
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [breakdownReports, setBreakdownReports] = useState<any[]>([]);

  // New States for Admin
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);

  // Detail Modal State
  const [viewReport, setViewReport] = useState<DailyReport | null>(null);

  // --- FIREBASE SYNC LOGIC ---

  // 1. Authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Synchronization (Real-time)
  useEffect(() => {
    if (!firebaseUser) {
      setIsLoading(false);
      return;
    }

    const getRef = (colName: string) =>
      collection(db, "artifacts", appId, "public", "data", colName);

    // Listeners
    const unsubProjects = onSnapshot(query(getRef("projects")), (snapshot) =>
      setProjects(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Project)))
    );
    const unsubVehicles = onSnapshot(query(getRef("vehicles")), (snapshot) =>
      setVehicles(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    );
    const unsubReports = onSnapshot(
      query(getRef("daily_reports")),
      (snapshot) =>
        setDailyReports(
          snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as DailyReport))
            .sort((a, b) => new Date(b.date || "0").getTime() - new Date(a.date || "0").getTime())
        )
    );
    const unsubMaintenance = onSnapshot(
      query(getRef("maintenance_logs")),
      (snapshot) =>
        setMaintenanceLogs(
          snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as any))
            .sort((a, b) => new Date(b.date || "0").getTime() - new Date(a.date || "0").getTime())
        )
    );
    const unsubDrivers = onSnapshot(query(getRef("drivers")), (snapshot) =>
      setDrivers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Driver)))
    );

    // New: Breakdown Reports Listener
    const unsubBreakdowns = onSnapshot(
      query(getRef("breakdown_reports")),
      (snapshot) =>
        setBreakdownReports(
          snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as any))
            .sort((a, b) => new Date(b.date || "0").getTime() - new Date(a.date || "0").getTime())
        )
    );

    // User & Log Listeners
    const unsubLogs = onSnapshot(query(getRef("login_logs")), (snapshot) =>
      setLoginLogs(
        snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as any))
          .sort(
            (a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
          )
      )
    );
    const unsubUsers = onSnapshot(query(getRef("users")), (snapshot) =>
      setUsersList(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as User)))
    );

    setIsLoading(false);

    return () => {
      unsubProjects();
      unsubVehicles();
      unsubReports();
      unsubMaintenance();
      unsubDrivers();
      unsubUsers();
      unsubLogs();
      unsubBreakdowns();
    };
  }, [firebaseUser]);

  // --- AUTO SEED ADMIN LOGIC ---
  useEffect(() => {
    const seedAdmin = async () => {
      if (!firebaseUser || usersList.length === 0) return;
      const adminExists = usersList.some((u) => u.empId === "admin");
      if (!adminExists) {
        const q = query(
          collection(db, "artifacts", appId, "public", "data", "users"),
          where("empId", "==", "admin")
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          await addData("users", {
            empId: "admin",
            name: "System Admin",
            role: "Admin",
            status: "Approved",
            email: "admin@cmg.com",
          });
        }
      }
    };
    seedAdmin();
  }, [firebaseUser, usersList]);

  // --- HELPER: SYSTEM LOGGING ---
  const logActivity = async (action: string, details: string = "") => {
    if (!user) return;
    try {
      await addDoc(
        collection(db, "artifacts", appId, "public", "data", "login_logs"),
        {
          userId: user.id || "unknown",
          empId: user.empId,
          name: user.name,
          role: user.role,
          action: action,
          details: details,
          timestamp: serverTimestamp(),
        }
      );
    } catch (e) {
      console.error("Failed to log activity", e);
    }
  };

  // --- CRUD HANDLERS ---

  const addData = async (collectionName: string, data: any) => {
    if (!firebaseUser) return;
    try {
      await addDoc(
        collection(db, "artifacts", appId, "public", "data", collectionName),
        {
          ...data,
          createdAt: serverTimestamp(),
        }
      );
    } catch (e: any) {
      console.error(`Error adding ${collectionName}:`, e);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + e.message);
    }
  };

  const updateData = async (collectionName: string, docId: string, data: any) => {
    if (!firebaseUser) return;
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        collectionName,
        docId
      );
      await updateDoc(docRef, data);
    } catch (e) {
      console.error(`Error updating ${collectionName}:`, e);
      alert("เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
    }
  };

  const deleteData = async (collectionName: string, docId: string) => {
    if (!firebaseUser) return;
    try {
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", collectionName, docId)
      );
    } catch (e) {
      console.error(`Error deleting ${collectionName}:`, e);
      alert("เกิดข้อผิดพลาดในการลบข้อมูล");
    }
  };

  // --- HELPER FUNCTIONS ---
  const getVehicleName = (id: string): string => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.plate || ""} (${v.type || ""})` : "ไม่ระบุ/ลบแล้ว";
  };

  const getProjectName = (id: string): string => {
    const p = projects.find((x) => x.id === id);
    return p ? p.jobNo || "-" : "-";
  };

  // --- VIEWS ---
  // ... LoginView, AdminUserView ... (Same as before)
  const LoginView = () => {
    const [mode, setMode] = useState("login");
    const [formData, setFormData] = useState({
      empId: "",
      name: "",
      email: "",
    });
    const [loginId, setLoginId] = useState("");
    const [error, setError] = useState("");

    const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.empId || !formData.name)
        return setError("กรุณากรอกรหัสพนักงานและชื่อ");

      const existing = usersList.find((u) => u.empId === formData.empId);
      if (existing) return setError("รหัสพนักงานนี้ถูกลงทะเบียนแล้ว");

      const isFirstUser = usersList.length === 0;
      const newUser = {
        empId: formData.empId,
        name: formData.name,
        email: formData.email,
        role: isFirstUser ? "Admin" : "User",
        status: isFirstUser ? "Approved" : "Pending",
      };

      await addData("users", newUser);
      alert(
        isFirstUser
          ? "ลงทะเบียนสำเร็จในฐานะ Admin!"
          : "ลงทะเบียนสำเร็จ! กรุณารอการอนุมัติจาก Admin"
      );
      setMode("login");
      setFormData({ empId: "", name: "", email: "" });
      setError("");
    };

    const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const targetUser = usersList.find(
        (u) => u.empId === loginId || u.email === loginId
      );

      if (!targetUser) {
        if (loginId === "admin") {
          const adminData = {
            empId: "admin",
            name: "System Admin",
            role: "Admin",
            status: "Approved",
            email: "admin@cmg.com",
          };
          await addData("users", adminData);
          const tempUser = { ...adminData, id: "temp_admin" };
          setUser(tempUser);
          return;
        }
        return setError("ไม่พบข้อมูลผู้ใช้งานนี้");
      }

      if (targetUser.status !== "Approved") {
        return setError("บัญชีของท่านยังไม่ได้รับการอนุมัติ กรุณาติดต่อ Admin");
      }

      setUser(targetUser);
      logActivity("Login", "เข้าสู่ระบบสำเร็จ");

      setActiveTab(targetUser.role === "Admin" ? "dashboard" : "daily");
    };

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <style>{styleTags}</style>
        <Card className="w-full max-w-md p-8 shadow-2xl border-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-inner">
              <Truck size={40} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 mb-1">
              CMG EQM
            </h1>
            <p className="text-slate-500 text-sm">
              Construction Machinery & Fleet Management
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 mb-6 border border-red-100 animate-fade-in">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {mode === "login" ? (
            <form
              onSubmit={handleLoginSubmit}
              className="space-y-5 animate-fade-in"
            >
              <div>
                <label className="label">รหัสพนักงาน หรือ อีเมล</label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-3 text-slate-400 z-10"
                    size={20}
                  />
                  <input
                    type="text"
                    className="input-field-icon pl-12"
                    placeholder="เช่น admin หรือ รหัสพนักงาน"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full btn-primary py-3 text-lg shadow-lg shadow-blue-600/30"
              >
                เข้าสู่ระบบ
              </button>
              <div className="text-center pt-4">
                <span className="text-slate-500 text-sm">ยังไม่มีบัญชี? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                  className="text-blue-600 font-semibold hover:underline text-sm"
                >
                  ลงทะเบียน
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={handleRegister}
              className="space-y-5 animate-fade-in"
            >
              <div>
                <label className="label">
                  รหัสพนักงาน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="เช่น EMP001"
                  value={formData.empId}
                  onChange={(e) =>
                    setFormData({ ...formData, empId: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="label">
                  ชื่อ - นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="ชื่อจริง นามสกุล"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="label">อีเมล (ถ้ามี)</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium shadow-lg shadow-green-600/30 transition-all"
              >
                ยืนยันการลงทะเบียน
              </button>
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className="text-slate-500 hover:text-slate-700 text-sm"
                >
                  ยกเลิก / กลับไปหน้าเข้าสู่ระบบ
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>
    );
  };

  const AdminUserView = () => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userFormData, setUserFormData] = useState({
      name: "",
      empId: "",
      email: "",
      role: "",
      projectId: "",
      vehicleId: "",
      vehicleIds: [] as string[],
      status: ""
    });

    const toggleStatus = async (user: User) => {
      const newStatus = user.status === "Pending" ? "Approved" : "Pending";
      if (window.confirm(`เปลี่ยนสถานะของ ${user.name} เป็น ${newStatus}?`) && user.id) {
        await updateData("users", user.id, { status: newStatus });
        logActivity(
          "Admin Action",
          `Changed status of ${user.name} to ${newStatus}`
        );
      }
    };

    const deleteUser = async (id: string) => {
      if (window.confirm("ยืนยันการลบผู้ใช้งานนี้?")) {
        await deleteData("users", id);
        logActivity("Admin Action", `Deleted user ID: ${id}`);
      }
    };

    const openEditModal = (user: User) => {
      setEditingUser(user);
      setUserFormData({
        name: user.name || "",
        empId: user.empId || "",
        email: user.email || "",
        role: user.role || "",
        projectId: user.projectId || "",
        vehicleId: user.vehicleId || "",
        vehicleIds: user.vehicleIds || (user.vehicleId ? [user.vehicleId] : []),
        status: user.status || ""
      });
      setIsEditModalOpen(true);
    };

    const handleSaveUser = async () => {
      if (editingUser && editingUser.id) {
        const dataToUpdate = {
          ...userFormData,
          vehicleIds: userFormData.vehicleIds
        };
        await updateData("users", editingUser.id, dataToUpdate);
        logActivity("Admin Action", `Updated user: ${userFormData.name}`);
        setIsEditModalOpen(false);
        alert("อัปเดตข้อมูลผู้ใช้สำเร็จ!");
      }
    };

    return (
      <div className="space-y-8 p-2 animate-fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <Shield size={28} />
            </div>{" "}
            จัดการผู้ใช้งาน (Admin)
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h3 className="font-bold text-lg text-slate-700 flex items-center gap-2">
              <Users size={20} className="text-blue-500" />{" "}
              รายชื่อผู้ใช้งานทั้งหมด ({usersList.length})
            </h3>
            {usersList.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                ไม่มีผู้ใช้งาน
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-4">User Info</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-bold text-slate-800">
                            {u.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {u.empId} • {u.role}
                          </div>
                          {u.email && (
                            <div className="text-xs text-blue-500">
                              {u.email}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                              u.status === "Approved"
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {u.status === "Approved"
                              ? "✅ Approved"
                              : "⏳ Pending"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                              title="แก้ไขข้อมูล"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => toggleStatus(u)}
                              className={`p-2 rounded-lg transition-colors ${
                                u.status === "Pending"
                                  ? "bg-green-100 text-green-600 hover:bg-green-200"
                                  : "bg-orange-100 text-orange-600 hover:bg-orange-200"
                              }`}
                              title={
                                u.status === "Pending"
                                  ? "Approve"
                                  : "Set Pending"
                              }
                            >
                              {u.status === "Pending" ? (
                                <CheckCircle size={16} />
                              ) : (
                                <XCircleIcon size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => u.id && deleteUser(u.id)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        {/* Edit User Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[100] animate-fade-in backdrop-blur-sm">
            <Card className="w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl border-0">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/95 sticky top-0 z-10">
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                    <Pencil size={24} />
                  </div>
                  แก้ไขข้อมูลผู้ใช้
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">👤 ชื่อ-นามสกุล</label>
                    <input
                      type="text"
                      className="input-field"
                      value={userFormData.name}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">🆔 รหัสพนักงาน</label>
                    <input
                      type="text"
                      className="input-field"
                      value={userFormData.empId}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, empId: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">📧 อีเมล</label>
                    <input
                      type="email"
                      className="input-field"
                      value={userFormData.email}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">🏢 ตำแหน่ง</label>
                    <select
                      className="input-field"
                      value={userFormData.role}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, role: e.target.value })
                      }
                    >
                      <option value="">-- เลือกตำแหน่ง --</option>
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="Driver">Driver</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">🏗️ โครงการ</label>
                    <select
                      className="input-field"
                      value={userFormData.projectId}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, projectId: e.target.value })
                      }
                    >
                      <option value="">-- เลือกโครงการ --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name || p.projectName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">🚗 รถที่ขับ (เลือกได้หลายคัน)</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                      {vehicles.map((v) => (
                        <label key={v.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            checked={userFormData.vehicleIds.includes(v.id || '')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUserFormData({
                                  ...userFormData,
                                  vehicleIds: [...userFormData.vehicleIds, v.id || '']
                                });
                              } else {
                                setUserFormData({
                                  ...userFormData,
                                  vehicleIds: userFormData.vehicleIds.filter(id => id !== v.id)
                                });
                              }
                            }}
                          />
                          <span className="text-sm">
                            {v.plate} - {v.type}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">📊 สถานะ</label>
                    <select
                      className="input-field"
                      value={userFormData.status}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, status: e.target.value })
                      }
                    >
                      <option value="Pending">⏳ Pending</option>
                      <option value="Approved">✅ Approved</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleSaveUser}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-600/20"
                  >
                    💾 บันทึกข้อมูล
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

          <div className="space-y-6">
            <h3 className="font-bold text-lg text-slate-700 flex items-center gap-2">
              <FileClock size={20} className="text-purple-500" />{" "}
              ประวัติการใช้งานระบบ (System Logs)
            </h3>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-4">Time</th>
                    <th className="p-4">User</th>
                    <th className="p-4">Action / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loginLogs.map((log) => {
                    const date = log.timestamp
                      ? new Date(log.timestamp.seconds * 1000).toLocaleString(
                          "th-TH"
                        )
                      : "-";
                    const actionDisplay = log.action || "Login";
                    const detailsDisplay =
                      log.details || (log.action ? "" : log.role);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-4 text-xs text-slate-500 whitespace-nowrap align-top">
                          {date}
                        </td>
                        <td className="p-4 font-medium text-slate-700 align-top">
                          {log.name}{" "}
                          <div className="text-xs text-slate-400">
                            ({log.empId})
                          </div>
                        </td>
                        <td className="p-4 align-top">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold mr-2 ${
                              actionDisplay === "Login"
                                ? "bg-green-100 text-green-700"
                                : actionDisplay.includes("Breakdown")
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {actionDisplay}
                          </span>
                          <div className="text-xs text-slate-500 mt-1">
                            {detailsDisplay}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {loginLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="p-4 text-center text-slate-400"
                      >
                        ไม่มีประวัติ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DashboardView = () => {
    const [filterJob, setFilterJob] = useState("all");
    const isDriverView = user?.role === "Driver";

    const driverScopedData = useMemo(() => {
      if (!isDriverView || !user) return null;
      const key = user.empId || user.id || "";
      const reports = dailyReports.filter((r: any) => r.submittedBy === key);
      const vIds = reports.map((r) => r.vehicleId).filter((id): id is string => Boolean(id));
      const vehicleIds = vIds.filter((id, i) => vIds.indexOf(id) === i);
      const pIds = reports.map((r) => r.projectId).filter((id): id is string => Boolean(id));
      const projectIds = pIds.filter((id, i) => pIds.indexOf(id) === i);
      const scopeVehicles = vehicles.filter((v) => vehicleIds.includes(v.id));
      return { reports, vehicleIds, projectIds, scopeVehicles };
    }, [isDriverView, user, dailyReports, vehicles]);

    // รายงานที่ใช้ใน Dashboard: คนขับเห็นแค่ของตนเอง, Admin เห็นทั้งหมด (แล้วกรองโครงการถ้าเลือก)
    const scopeReports = useMemo(() => {
      if (isDriverView && driverScopedData) {
        const reports = driverScopedData.reports;
        if (filterJob === "all") return reports;
        return reports.filter((r) => r.projectId === filterJob);
      }
      if (filterJob === "all") return dailyReports;
      return dailyReports.filter((r) => r.projectId === filterJob);
    }, [isDriverView, driverScopedData, filterJob, dailyReports]);

    const scopeVehicles = useMemo(() => {
      if (isDriverView && driverScopedData) {
        const reports = filterJob === "all" ? driverScopedData.reports : driverScopedData.reports.filter((r) => r.projectId === filterJob);
        const rawIds = reports.map((r) => r.vehicleId).filter((id): id is string => Boolean(id));
        const ids = rawIds.filter((id, i) => rawIds.indexOf(id) === i);
        return vehicles.filter((v) => ids.includes(v.id));
      }
      if (filterJob === "all") return vehicles;
      return vehicles.filter((v) => getVehicleProjectIds(v).includes(filterJob));
    }, [isDriverView, driverScopedData, filterJob, vehicles]);

    const scopeDrivers = useMemo(() => {
      if (isDriverView) return 1;
      const driverNamesInProject = scopeVehicles.map((v) => v.driver).filter((n) => n);
      return drivers.filter((d) => driverNamesInProject.includes(d.name)).length;
    }, [isDriverView, scopeVehicles, drivers]);

    // Calculation Logic with Enhanced Metrics
    const stats = useMemo(() => {
      const filteredReports = scopeReports;
      const filteredVehicles = scopeVehicles;

      const activeVehicles = filteredVehicles.filter(
        (v) => v.status === "Busy"
      ).length;
      const maintenanceVehicles = filteredVehicles.filter(
        (v) => v.status === "Maintenance"
      ).length;
      const emptyVehicles = filteredVehicles.filter(
        (v) => v.status === "Ready" && (!v.driver || v.driver === "")
      ).length;
      const totalVehiclesCount = filteredVehicles.length;

      const convertFuelToLiters = (fuelValue: any) => {
        if (!fuelValue) return 0;
        const value = typeof fuelValue === 'string' ? parseFloat(fuelValue) : fuelValue;
        if (value > 500) {
          const dieselPrice = 35;
          return parseFloat((value / dieselPrice).toFixed(1));
        }
        return parseFloat(value.toFixed(1));
      };

      const totalFuel = filteredReports.reduce(
        (acc, curr) => acc + convertFuelToLiters(curr.fuelLiters),
        0
      );
      const todayFuel = filteredReports
        .filter((r) => isToday(r.date))
        .reduce((acc, curr) => acc + convertFuelToLiters(curr.fuelLiters), 0);
      const weekFuel = filteredReports
        .filter((r) => isThisWeek(r.date))
        .reduce((acc, curr) => acc + convertFuelToLiters(curr.fuelLiters), 0);
      const monthFuel = filteredReports
        .filter((r) => isThisMonth(r.date))
        .reduce((acc, curr) => acc + convertFuelToLiters(curr.fuelLiters), 0);

      const driverScopedVehicleIds = isDriverView && driverScopedData ? driverScopedData.vehicleIds : null;
      const totalMaintenance = maintenanceLogs.reduce((acc, curr) => {
        if (driverScopedVehicleIds && !driverScopedVehicleIds.includes(curr.vehicleId)) return acc;
        if (filterJob !== "all" && !isDriverView) {
          const v = vehicles.find((veh) => veh.id === curr.vehicleId);
          if (!v || !getVehicleProjectIds(v).includes(filterJob)) return acc;
        }
        return acc + (parseFloat(curr.cost) || 0);
      }, 0);

      const vehicleTypeStats: Record<string, number> = {};
      filteredVehicles.forEach((v) => {
        vehicleTypeStats[v.type] = (vehicleTypeStats[v.type] || 0) + 1;
      });

      const emptyVehiclesList = filteredVehicles.filter(
        (v) => v.status === "Ready" && (!v.driver || v.driver === "")
      );

      return {
        activeVehicles,
        maintenanceVehicles,
        emptyVehicles,
        emptyVehiclesList,
        totalVehiclesCount,
        totalFuel,
        todayFuel,
        weekFuel,
        monthFuel,
        totalMaintenance,
        driverCount: scopeDrivers,
        vehicleTypeStats,
        brokenVehicles: maintenanceVehicles,
      };
    }, [scopeReports, scopeVehicles, scopeDrivers, filterJob, isDriverView, driverScopedData, maintenanceLogs, drivers]);

    const handleAcknowledgeBreakdown = async (report: any) => {
      if (window.confirm("ยืนยันรับเรื่องการแจ้งซ่อมนี้?")) {
        await updateData("breakdown_reports", report.id, {
          status: "Acknowledged",
        });
        logActivity(
          "Breakdown Acknowledged",
          `Admin acknowledged report for ${getVehicleName(report.vehicleId)}`
        );
      }
    };

    const driverProjects = isDriverView && driverScopedData
      ? projects.filter((p) => (p.id != null && driverScopedData.projectIds.includes(p.id)))
      : projects;

    return (
      <div className="space-y-4 p-2 animate-fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="text-2xl">📊</span>
            {isDriverView ? "ภาพรวมของฉัน" : "ภาพรวมโครงการ (Dashboard)"}
          </h2>
          {!isDriverView && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">🔽</span>
              <select
                className="input-field max-w-[200px] text-sm py-1.5"
                value={filterJob}
                onChange={(e) => setFilterJob(e.target.value)}
              >
                <option value="all">ทุกโครงการ</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.jobNo} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isDriverView && driverProjects.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">🔽</span>
              <select
                className="input-field max-w-[200px] text-sm py-1.5"
                value={filterJob}
                onChange={(e) => setFilterJob(e.target.value)}
              >
                <option value="all">ทุกโครงการของฉัน</option>
                {driverProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.jobNo} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isDriverView && (
          <p className="text-slate-500 text-xs font-medium mb-1">ข้อมูลจากรายงานที่คุณส่งเท่านั้น</p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 bg-blue-50/80 border border-blue-100">
            <div className="text-slate-600 text-xs font-medium mb-0.5 flex items-center gap-1">
              <span>🚗</span> {isDriverView ? "รถ/เครื่องจักรที่คุณมีรายงาน" : "เครื่องจักร/รถ ในโครงการ"}
            </div>
            <div className="text-xl font-bold text-slate-800">
              {stats.totalVehiclesCount}{" "}
              <span className="text-xs font-normal text-slate-500">คัน</span>
            </div>
          </Card>
          <Card className="p-3 bg-rose-50/80 border border-rose-100">
            <div className="text-slate-600 text-xs font-medium mb-0.5 flex items-center gap-1">
              <span>🛠️</span> แจ้งซ่อม/เสีย
            </div>
            <div className="text-xl font-bold text-rose-600">
              {stats.brokenVehicles}{" "}
              <span className="text-xs font-normal text-slate-500">คัน</span>
            </div>
          </Card>
          <Card className="p-3 bg-amber-50/80 border border-amber-100">
            <div className="text-slate-600 text-xs font-medium mb-0.5 flex items-center gap-1">
              <span>⛽</span> การใช้น้ำมันรวม
            </div>
            <div className="text-xl font-bold text-slate-800">
              {stats.totalFuel.toLocaleString()}{" "}
              <span className="text-xs font-normal text-slate-500">ลิตร</span>
            </div>
          </Card>
          <Card className="p-3 bg-emerald-50/80 border border-emerald-100">
            <div className="text-slate-600 text-xs font-medium mb-0.5 flex items-center gap-1">
              <span>💰</span> ค่าซ่อมบำรุงสะสม
            </div>
            <div className="text-xl font-bold text-slate-800">
              {stats.totalMaintenance.toLocaleString()}{" "}
              <span className="text-xs font-normal text-slate-500">บาท</span>
            </div>
          </Card>
        </div>

        {/* Vehicle Status Row - Pastel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-3 bg-sky-100/90 border border-sky-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sky-700 text-xs font-medium mb-0.5 flex items-center gap-1">
                  <span>✅</span> รถที่ใช้งานอยู่ (Active)
                </p>
                <p className="text-2xl font-bold text-sky-800">
                  {stats.activeVehicles}{" "}
                  <span className="text-sm font-normal text-sky-600">คัน</span>
                </p>
              </div>
              <span className="text-2xl opacity-80">🚙</span>
            </div>
          </Card>
          <Card className="p-3 bg-rose-100/90 border border-rose-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-rose-700 text-xs font-medium mb-0.5 flex items-center gap-1">
                  <span>🔧</span> รถซ่อม/รอซ่อม (Maintenance)
                </p>
                <p className="text-2xl font-bold text-rose-800">
                  {stats.maintenanceVehicles}{" "}
                  <span className="text-sm font-normal text-rose-600">คัน</span>
                </p>
              </div>
              <span className="text-2xl opacity-80">⚠️</span>
            </div>
          </Card>
          <Card className="p-3 bg-slate-100/90 border border-slate-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-slate-600 text-xs font-medium mb-0.5 flex items-center gap-1">
                  <span>🅿️</span> รถว่าง/ไม่มีคนขับ (Empty)
                </p>
                <p className="text-2xl font-bold text-slate-700">
                  {stats.emptyVehicles}{" "}
                  <span className="text-sm font-normal text-slate-500">คัน</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">ข้อมูลจากทะเบียนรถและเครื่องจักร</p>
              </div>
              <span className="text-2xl opacity-80">🚛</span>
            </div>
            {stats.emptyVehiclesList && stats.emptyVehiclesList.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200/80">
                <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1.5">รายการรถว่าง</p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {stats.emptyVehiclesList.map((v: any) => (
                    <span
                      key={v.id}
                      className="inline-flex items-center gap-1 bg-slate-200/80 text-slate-700 px-2 py-1 rounded text-[10px] font-medium"
                    >
                      {v.plate}
                      <span className="text-slate-400">{v.type}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Fuel Consumption - Pastel */}
          <Card className="p-4 lg:col-span-2 bg-amber-50/60 border border-amber-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⛽</span>
              <h3 className="text-sm font-bold text-slate-700">
                การใช้น้ำมัน (Fuel Consumption)
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-amber-100/70 rounded-lg border border-amber-200/80">
                <p className="text-[10px] text-amber-700 font-semibold uppercase mb-0.5">วันนี้</p>
                <p className="text-lg font-bold text-slate-800">
                  {stats.todayFuel.toLocaleString()}{" "}
                  <span className="text-xs text-slate-500">ลิตร</span>
                </p>
              </div>
              <div className="p-2.5 bg-amber-100/70 rounded-lg border border-amber-200/80">
                <p className="text-[10px] text-amber-700 font-semibold uppercase mb-0.5">สัปดาห์นี้</p>
                <p className="text-lg font-bold text-slate-800">
                  {stats.weekFuel.toLocaleString()}{" "}
                  <span className="text-xs text-slate-500">ลิตร</span>
                </p>
              </div>
              <div className="p-2.5 bg-amber-100/70 rounded-lg border border-amber-200/80">
                <p className="text-[10px] text-amber-700 font-semibold uppercase mb-0.5">เดือนนี้</p>
                <p className="text-lg font-bold text-slate-800">
                  {stats.monthFuel.toLocaleString()}{" "}
                  <span className="text-xs text-slate-500">ลิตร</span>
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-amber-200/50 flex justify-between items-center">
              <span className="text-slate-500 text-xs">รวมทั้งหมด:</span>
              <span className="text-base font-bold text-amber-700">
                {stats.totalFuel.toLocaleString()} ลิตร
              </span>
            </div>
          </Card>

          {/* Driver & Cost - Pastel */}
          <Card className="p-4 space-y-4 bg-violet-50/50 border border-violet-100">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">👥</span>
                <h3 className="text-sm font-bold text-slate-700">จำนวนคนขับ (Drivers)</h3>
              </div>
              <p className="text-2xl font-bold text-violet-800 pl-1">
                {stats.driverCount}{" "}
                <span className="text-xs font-normal text-slate-500">คน</span>
              </p>
              <p className="text-[10px] text-slate-400 pl-1">{isDriverView ? "คุณ" : "ในโครงการที่เลือก"}</p>
            </div>
            <div className="pt-4 border-t border-violet-100">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">💰</span>
                <h3 className="text-sm font-bold text-slate-700">ค่าซ่อมบำรุงสะสม</h3>
              </div>
              <p className="text-2xl font-bold text-emerald-700 pl-1">
                {stats.totalMaintenance.toLocaleString()}{" "}
                <span className="text-xs font-normal text-slate-500">บาท</span>
              </p>
            </div>
          </Card>
        </div>

        {/* Vehicle Types - Compact Pastel */}
        <Card className="p-4 bg-slate-50/80 border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📋</span>
            <h3 className="text-sm font-bold text-slate-700">
              {isDriverView ? "ประเภทรถ/เครื่องจักรที่คุณมีรายงาน" : "ประเภทเครื่องจักรในโครงการ (Vehicle Types)"}
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(stats.vehicleTypeStats).map(([type, count]) => (
              <div
                key={type}
                className="flex justify-between items-center p-2 bg-white/80 rounded-lg border border-slate-100"
              >
                <span className="text-xs font-medium text-slate-600 truncate mr-1" title={type}>
                  {type}
                </span>
                <span className="bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded text-xs font-bold">
                  {count}
                </span>
              </div>
            ))}
            {Object.keys(stats.vehicleTypeStats).length === 0 && (
              <div className="col-span-full text-center text-slate-400 text-xs py-2">
                {isDriverView ? "ยังไม่มีรายงานที่ส่ง" : "ไม่มีข้อมูลรถในโครงการนี้"}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity Table - Compact (Admin: ทั้งหมด / Driver: ของตนเอง) */}
        <Card className="p-3">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-slate-700">
            <span>📄</span> {isDriverView ? "รายงานการทำงานของฉัน (ล่าสุด)" : "รายงานการทำงานล่าสุด (Real-time)"}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="text-slate-600 border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-2 py-1.5 font-semibold text-xs">วันที่</th>
                  <th className="px-2 py-1.5 font-semibold text-xs">Job No.</th>
                  <th className="px-2 py-1.5 font-semibold text-xs">รถ/เครื่องจักร</th>
                  <th className="px-2 py-1.5 font-semibold text-xs">รายละเอียดงาน</th>
                  <th className="px-2 py-1.5 font-semibold text-xs text-center">เวลา</th>
                  <th className="px-2 py-1.5 font-semibold text-xs text-center">ชม.</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {scopeReports.slice(0, 15).map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setViewReport(r)}
                    className="border-b border-slate-100 hover:bg-sky-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="px-2 py-1.5 text-xs">{r.date}</td>
                    <td className="px-2 py-1.5">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium group-hover:bg-white">
                        {getProjectName(r.projectId)}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 font-medium text-xs">{getVehicleName(r.vehicleId)}</td>
                    <td className="px-2 py-1.5 max-w-xs truncate text-xs">{r.workDetails}</td>
                    <td className="px-2 py-1.5 text-center whitespace-nowrap text-slate-500 text-xs">
                      {r.startTime && r.endTime ? `${r.startTime} - ${r.endTime}` : "-"}
                    </td>
                    <td className="px-2 py-1.5 text-center font-bold text-sky-600 text-xs">
                      {r.totalHours ? `${r.totalHours}` : "-"}
                    </td>
                  </tr>
                ))}
                {scopeReports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-center text-slate-400 text-xs">
                      {isDriverView ? "ยังไม่มีรายงานที่คุณส่ง" : firebaseUser ? "ยังไม่มีข้อมูลรายงาน" : "กรุณาตรวจสอบการเชื่อมต่อ Firebase"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Breakdown Reports: Admin เห็นทั้งหมด + จัดการได้, Driver เห็นเฉพาะที่ตนเองแจ้ง (อ่านอย่างเดียว) */}
        {(user?.role === "Admin" || (user?.role === "Driver" && breakdownReports.some((b: any) => (b.reporterId === (user?.empId || user?.id) || b.reporterName === user?.name)))) && (
          <div className="mt-4 animate-fade-in">
            <Card className="p-4 bg-rose-50/60 border border-rose-100">
              <h3 className="font-bold text-sm text-rose-700 flex items-center gap-2 mb-3">
                <span>🚨</span> {isDriverView ? "รายการแจ้งรถเสียที่คุณแจ้ง" : "รายการแจ้งรถเสีย (Breakdown Reports)"}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-rose-100/70 text-rose-800 font-semibold">
                    <tr>
                      <th className="px-2 py-1.5">วันที่/เวลา</th>
                      <th className="px-2 py-1.5">ผู้แจ้ง</th>
                      <th className="px-2 py-1.5">โครงการ</th>
                      <th className="px-2 py-1.5">รถ/ทะเบียน</th>
                      <th className="px-2 py-1.5">อาการเสีย</th>
                      <th className="px-2 py-1.5">สถานะ</th>
                      {!isDriverView && <th className="px-2 py-1.5 text-center">จัดการ</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100">
                    {(isDriverView
                      ? breakdownReports.filter((b: any) => b.reporterId === (user?.empId || user?.id) || b.reporterName === user?.name)
                      : breakdownReports
                    ).map((b) => (
                      <tr key={b.id} className="hover:bg-rose-50/50">
                        <td className="px-2 py-1.5 whitespace-nowrap">{b.date} {b.time}</td>
                        <td className="px-2 py-1.5">{b.reporterName}</td>
                        <td className="px-2 py-1.5">{getProjectName(b.projectId)}</td>
                        <td className="px-2 py-1.5 font-medium">{getVehicleName(b.vehicleId)}</td>
                        <td className="px-2 py-1.5 text-rose-600 font-semibold">{b.symptoms}</td>
                        <td className="px-2 py-1.5">
                          {b.status === "New" ? (
                            <span className="bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                              New!
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                              รับเรื่องแล้ว
                            </span>
                          )}
                        </td>
                        {!isDriverView && (
                          <td className="px-2 py-1.5 text-center">
                            {b.status === "New" && (
                              <button
                                onClick={() => handleAcknowledgeBreakdown(b)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 mx-auto"
                              >
                                <CheckSquare size={12} /> รับทราบ
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {(isDriverView ? breakdownReports.filter((b: any) => b.reporterId === (user?.empId || user?.id) || b.reporterName === user?.name) : breakdownReports).length === 0 && (
                      <tr>
                        <td
                          colSpan={isDriverView ? 6 : 7}
                          className="px-2 py-4 text-center text-slate-400 text-xs"
                        >
                          ไม่มีรายการแจ้งรถเสีย
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };

  const VehicleListView = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});

    // State for repair history in modal
    const [vehicleHistory, setVehicleHistory] = useState<any[]>([]);

    const openModal = (vehicle: any = null) => {
      setEditingVehicle(vehicle);
      if (vehicle) {
        setFormData({
          ...vehicle,
          projectIds: getVehicleProjectIds(vehicle),
        });
        const history = maintenanceLogs.filter(
          (m) => m.vehicleId === vehicle.id
        );
        setVehicleHistory(history);
      } else {
        setFormData({
          type: VEHICLE_TYPES[0],
          status: "Ready",
          projectIds: [],
        });
        setVehicleHistory([]);
      }
      setIsModalOpen(true);
    };

    const handleSave = async () => {
      const projectIds = Array.isArray(formData.projectIds) ? formData.projectIds : [];
      const payload = {
        ...formData,
        projectIds,
        currentProjectId: projectIds[0] || "", // backward compat
      };
      if (editingVehicle) {
        await updateData("vehicles", editingVehicle.id, payload);
        logActivity("Update Vehicle", `Updated vehicle: ${formData.plate}`);
      } else {
        await addData("vehicles", payload);
        logActivity("Add Vehicle", `Added new vehicle: ${formData.plate}`);
      }
      setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
      if (window.confirm("ยืนยันการลบข้อมูล?")) {
        await deleteData("vehicles", id);
        logActivity("Delete Vehicle", `Deleted vehicle ID: ${id}`);
      }
    };

    return (
      <div className="space-y-8 p-2">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600">
              <Truck size={28} />
            </div>
            ทะเบียนรถและเครื่องจักร
          </h2>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all font-medium"
          >
            <Plus size={20} /> เพิ่มรถใหม่
          </button>
        </div>

        {vehicles.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">ไม่มีข้อมูลรถในระบบ</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* รถที่ยังไม่ได้เข้าโครงการ = Card เล็กๆ ด้านบน */}
            {(() => {
              const noProjectVehicles = vehicles.filter((v) => getVehicleProjectIds(v).length === 0);
              if (noProjectVehicles.length === 0) return null;
              return (
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <AlertCircle size={16} /> รถที่ยังไม่ได้เข้าโครงการ ({noProjectVehicles.length})
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {noProjectVehicles.map((v) => (
                      <div
                        key={v.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openModal(v)}
                        onKeyDown={(e) => e.key === "Enter" && openModal(v)}
                        className="cursor-pointer"
                      >
                        <Card className="p-4 flex items-center gap-4 min-w-0 hover:shadow-lg transition-all">
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-600 shrink-0">
                            <Truck size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 truncate">{v.plate}</div>
                            <div className="text-xs text-slate-500">{v.type}</div>
                            <Badge status={v.status} />
                          </div>
                          <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openModal(v)}
                              className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200"
                            >
                              แก้ไข
                            </button>
                            <button
                              onClick={() => v.id && handleDelete(v.id)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ตารางแยกตามโครงการ - โครงการที่ไม่มีรถไม่แสดง */}
            {projects
              .filter((p): p is Project & { id: string } => !!p.id && vehicles.some((v) => getVehicleProjectIds(v).includes(p.id!)))
              .map((project) => {
                const projectVehicles = vehicles.filter((v) => getVehicleProjectIds(v).includes(project.id));
                if (projectVehicles.length === 0) return null;
                return (
                  <Card key={project.id} className="overflow-hidden">
                    <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/80">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Briefcase size={18} className="text-amber-600" />
                        {project.jobNo} - {project.name}
                        <span className="text-xs font-normal text-slate-500">({projectVehicles.length} คัน)</span>
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed text-xs text-left border-collapse">
                        <colgroup>
                          <col className="w-[14%]" />
                          <col className="w-[20%]" />
                          <col className="w-[12%]" />
                          <col className="w-[14%]" />
                          <col className="w-[22%]" />
                          <col className="w-[18%]" />
                        </colgroup>
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-1.5">ทะเบียน</th>
                            <th className="px-3 py-1.5">ประเภท</th>
                            <th className="px-3 py-1.5">สถานะ</th>
                            <th className="px-3 py-1.5">คนขับ</th>
                            <th className="px-3 py-1.5">ทะเบียน/ภาษีหมดอายุ</th>
                            <th className="px-3 py-1.5 text-right">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {projectVehicles.map((v) => (
                            <tr
                              key={v.id}
                              onClick={() => openModal(v)}
                              className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                            >
                              <td className="px-3 py-1.5 font-semibold text-slate-800 truncate" title={v.plate}>{v.plate}</td>
                              <td className="px-3 py-1.5 text-slate-600 truncate" title={v.type}>{v.type}</td>
                              <td className="px-3 py-1.5">
                                <Badge status={v.status} />
                              </td>
                              <td className="px-3 py-1.5 text-slate-600 truncate" title={v.driver || ""}>{v.driver || "-"}</td>
                              <td className="px-3 py-1.5">
                                <span className={v.regExp && v.regExp < "2024-01-01" ? "text-red-600 font-medium" : "text-slate-600"}>
                                  {v.regExp || "-"}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => openModal(v)}
                                    className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200"
                                  >
                                    แก้ไข
                                  </button>
                                  <button
                                    onClick={() => v.id && handleDelete(v.id)}
                                    className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200"
                                  >
                                    ยกเลิก
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                );
              })}
          </div>
        )}

        {/* Modal for Add/Edit Vehicle & History */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[100] animate-fade-in backdrop-blur-sm">
            <Card className="w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl border-0">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <h3 className="text-2xl font-bold flex items-center gap-3 text-slate-800">
                  {editingVehicle ? (
                    <>
                      <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <Pencil size={24} />
                      </div>{" "}
                      ข้อมูลรถ & ประวัติการซ่อม
                    </>
                  ) : (
                    <>
                      <div className="bg-green-100 p-2 rounded-lg text-green-600">
                        <Plus size={24} />
                      </div>{" "}
                      เพิ่มรถใหม่
                    </>
                  )}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="p-8 grid grid-cols-1 gap-10">
                {/* Form Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h4 className="font-semibold text-blue-800 border-b border-blue-100 pb-3 flex items-center gap-2 text-lg">
                      🚙 ข้อมูลทั่วไป
                    </h4>
                    <div>
                      <label className="label">ประเภทรถ</label>
                      <select
                        className="input-field"
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({ ...formData, type: e.target.value })
                        }
                      >
                        {VEHICLE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="label">ทะเบียน</label>
                        <input
                          type="text"
                          className="input-field"
                          value={formData.plate || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, plate: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="label">ยี่ห้อ/รุ่น</label>
                        <input
                          type="text"
                          className="input-field"
                          value={formData.brand || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, brand: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">📅 วันที่ซื้อ</label>
                      <input
                        type="date"
                        className="input-field"
                        value={formData.purchaseDate || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            purchaseDate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h4 className="font-semibold text-blue-800 border-b border-blue-100 pb-3 flex items-center gap-2 text-lg">
                      🚦 สถานะ & คนขับ
                    </h4>
                    <div>
                      <label className="label">สถานะปัจจุบัน</label>
                      <select
                        className="input-field"
                        value={formData.status || "Ready"}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                      >
                        <option value="Ready">พร้อมใช้งาน</option>
                        <option value="Maintenance">ซ่อมบำรุง/เสีย</option>
                        <option value="Busy">กำลังทำงาน</option>
                      </select>
                    </div>
                    
                    <h4 className="font-semibold text-blue-800 border-b border-blue-100 pb-3 flex items-center gap-2 text-lg mt-6">
                      📍 โครงการที่ประจำ (เลือกได้หลายโครงการ)
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                      {projects.length === 0 ? (
                        <p className="text-slate-500 text-sm">ยังไม่มีโครงการในระบบ</p>
                      ) : (
                        projects.filter((p) => p.id).map((p) => {
                          const ids: string[] = Array.isArray(formData.projectIds) ? formData.projectIds : [];
                          const checked = ids.includes(p.id!);
                          return (
                            <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...ids, p.id!]
                                    : ids.filter((id) => id !== p.id);
                                  setFormData({ ...formData, projectIds: next });
                                }}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-slate-700">{p.jobNo} - {p.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-6 mt-4">
                      <div>
                        <label className="label">ประกันหมดอายุ</label>
                        <input
                          type="date"
                          className="input-field"
                          value={formData.insuranceExp || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              insuranceExp: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="label">ต่อภาษี</label>
                        <input
                          type="date"
                          className="input-field"
                          value={formData.regExp || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, regExp: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Repair History Section (Only when editing) */}
                {editingVehicle && (
                  <div className="border-t border-slate-200 pt-8">
                    <h4 className="font-semibold text-slate-800 text-xl mb-4 flex items-center gap-2">
                      <Wrench size={20} /> ประวัติการซ่อมบำรุง (
                      {vehicleHistory.length})
                    </h4>
                    {vehicleHistory.length > 0 ? (
                      <div className="overflow-x-auto bg-slate-50 rounded-xl border border-slate-200">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="p-3">วันที่</th>
                              <th className="p-3">อาการ/สาเหตุ</th>
                              <th className="p-3">การซ่อม</th>
                              <th className="p-3 text-right">ค่าใช้จ่าย</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {vehicleHistory.map((h, idx) => (
                              <tr key={idx}>
                                <td className="p-3 whitespace-nowrap text-slate-500">
                                  {h.date}
                                </td>
                                <td className="p-3">
                                  <div className="font-medium">{h.issue}</div>
                                  <div className="text-xs text-slate-500">
                                    {h.cause}
                                  </div>
                                </td>
                                <td className="p-3 text-slate-600">
                                  {h.repairItems || "-"}
                                </td>
                                <td className="p-3 text-right font-bold text-slate-700">
                                  {parseInt(h.cost || "0").toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        ยังไม่มีประวัติการซ่อม
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4 sticky bottom-0 z-10">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary shadow-lg shadow-blue-600/20"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };

  const MaintenanceView = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<any>(null);
    const [maintenanceForm, setMaintenanceForm] = useState({
      vehicleId: "",
      date: new Date().toISOString().split("T")[0],
      issue: "",
      cause: "",
      repairItems: "",
      cost: "",
      status: "Pending",
      finishDate: "",
    });

    const openModal = (log: any = null) => {
      setEditingLog(log);
      if (log) {
        setMaintenanceForm({ 
          vehicleId: log.vehicleId || "",
          date: log.date || new Date().toISOString().split("T")[0],
          issue: log.issue || "",
          cause: log.cause || "",
          repairItems: log.repairItems || "",
          cost: log.cost || "",
          status: log.status || "Pending",
          finishDate: log.finishDate || "",
        });
      } else {
        setMaintenanceForm({
          vehicleId: "",
          date: new Date().toISOString().split("T")[0],
          issue: "",
          cause: "",
          repairItems: "",
          cost: "",
          status: "Pending",
          finishDate: "",
        });
      }
      setIsModalOpen(true);
    };

    const handleSaveMaintenance = async () => {
      if (!maintenanceForm.vehicleId) return alert("กรุณาเลือกทะเบียนรถ");
      const payload = {
        ...maintenanceForm,
        cost: parseFloat(maintenanceForm.cost) || 0,
      };
      if (editingLog) {
        await updateData("maintenance_logs", editingLog.id, payload);
        logActivity(
          "Edit Maintenance",
          `Edited maintenance log for vehicle ID: ${maintenanceForm.vehicleId}`
        );
      } else {
        await addData("maintenance_logs", payload);
        logActivity(
          "Add Maintenance",
          `Added maintenance log for vehicle ID: ${maintenanceForm.vehicleId}`
        );
      }
      setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
      if (window.confirm("ยืนยันการลบประวัติการซ่อมนี้?")) {
        await deleteData("maintenance_logs", id);
        logActivity("Delete Maintenance", `Deleted maintenance log ID: ${id}`);
      }
    };

    return (
      <div className="space-y-8 p-2">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <div className="bg-orange-100 p-2.5 rounded-xl text-orange-600 inline-flex">
              <Wrench size={28} />
            </div>
            ประวัติการซ่อมบำรุง
          </h2>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-all"
          >
            <Plus size={18} /> แจ้งซ่อม/บันทึกประวัติ
          </button>
        </div>

        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-700 border-b text-sm">
                <tr>
                  <th className="p-3">วันที่แจ้ง</th>
                  <th className="p-3">ทะเบียนรถ</th>
                  <th className="p-3">อาการเสีย/สาเหตุ/รายการซ่อม</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3">เสร็จสิ้น</th>
                  <th className="p-3 text-right">ค่าใช้จ่าย</th>
                  <th className="p-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {maintenanceLogs.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="p-3 align-top whitespace-nowrap">
                      {m.date}
                    </td>
                    <td className="p-3 align-top font-medium">
                      {getVehicleName(m.vehicleId)}
                    </td>
                    <td className="p-3 align-top">
                      <div className="font-medium text-slate-800">
                        {m.issue}
                      </div>
                      <div className="text-xs text-slate-500">{m.cause}</div>
                      {m.repairItems && (
                        <div className="text-xs text-slate-400 mt-1 border-t border-slate-100 pt-1">
                          🛠️ {m.repairItems}
                        </div>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      <Badge status={m.status} type="maintenance" />
                    </td>
                    <td className="p-3 align-top whitespace-nowrap">
                      {m.finishDate || "-"}
                    </td>
                    <td className="p-3 align-top text-right font-bold text-slate-700">
                      {parseInt(m.cost || 0).toLocaleString()}
                    </td>
                    <td className="p-3 align-top text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openModal(m)}
                          className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="text-red-600 hover:bg-red-50 p-1 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {maintenanceLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      ยังไม่มีข้อมูลการซ่อมบำรุง
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] animate-fade-in backdrop-blur-sm">
            <Card className="w-full max-w-2xl max-h-[95vh] h-full overflow-y-auto shadow-2xl flex flex-col">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-lg sticky top-0 z-10 shrink-0">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  {editingLog ? (
                    <>✏️ แก้ไขรายการซ่อม</>
                  ) : (
                    <>📝 บันทึกการแจ้งซ่อมใหม่</>
                  )}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="label">🆔 ทะเบียนรถ</label>
                      <select
                        className="input-field"
                        value={maintenanceForm.vehicleId}
                        onChange={(e) =>
                          setMaintenanceForm({
                            ...maintenanceForm,
                            vehicleId: e.target.value,
                          })
                        }
                      >
                        <option value="">-- เลือกทะเบียน --</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.plate} ({v.type})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">📅 วันที่แจ้งซ่อม</label>
                      <input
                        type="date"
                        className="input-field"
                        value={maintenanceForm.date}
                        onChange={(e) =>
                          setMaintenanceForm({
                            ...maintenanceForm,
                            date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="label">⚠️ อาการเสีย</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="เช่น แอร์ไม่เย็น"
                      value={maintenanceForm.issue}
                      onChange={(e) =>
                        setMaintenanceForm({
                          ...maintenanceForm,
                          issue: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">🔧 สาเหตุ</label>
                    <textarea
                      className="input-field h-24"
                      placeholder="ระบุสาเหตุที่เสีย..."
                      value={maintenanceForm.cause}
                      onChange={(e) =>
                        setMaintenanceForm({
                          ...maintenanceForm,
                          cause: e.target.value,
                        })
                      }
                    ></textarea>
                  </div>
                  <div>
                    <label className="label">🛠️ รายการซ่อม/อะไหล่</label>
                    <textarea
                      className="input-field h-24"
                      placeholder="ระบุรายการซ่อมและอะไหล่ที่เปลี่ยน..."
                      value={maintenanceForm.repairItems}
                      onChange={(e) =>
                        setMaintenanceForm({
                          ...maintenanceForm,
                          repairItems: e.target.value,
                        })
                      }
                    ></textarea>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="label">💰 ค่าใช้จ่าย</label>
                      <input
                        type="number"
                        className="input-field font-semibold text-blue-700"
                        placeholder="0.00"
                        value={maintenanceForm.cost}
                        onChange={(e) =>
                          setMaintenanceForm({
                            ...maintenanceForm,
                            cost: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">📊 สถานะ</label>
                      <select
                        className="input-field"
                        value={maintenanceForm.status}
                        onChange={(e) =>
                          setMaintenanceForm({
                            ...maintenanceForm,
                            status: e.target.value,
                          })
                        }
                      >
                        {MAINTENANCE_STATUS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="label">✅ วันที่ซ่อมเสร็จ</label>
                    <input
                      type="date"
                      className="input-field"
                      value={maintenanceForm.finishDate}
                      onChange={(e) =>
                        setMaintenanceForm({
                          ...maintenanceForm,
                          finishDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t bg-slate-50 flex justify-end gap-3 rounded-b-lg shrink-0">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  ยกเลิก
                </button>
                <button onClick={handleSaveMaintenance} className="btn-primary">
                  บันทึกข้อมูล
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };

  const ProjectView = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [formData, setFormData] = useState<ProjectFormData>({
      jobNo: "",
      name: "",
      location: "",
      pm: "",
      cm: "",
      machineRespName: "",
      machineRespPhone: "",
    });

    const openModal = (project: Project | null = null) => {
      if (project) {
        setEditingProject(project);
        setFormData({
          jobNo: project.jobNo || "",
          name: project.name || project.projectName || "",
          location: project.location || "",
          pm: project.pm || "",
          cm: project.cm || "",
          machineRespName: project.machineRespName || "",
          machineRespPhone: project.machineRespPhone || "",
        });
      } else {
        setEditingProject(null);
        setFormData({
          jobNo: "",
          name: "",
          location: "",
          pm: "",
          cm: "",
          machineRespName: "",
          machineRespPhone: "",
        });
      }
      setIsModalOpen(true);
    };

    const handleSaveProject = async () => {
      if (!formData.jobNo || !formData.name)
        return alert("กรุณากรอกข้อมูลสำคัญ (Job No, ชื่อโครงการ)");
      if (editingProject && editingProject.id) {
        await updateData("projects", editingProject.id, formData);
        logActivity("Edit Project", `Edited project: ${formData.jobNo}`);
      } else {
        await addData("projects", formData);
        logActivity("Create Project", `Created project: ${formData.jobNo}`);
      }
      setIsModalOpen(false);
    };

    const handleDelete = async (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (window.confirm("ยืนยันการลบโครงการนี้?")) {
        await deleteData("projects", id);
        logActivity("Delete Project", `Deleted project ID: ${id}`);
      }
    };

    return (
      <div className="space-y-8 p-2">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600">
              <Briefcase size={28} />
            </div>
            ข้อมูลโครงการ
          </h2>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all font-medium"
          >
            <Plus size={20} /> เพิ่มโครงการ
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group bg-gradient-to-br from-white to-amber-50/30 border border-amber-100 relative"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-3 border-2 border-white shadow">
                  <Briefcase size={28} className="text-amber-600" />
                </div>
                <div className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-lg uppercase tracking-wide mb-2">
                  {p.jobNo}
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-2 line-clamp-2 min-h-[2.5rem]" title={p.name || p.projectName}>
                  {p.name || p.projectName}
                </h3>
                <div className="text-xs text-slate-500 flex items-center justify-center gap-1 mb-2 truncate w-full" title={p.location || "ไม่ได้ระบุ"}>
                  <MapPin size={12} /> {p.location || "-"}
                </div>
                <div className="flex gap-3 text-xs border-t border-slate-100 pt-2 w-full justify-center">
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-semibold">PM</span>
                    <span className="font-medium text-slate-700 truncate block max-w-[80px]" title={p.pm || "-"}>{p.pm || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-semibold">CM</span>
                    <span className="font-medium text-slate-700 truncate block max-w-[80px]" title={p.cm || "-"}>{p.cm || "-"}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openModal(p)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={(e) => p.id && handleDelete(p.id, e)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
          {projects.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <Briefcase className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">ยังไม่มีข้อมูลโครงการ</p>
            </div>
          )}
        </div>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[100] animate-fade-in backdrop-blur-sm">
            <Card className="w-full max-w-lg shadow-2xl border-0">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white/95 backdrop-blur-md rounded-t-2xl">
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  {editingProject ? (
                    <>
                      <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <Pencil size={24} />
                      </div>{" "}
                      แก้ไขโครงการ
                    </>
                  ) : (
                    <>
                      <div className="bg-green-100 p-2 rounded-lg text-green-600">
                        <Plus size={24} />
                      </div>{" "}
                      เพิ่มโครงการใหม่
                    </>
                  )}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="label">Job No.</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="เช่น JOB-67001"
                    value={formData.jobNo}
                    onChange={(e) =>
                      setFormData({ ...formData, jobNo: e.target.value })
                    }
                    disabled={!!editingProject}
                  />
                </div>
                <div>
                  <label className="label">ชื่อโครงการ</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="ชื่อโครงการ"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">สถานที่</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="จังหวัด / สถานที่ตั้ง"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="label">Project Manager (PM)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.pm}
                      onChange={(e) =>
                        setFormData({ ...formData, pm: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Const. Manager (CM)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.cm}
                      onChange={(e) =>
                        setFormData({ ...formData, cm: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 mt-2">
                  <h4 className="font-semibold text-slate-700 mb-3 text-sm">
                    ผู้รับผิดชอบเครื่องจักร (Machine Resp.)
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="label">ชื่อ (Name)</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="ชื่อผู้รับผิดชอบ"
                        value={formData.machineRespName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            machineRespName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">เบอร์โทร (Phone)</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="เบอร์โทรศัพท์"
                        value={formData.machineRespPhone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            machineRespPhone: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4 rounded-b-2xl">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveProject}
                  className="btn-primary shadow-lg shadow-blue-600/20"
                >
                  บันทึก
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };

  const DriverView = () => {
    // กรองเฉพาะผู้ใช้ที่เป็นคนขับ
    const driverUsers = usersList.filter(u => u.role === "Driver");

    return (
      <div className="space-y-8 p-2">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <div className="bg-violet-100 p-2.5 rounded-xl text-violet-600">
              <User size={28} />
            </div>
            ข้อมูลพนักงานขับรถ
          </h2>
        </div>
        {driverUsers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <Users className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">ยังไม่มีข้อมูลคนขับรถ</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {driverUsers.map((u) => (
              <Card
                key={u.id}
                className="p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group bg-gradient-to-br from-white to-blue-50/30 border border-blue-100"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow mb-3">
                    <User size={28} className="text-blue-600" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mb-1 truncate w-full">
                    {u.name}
                  </h3>
                  <div className="text-xs text-slate-600 flex items-center justify-center gap-1 mb-1">
                    <User size={12} /> {u.empId}
                  </div>
                  <div className="text-xs text-slate-500 truncate w-full mb-2" title={u.email || "-"}>
                    {u.email || "-"}
                  </div>
                  {u.projectId && (
                    <div className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full mb-1 font-medium truncate w-full" title={projects.find(p => p.id === u.projectId)?.name || projects.find(p => p.id === u.projectId)?.projectName || "-"}>
                      🏗️ {projects.find(p => p.id === u.projectId)?.name || projects.find(p => p.id === u.projectId)?.projectName || "-"}
                    </div>
                  )}
                  {u.vehicleIds && u.vehicleIds.length > 0 ? (
                    <div className="flex flex-wrap gap-0.5 justify-center mb-2">
                      {u.vehicleIds.slice(0, 3).map((vId) => {
                        const vehicle = vehicles.find(v => v.id === vId);
                        return vehicle ? (
                          <span key={vId} className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                            🚗 {vehicle.plate}
                          </span>
                        ) : null;
                      })}
                      {u.vehicleIds.length > 3 && <span className="text-[10px] text-slate-400">+{u.vehicleIds.length - 3}</span>}
                    </div>
                  ) : u.vehicleId && (
                    <div className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full mb-2 font-medium">
                      🚗 {vehicles.find(v => v.id === u.vehicleId)?.plate || "-"}
                    </div>
                  )}
                  <div className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit font-medium">
                    {u.status === "Approved" ? "✅ อนุมัติ" : "⏳ รอ"}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // --- STYLES ---
  const styleTags = `
    .input-field { width: 100%; padding: 0.75rem 1rem; font-size: 0.95rem; border: 1px solid #cbd5e1; background-color: #ffffff; border-radius: 0.5rem; outline: none; transition: all 0.2s; }
    .input-field:focus { border-color: #2563eb; ring: 2px; ring-color: #bfdbfe; }
    .input-field-icon { width: 100%; padding: 0.75rem 1rem 0.75rem 3rem; font-size: 0.95rem; border: 1px solid #cbd5e1; background-color: #ffffff; border-radius: 0.5rem; outline: none; transition: all 0.2s; } 
    .input-field-icon:focus { border-color: #2563eb; ring: 2px; ring-color: #bfdbfe; }
    .label { display: block; font-size: 0.9rem; font-weight: 600; color: #334155; margin-bottom: 0.4rem; }
    .btn-primary { background-color: #2563eb; color: white; padding: 0.6rem 1.2rem; border-radius: 0.5rem; font-weight: 600; transition: all 0.2s; }
    .btn-primary:hover { background-color: #1d4ed8; transform: translateY(-1px); }
    .btn-secondary { background-color: white; color: #475569; border: 1px solid #cbd5e1; padding: 0.6rem 1.2rem; border-radius: 0.5rem; font-weight: 600; transition: all 0.2s; }
    .btn-secondary:hover { background-color: #f1f5f9; }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

    @keyframes strobe {
        0% { background-color: #ef4444; color: white; transform: scale(1); }
        50% { background-color: white; color: #ef4444; border-color: #ef4444; transform: scale(1.1); }
        100% { background-color: #ef4444; color: white; transform: scale(1); }
    }
    .strobe-anim {
        animation: strobe 1s infinite;
    }
  `;

  // --- RENDER ---
  if (!user) return <LoginView />;
  const newBreakdownCount = breakdownReports.filter(
    (b: any) => b.status === "New"
  ).length;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800 flex-col">
      <style>{styleTags}</style>

      {viewReport && (
        <ReportDetailModal
          report={viewReport}
          onClose={() => setViewReport(null)}
          vehicleName={getVehicleName(viewReport.vehicleId)}
          projectName={getProjectName(viewReport.projectId)}
        />
      )}

      <header className="bg-white shadow-md z-20 border-b border-slate-200 sticky top-0">
        <div className="flex justify-between items-center px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg shadow-blue-600/30 shadow-lg">
              <Truck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
                CMG EQM
              </h1>
              <div className="text-[10px] font-bold text-slate-400">
                MANAGEMENT SYSTEM
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user.role === "Admin" && (
              <div
                className="relative cursor-pointer mr-2"
                onClick={() => setActiveTab("dashboard")}
              >
                <Bell
                  size={28}
                  className="text-slate-600 hover:text-blue-600 transition-colors"
                />
                {newBreakdownCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center strobe-anim shadow-md border-2 border-white">
                    {newBreakdownCount}
                  </div>
                )}
              </div>
            )}
            <div className="text-right hidden sm:block">
              <div className="font-bold text-slate-800">{user.name}</div>
              <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full inline-block">
                {user.role}
              </div>
            </div>
            <button
              onClick={() => setUser(null)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="flex overflow-x-auto px-6 py-2 gap-2 bg-white border-t border-slate-100 scrollbar-hide">
          {(user.role === "Admin" || user.role === "Driver") && (
            <NavButton
              icon={LayoutDashboard}
              label="ภาพรวม"
              active={activeTab === "dashboard"}
              onClick={() => setActiveTab("dashboard")}
              activeBg="bg-slate-700 text-white shadow-lg shadow-slate-700/25"
            />
          )}

          <NavButton
            icon={FileText}
            label="รายงานประจำวัน"
            active={activeTab === "daily"}
            onClick={() => setActiveTab("daily")}
            activeBg="bg-blue-600 text-white shadow-lg shadow-blue-600/25"
          />
          {user.role !== "Driver" && (
            <>
              <NavButton
                icon={Truck}
                label="ทะเบียนรถ"
                active={activeTab === "fleet"}
                onClick={() => setActiveTab("fleet")}
                activeBg="bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
              />
              <NavButton
                icon={Briefcase}
                label="โครงการ"
                active={activeTab === "projects"}
                onClick={() => setActiveTab("projects")}
                activeBg="bg-amber-600 text-white shadow-lg shadow-amber-600/25"
              />
              <NavButton
                icon={Wrench}
                label="ซ่อมบำรุง"
                active={activeTab === "maintenance"}
                onClick={() => setActiveTab("maintenance")}
                activeBg="bg-orange-600 text-white shadow-lg shadow-orange-600/25"
              />
              <NavButton
                icon={User}
                label="คนขับ"
                active={activeTab === "drivers"}
                onClick={() => setActiveTab("drivers")}
                activeBg="bg-violet-600 text-white shadow-lg shadow-violet-600/25"
              />
            </>
          )}
          {user.role === "Admin" && (
            <NavButton
              icon={Shield}
              label="จัดการผู้ใช้ (Admin)"
              active={activeTab === "admin_users"}
              onClick={() => setActiveTab("admin_users")}
              className="ml-auto"
              activeBg="bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
            />
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto animate-fade-in">
          {activeTab === "dashboard" && (user.role === "Admin" || user.role === "Driver") && (
            <DashboardView />
          )}
          {activeTab === "daily" && (
            <DailyReportViewInner
              key="daily-report-view"
              dailyReports={dailyReports}
              vehicles={vehicles}
              projects={projects}
              user={user}
              addData={addData}
              updateData={updateData}
              deleteData={deleteData}
              logActivity={logActivity}
              getVehicleName={getVehicleName}
              getProjectName={getProjectName}
              setViewReport={setViewReport}
            />
          )}
          {activeTab === "fleet" && <VehicleListView />}
          {activeTab === "maintenance" && <MaintenanceView />}
          {activeTab === "projects" && <ProjectView />}
          {activeTab === "drivers" && <DriverView />}
          {activeTab === "admin_users" && user.role === "Admin" && (
            <AdminUserView />
          )}
        </div>
      </main>
    </div>
  );
}
