import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  ChevronDown,
  Check,
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
  Sun,
  Moon,
  Sparkles,
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
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDWmurzN4zlvKjuQPE2AVuC3foTFnitVgQ",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "cmg-equipment-supervisor.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "cmg-equipment-supervisor",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "cmg-equipment-supervisor.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "332306227075",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:332306227075:web:68425b0229b1e95b20a0b6",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-XRS8ZCRX4P",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = "cmg-equipment-supervisor";

const isPdfUrl = (url?: string): boolean => {
  if (!url) return false;
  return /\.pdf($|\?)/i.test(url) || url.toLowerCase().includes(".pdf");
};

const uploadImageToStorage = (
  file: File,
  folder: string,
  onProgress: (p: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `${appId}/${folder}/${fileName}`;
    const fileRef = storageRef(storage, path);
    const uploadTask = uploadBytesResumable(fileRef, file);

    const timeoutId = setTimeout(() => {
      uploadTask.cancel();
      reject(new Error("หมดเวลา — กรุณาตรวจสอบ Firebase Storage Rules: ต้องอนุญาต allow read, write: if request.auth != null;"));
    }, 30000);

    uploadTask.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress(pct);
      },
      (err) => {
        clearTimeout(timeoutId);
        if ((err as any).code === "storage/unauthorized") {
          reject(new Error("ไม่มีสิทธิ์อัพโหลด — กรุณาแก้ไข Firebase Storage Rules ให้เป็น: allow read, write: if request.auth != null;"));
        } else if ((err as any).code === "storage/canceled") {
          reject(new Error("ยกเลิกการอัพโหลด"));
        } else {
          reject(err);
        }
      },
      async () => {
        clearTimeout(timeoutId);
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
};

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
  "Crane 25 ton",
];

// ประเภทที่ต้องมีช่อง ปจ.2
const MACHINE_TYPES = ["รถเฮียบ", "รถ JCB", "รถ Backhole (PC30)", "รถ Backhole (PC200)", "Crane 25 ton"];
const isMachineVehicle = (type: string) => MACHINE_TYPES.some((m) => type?.includes(m) || m?.includes(type));

const MAINTENANCE_STATUS = [
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
];

// --- COMPONENTS ---

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`bg-white rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-200/90 text-slate-800 transition-all ${className}`}
  >
    {children}
  </div>
);

const MaintenanceStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "InProgress":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          กำลังซ่อม
        </span>
      );
    case "Completed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          ซ่อมเสร็จแล้ว
        </span>
      );
    case "Pending":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          รอการซ่อม
        </span>
      );
    case "Cancelled":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          ยกเลิก
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
          {status}
        </span>
      );
  }
};

const Badge = ({ status, type = "vehicle" }: { status: string; type?: string }) => {
  if (type === "maintenance") {
    return <MaintenanceStatusBadge status={status} />;
  }

  const styles: Record<string, string> = {
    Ready: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    Maintenance: "bg-rose-50 text-rose-700 border-rose-200/80",
    Busy: "bg-blue-50 text-blue-700 border-blue-200/80",
    Other: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
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

const NavButton = ({
  icon: Icon,
  label,
  active,
  onClick,
  className = "",
  activeBg = "bg-blue-600 text-white shadow-sm"
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
  activeBg?: string;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
      active
        ? `${activeBg} shadow-sm`
        : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
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
  const [modalLightboxIdx, setModalLightboxIdx] = useState<number | null>(null);
  if (!report) return null;

  const allPhotos: string[] = report.photos && report.photos.length > 0
    ? report.photos
    : report.photo ? [report.photo] : [];

  const prevModalPhoto = () => setModalLightboxIdx((i) => i !== null ? (i - 1 + allPhotos.length) % allPhotos.length : null);
  const nextModalPhoto = () => setModalLightboxIdx((i) => i !== null ? (i + 1) % allPhotos.length : null);

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

          {/* Photos */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              รูปภาพหน้างาน {allPhotos.length > 0 && <span className="text-blue-500 normal-case font-normal">({allPhotos.length} รูป)</span>}
            </label>
            {allPhotos.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allPhotos.map((url, idx) => (
                  <div
                    key={idx}
                    className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-100 cursor-pointer hover:shadow-md hover:scale-105 transition-all"
                    onClick={() => setModalLightboxIdx(idx)}
                  >
                    <img src={url} alt={`รูป ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-24 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <Camera size={24} className="mb-1 opacity-40" />
                <span className="text-xs">ไม่มีรูปภาพแนบ</span>
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

      {/* Lightbox inside modal */}
      {modalLightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center"
          onClick={() => setModalLightboxIdx(null)}
        >
          <button
            onClick={() => setModalLightboxIdx(null)}
            className="absolute top-4 right-4 text-white bg-white/20 hover:bg-white/30 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold"
          >×</button>
          {allPhotos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevModalPhoto(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/30 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold"
              >‹</button>
              <button
                onClick={(e) => { e.stopPropagation(); nextModalPhoto(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/30 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold"
              >›</button>
            </>
          )}
          <img
            src={allPhotos[modalLightboxIdx]}
            alt="ดูรูปใหญ่"
            className="max-w-[90vw] max-h-[88vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {allPhotos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {allPhotos.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setModalLightboxIdx(i); }}
                  className={`w-2 h-2 rounded-full transition-all ${i === modalLightboxIdx ? "bg-white scale-125" : "bg-white/40"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
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
  photos?: string[];
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
    photos: [] as string[],
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

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadPhotoProgress, setUploadPhotoProgress] = useState(0);
  const [isUploadingBreakdownPhoto, setIsUploadingBreakdownPhoto] = useState(false);
  const [uploadBreakdownProgress, setUploadBreakdownProgress] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxList, setLightboxList] = useState<string[]>([]);

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
        photos: report.photos && report.photos.length > 0
          ? report.photos
          : report.photo ? [report.photo] : [],
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
        photos: [] as string[],
        fuelLiters: 0,
        mileageOrHours: "",
      };
      reportFormRef.current = initial;
      setReportForm(initial);
    }
    setIsUploadingPhoto(false);
    setUploadPhotoProgress(0);
    setIsModalOpen(true);
  };

  const openBreakdownModal = () => {
    setIsUploadingBreakdownPhoto(false);
    setUploadBreakdownProgress(0);
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const oversized = files.filter((f) => f.size > 10 * 1024 * 1024);
    if (oversized.length > 0) return alert(`ไฟล์ ${oversized.map(f => f.name).join(", ")} ใหญ่เกิน 10MB`);
    setIsUploadingPhoto(true);
    setUploadingCount(files.length);
    setUploadPhotoProgress(0);
    e.target.value = "";
    try {
      const urls = await Promise.all(
        files.map((f) => uploadImageToStorage(f, "reports", setUploadPhotoProgress))
      );
      const current = reportFormRef.current.photos || [];
      setReportFormField({ photos: [...current, ...urls] });
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("อัพโหลดรูปภาพไม่สำเร็จ: " + (err?.message || "กรุณาตรวจสอบ Firebase Storage rules"));
    } finally {
      setIsUploadingPhoto(false);
      setUploadingCount(0);
    }
  };

  const handleBreakdownPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return alert("ไฟล์ใหญ่เกิน 10MB กรุณาเลือกรูปขนาดเล็กกว่านี้");
    setIsUploadingBreakdownPhoto(true);
    setUploadBreakdownProgress(0);
    try {
      const url = await uploadImageToStorage(file, "breakdowns", setUploadBreakdownProgress);
      setBreakdownForm((prev) => ({ ...prev, photo: url }));
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("อัพโหลดรูปภาพไม่สำเร็จ: " + (err?.message || "กรุณาตรวจสอบ Firebase Storage rules"));
    } finally {
      setIsUploadingBreakdownPhoto(false);
    }
  };

  const openLightbox = (urls: string[], idx: number) => {
    setLightboxList(urls);
    setLightboxIndex(idx);
    setLightboxUrl(urls[idx]);
  };
  const closeLightbox = () => setLightboxUrl(null);
  const prevPhoto = () => {
    const i = (lightboxIndex - 1 + lightboxList.length) % lightboxList.length;
    setLightboxIndex(i); setLightboxUrl(lightboxList[i]);
  };
  const nextPhoto = () => {
    const i = (lightboxIndex + 1) % lightboxList.length;
    setLightboxIndex(i); setLightboxUrl(lightboxList[i]);
  };

  return (
    <>
    {/* Lightbox */}
    {lightboxUrl && (
      <div
        className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center"
        onClick={closeLightbox}
      >
        <button
          onClick={closeLightbox}
          className="absolute top-4 right-4 text-white bg-white/20 hover:bg-white/30 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold z-10"
        >×</button>
        {lightboxList.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/30 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold z-10"
            >‹</button>
            <button
              onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
              className="absolute right-14 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/30 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold z-10"
            >›</button>
          </>
        )}
        <img
          src={lightboxUrl}
          alt="ดูรูปใหญ่"
          className="max-w-[90vw] max-h-[88vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        {lightboxList.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {lightboxList.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); setLightboxUrl(lightboxList[i]); }}
                className={`w-2 h-2 rounded-full transition-all ${i === lightboxIndex ? "bg-white scale-125" : "bg-white/40"}`}
              />
            ))}
          </div>
        )}
      </div>
    )}

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
                <label className="label">10. รูปภาพหน้างาน</label>
                <div className="flex flex-wrap gap-2">
                  {(getReportForm().photos || []).map((url, idx) => (
                    <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-100 shrink-0">
                      <img
                        src={url}
                        alt={`รูป ${idx + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => {
                          setLightboxList(getReportForm().photos || []);
                          setLightboxIndex(idx);
                          setLightboxUrl(url);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = (getReportForm().photos || []).filter((_, i) => i !== idx);
                          setReportFormField({ photos: next });
                        }}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* Upload button tile */}
                  <label className={`w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer shrink-0 transition-colors ${isUploadingPhoto ? "border-blue-300 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-blue-50"}`}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                    />
                    {isUploadingPhoto ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-blue-500 text-xs font-medium">{uploadPhotoProgress}%</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <Camera size={22} className="text-blue-400" />
                        <span className="text-xs font-medium text-blue-500">เพิ่มรูป</span>
                      </div>
                    )}
                  </label>
                </div>
                {isUploadingPhoto && uploadingCount > 1 && (
                  <p className="text-xs text-blue-500 mt-1">กำลังอัพโหลด {uploadingCount} ไฟล์...</p>
                )}
                <p className="text-xs text-slate-400 mt-1">กดรูปเพื่อดูขนาดใหญ่ · กด × เพื่อลบ · เลือกได้หลายรูปพร้อมกัน</p>
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
                disabled={isUploadingPhoto}
                className="btn-primary shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingPhoto ? "กำลังอัพโหลดรูป..." : "บันทึก"}
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
                {breakdownForm.photo ? (
                  <div className="rounded-xl overflow-hidden border border-red-200 shadow-sm relative group">
                    <img src={breakdownForm.photo} alt="รูปรถเสีย" className="w-full max-h-56 object-cover" />
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={handleBreakdownPhotoUpload} disabled={isUploadingBreakdownPhoto} />
                      <span className="text-white font-semibold text-sm bg-black/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <Camera size={16} /> เปลี่ยนรูปภาพ
                      </span>
                    </label>
                  </div>
                ) : (
                  <label className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 text-slate-500 cursor-pointer transition-colors ${isUploadingBreakdownPhoto ? "border-red-300 bg-red-50" : "border-red-200 hover:bg-red-50"}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={handleBreakdownPhotoUpload} disabled={isUploadingBreakdownPhoto} />
                    {isUploadingBreakdownPhoto ? (
                      <>
                        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-red-600 font-medium text-sm">กำลังอัพโหลด {uploadBreakdownProgress}%</span>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div className="bg-red-500 h-1.5 rounded-full transition-all" style={{ width: `${uploadBreakdownProgress}%` }} />
                        </div>
                      </>
                    ) : (
                      <>
                        <Camera size={32} className="text-red-400" />
                        <span className="font-medium">คลิกเพื่ออัพโหลดรูปภาพ</span>
                        <span className="text-xs text-slate-400">รองรับ JPG, PNG, HEIC (สูงสุด 10MB)</span>
                      </>
                    )}
                  </label>
                )}
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
                disabled={isUploadingBreakdownPhoto}
                className="btn-primary bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingBreakdownPhoto ? "กำลังอัพโหลดรูป..." : "แจ้งรถเสีย"}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
    </>
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

// --- STYLES (module-level so LoginView can access) ---
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
  .dark .input-field { width: 100%; padding: 0.75rem 1rem; font-size: 0.95rem; border: 1px solid #334155; background-color: #1e293b; color: #f8fafc; border-radius: 0.5rem; outline: none; transition: all 0.2s; }
  .dark .input-field:focus { border-color: #3b82f6; ring: 2px; ring-color: rgba(59, 130, 246, 0.3); }
  .dark .input-field option { background-color: #0f172a; color: #f8fafc; }
  .dark .input-field-icon { width: 100%; padding: 0.75rem 1rem 0.75rem 3rem; font-size: 0.95rem; border: 1px solid #334155; background-color: #1e293b; color: #f8fafc; border-radius: 0.5rem; outline: none; transition: all 0.2s; }
  .dark .input-field-icon:focus { border-color: #3b82f6; ring: 2px; ring-color: rgba(59, 130, 246, 0.3); }
  .dark .label { display: block; font-size: 0.9rem; font-weight: 600; color: #cbd5e1; margin-bottom: 0.4rem; }
  .dark .btn-secondary { background-color: #1e293b; color: #e2e8f0; border: 1px solid #334155; padding: 0.6rem 1.2rem; border-radius: 0.5rem; font-weight: 600; transition: all 0.2s; }
  .dark .btn-secondary:hover { background-color: #334155; }
  @keyframes strobe {
    0% { background-color: #ef4444; color: white; transform: scale(1); }
    50% { background-color: white; color: #ef4444; border-color: #ef4444; transform: scale(1.1); }
    100% { background-color: #ef4444; color: white; transform: scale(1); }
  }
  .strobe-anim { animation: strobe 1s infinite; }
`;

// --- LOGIN VIEW (module-level: stable reference, no remount on App re-render) ---
interface LoginViewProps {
  usersList: User[];
  addData: (collectionName: string, data: any) => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logActivity: (action: string, details?: string) => Promise<void>;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
}

function LoginViewInner({ usersList, addData, setUser, logActivity, setActiveTab }: LoginViewProps) {
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState({ empId: "", name: "", email: "" });
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
        saveSession(tempUser);
        setUser(tempUser);
        logActivity("Login", "เข้าสู่ระบบสำเร็จ");
        setActiveTab("dashboard");
        return;
      }
      return setError("ไม่พบข้อมูลผู้ใช้งานนี้");
    }
    if (targetUser.status !== "Approved") {
      return setError("บัญชีของท่านยังไม่ได้รับการอนุมัติ กรุณาติดต่อ Admin");
    }
    saveSession(targetUser);
    setUser(targetUser);
    logActivity("Login", "เข้าสู่ระบบสำเร็จ");
    setActiveTab(targetUser.role === "Admin" ? "dashboard" : "daily");
  };

  return (
    <div className="min-h-screen flex">
      <style>{styleTags}</style>

      {/* ===== LEFT PANEL ===== */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: "linear-gradient(145deg, #0f172a 0%, #1e3a5f 60%, #1e40af 100%)" }}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
            <Truck size={22} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">CMG</div>
            <div className="text-blue-300 text-xs">Equipment Management</div>
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-extrabold text-white leading-tight mb-2">
              ระบบจัดการ<br />
              <span className="text-blue-400">เครื่องจักร & รถ</span>
            </h1>
            <p className="text-blue-200 text-sm leading-relaxed">
              Construction Management Group<br />
              บริหารจัดการยานพาหนะและเครื่องจักรสำหรับโครงการก่อสร้าง<br />
              อย่างมีประสิทธิภาพ โปร่งใส และตรวจสอบได้
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {[
              { icon: "🚛", text: "ติดตามสถานะรถและเครื่องจักรแบบ Real-time" },
              { icon: "📋", text: "รายงานประจำวัน — บันทึกง่าย ตรวจสอบได้" },
              { icon: "🔧", text: "แจ้งซ่อมและติดตามสถานะการบำรุงรักษา" },
              { icon: "👥", text: "ระบบสิทธิ์หลายระดับ Admin / Driver / User" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-base shrink-0">
                  {f.icon}
                </div>
                <span className="text-blue-100 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-blue-400/60 text-xs">© 2026 CMG · All rights reserved</p>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Truck size={22} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-800">CMG EQM</div>
              <div className="text-slate-400 text-xs">Equipment Management</div>
            </div>
          </div>

          {mode === "login" ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-1">
                  ยินดีต้อนรับ 👋
                </h2>
                <p className="text-slate-500 text-sm">กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ</p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2 mb-5 border border-red-100">
                  <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="label">รหัสพนักงาน</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 text-slate-400 pointer-events-none" size={18} />
                    <input
                      type="text"
                      className="input-field pl-10"
                      style={{ paddingLeft: "2.5rem" }}
                      placeholder="รหัสพนักงาน"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-base transition-all shadow-lg shadow-blue-600/25 mt-2"
                >
                  เข้าสู่ระบบ
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                ยังไม่มีบัญชี?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("register"); setError(""); }}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  สมัครใช้งาน
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-1">สมัครใช้งาน</h2>
                <p className="text-slate-500 text-sm">กรอกข้อมูลเพื่อสร้างบัญชีใหม่</p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2 mb-5 border border-red-100">
                  <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="label">รหัสพนักงาน <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="เช่น EMP001"
                    value={formData.empId}
                    onChange={(e) => setFormData({ ...formData, empId: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">ชื่อ - นามสกุล <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="ชื่อจริง นามสกุล"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-base transition-all shadow-lg shadow-blue-600/25 mt-1"
                >
                  ยืนยันการสมัคร
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                มีบัญชีแล้ว?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); }}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  เข้าสู่ระบบ
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- SESSION PERSISTENCE ---
const SESSION_KEY = "cmg_eqm_session";

const saveSession = (u: User) => {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch {}
};
const clearSession = () => {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
};
const loadSession = (): User | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch { return null; }
};

// --- MAIN APP COMPONENT ---

export default function App() {
  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState<User | null>(() => loadSession()); // restore from localStorage
  const [firebaseUser, setFirebaseUser] = useState<any>(null); // Firebase Auth User
  const [authError, setAuthError] = useState<string | null>(null); // Track Auth Errors
  const [authChecked, setAuthChecked] = useState<boolean>(false); // Firebase auth state resolved
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    try {
      localStorage.setItem("cmg_dark_mode", "false");
    } catch {}
  }, []);

  const [activeTab, setActiveTab] = useState<string>(() => {
    const saved = loadSession();
    return saved ? (saved.role === "Admin" ? "dashboard" : "daily") : "daily";
  });
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
      setAuthChecked(true);
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

  // --- SESSION VALIDATION: re-check saved user against live Firestore data ---
  useEffect(() => {
    if (usersList.length === 0 || !user) return;
    const live = usersList.find((u) => u.empId === user.empId || u.id === user.id);
    if (!live || live.status !== "Approved") {
      // Account revoked or not found → force logout
      clearSession();
      setUser(null);
      return;
    }
    // Update local state & storage with latest data from Firestore (name/role may change)
    const updated: User = { ...live };
    setUser(updated);
    saveSession(updated);
  }, [usersList]); // eslint-disable-line

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

        {/* Vehicle Status Row - Compact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Card className="p-2 bg-sky-50 border border-sky-100 rounded-lg shadow-none">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sky-700 text-[11px] font-medium mb-0.5 flex items-center gap-1">
                  <span>✅</span> รถที่ใช้งานอยู่ (Active)
                </p>
                <p className="text-xl font-bold text-sky-800">
                  {stats.activeVehicles}{" "}
                  <span className="text-xs font-normal text-sky-600">คัน</span>
                </p>
              </div>
              <span className="text-xl opacity-80">🚙</span>
            </div>
          </Card>
          <Card className="p-2 bg-rose-50 border border-rose-100 rounded-lg shadow-none">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-rose-700 text-[11px] font-medium mb-0.5 flex items-center gap-1">
                  <span>🔧</span> รถซ่อม/รอซ่อม (Maintenance)
                </p>
                <p className="text-xl font-bold text-rose-800">
                  {stats.maintenanceVehicles}{" "}
                  <span className="text-xs font-normal text-rose-600">คัน</span>
                </p>
              </div>
              <span className="text-xl opacity-80">⚠️</span>
            </div>
          </Card>
          <Card className="p-2 bg-slate-50 border border-slate-100 rounded-lg shadow-none">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-slate-600 text-[11px] font-medium mb-0.5 flex items-center gap-1">
                  <span>🅿️</span> รถว่าง/ไม่มีคนขับ (Empty)
                </p>
                <p className="text-xl font-bold text-slate-700">
                  {stats.emptyVehicles}{" "}
                  <span className="text-xs font-normal text-slate-500">คัน</span>
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
                          <col className="w-[12%]" />
                          <col className="w-[16%]" />
                          <col className="w-[10%]" />
                          <col className="w-[16%]" />
                          <col className="w-[13%]" />
                          <col className="w-[13%]" />
                          <col className="w-[10%]" />
                          <col className="w-[10%]" />
                        </colgroup>
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-1.5">ทะเบียน</th>
                            <th className="px-3 py-1.5">ประเภท</th>
                            <th className="px-3 py-1.5">สถานะ</th>
                            <th className="px-3 py-1.5">คนขับ</th>
                            <th className="px-3 py-1.5">ต่อภาษี</th>
                            <th className="px-3 py-1.5">ประกันภัย</th>
                            <th className="px-3 py-1.5">ปจ.2</th>
                            <th className="px-3 py-1.5 text-right">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {projectVehicles.map((v) => {
                            const today = new Date().toISOString().split("T")[0];
                            const expiredCls = (d?: string) => d && d < today ? "text-red-600 font-semibold" : "text-slate-600";
                            const driverNames = v.id
                              ? usersList
                                  .filter((u) => (Array.isArray(u.vehicleIds) && u.vehicleIds.includes(v.id!)) || u.vehicleId === v.id)
                                  .map((u) => u.name)
                                  .filter(Boolean)
                              : [];
                            return (
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
                              <td className="px-3 py-1.5 text-slate-600 truncate" title={driverNames.join(", ")}>
                                {driverNames.length > 0 ? driverNames.join(", ") : <span className="text-slate-400">-</span>}
                              </td>
                              <td className={`px-3 py-1.5 ${expiredCls(v.regExp)}`}>{v.regExp || "-"}</td>
                              <td className={`px-3 py-1.5 ${expiredCls(v.insuranceExp)}`}>{v.insuranceExp || "-"}</td>
                              <td className={`px-3 py-1.5 ${isMachineVehicle(v.type) ? expiredCls(v.pj2Exp) : "text-slate-300"}`}>
                                {isMachineVehicle(v.type) ? (v.pj2Exp || "-") : "—"}
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
                            );
                          })}
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
                        <label className="label">🛡️ ประกันภัยหมดอายุ</label>
                        <input
                          type="date"
                          className="input-field"
                          value={formData.insuranceExp || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, insuranceExp: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="label">📋 ต่อภาษี (ทะเบียนหมดอายุ)</label>
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
                    {isMachineVehicle(formData.type || "") && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <label className="label text-amber-800">🏗️ ปจ.2 หมดอายุ <span className="text-xs font-normal text-amber-600">(เฉพาะเครื่องจักร/เฮียบ/เครน)</span></label>
                        <input
                          type="date"
                          className="input-field border-amber-300 focus:ring-amber-500"
                          value={formData.pj2Exp || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, pj2Exp: e.target.value })
                          }
                        />
                      </div>
                    )}
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
                              <th className="p-3">อาการ / สถานที่ซ่อม</th>
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
                                  {h.cause && (
                                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                      <span>📍</span>
                                      <span>{h.cause}</span>
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-slate-600">
                                  {h.repairItemList && h.repairItemList.length > 0 ? (
                                    <div className="space-y-1">
                                      {h.repairItemList.map((it: any, i: number) => (
                                        <div key={i} className="text-xs flex items-center justify-between gap-2">
                                          <span className="text-slate-700 font-medium">• {it.name}</span>
                                          {it.price && (
                                            <span className="font-mono text-emerald-600 font-semibold shrink-0">
                                              ฿{Number(it.price).toLocaleString()}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div>{h.repairItems || "-"}</div>
                                  )}
                                  {h.photos && h.photos.length > 0 && (
                                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                      {h.photos.map((url: string, pIdx: number) => {
                                        const isPdf = isPdfUrl(url);
                                        return (
                                          <button
                                            key={pIdx}
                                            type="button"
                                            onClick={() => window.open(url, "_blank")}
                                            className={`w-7 h-7 rounded-md overflow-hidden border cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all shrink-0 flex items-center justify-center ${
                                              isPdf
                                                ? "bg-rose-50 border-rose-200 text-rose-600 font-bold text-[8px]"
                                                : "border-slate-200 bg-slate-100"
                                            }`}
                                            title={isPdf ? "คลิกเพื่อเปิดดูไฟล์ PDF" : "คลิกเพื่อดูรูปภาพ"}
                                          >
                                            {isPdf ? (
                                              <FileText size={13} className="text-rose-600" />
                                            ) : (
                                              <img
                                                src={url}
                                                alt="รูปอะไหล่"
                                                className="w-full h-full object-cover"
                                              />
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
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
    const [viewingLog, setViewingLog] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [vehicleFilter, setVehicleFilter] = useState("all");

    // Searchable Combobox State for Modal
    const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");
    const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
    const vehicleComboboxRef = useRef<HTMLDivElement>(null);

    const [maintenanceForm, setMaintenanceForm] = useState<{
      vehicleId: string;
      date: string;
      issue: string;
      cause: string;
      repairItems: string;
      repairItemList: Array<{ name: string; price: string }>;
      cost: string;
      status: string;
      finishDate: string;
      photos: string[];
    }>({
      vehicleId: "",
      date: new Date().toISOString().split("T")[0],
      issue: "",
      cause: "",
      repairItems: "",
      repairItemList: [{ name: "", price: "" }],
      cost: "",
      status: "InProgress",
      finishDate: "",
      photos: [],
    });

    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadingCount, setUploadingCount] = useState(0);

    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [lightboxList, setLightboxList] = useState<string[]>([]);

    const openLightbox = (urls: string[], idx: number) => {
      setLightboxList(urls);
      setLightboxIndex(idx);
      setLightboxUrl(urls[idx]);
    };
    const closeLightbox = () => setLightboxUrl(null);
    const prevPhoto = () => {
      const i = (lightboxIndex - 1 + lightboxList.length) % lightboxList.length;
      setLightboxIndex(i);
      setLightboxUrl(lightboxList[i]);
    };
    const nextPhoto = () => {
      const i = (lightboxIndex + 1) % lightboxList.length;
      setLightboxIndex(i);
      setLightboxUrl(lightboxList[i]);
    };

    const handleAddRepairItem = () => {
      setMaintenanceForm((prev) => ({
        ...prev,
        repairItemList: [...(prev.repairItemList || []), { name: "", price: "" }],
      }));
    };

    const handleRemoveRepairItem = (index: number) => {
      setMaintenanceForm((prev) => {
        const nextList = (prev.repairItemList || []).filter((_, i) => i !== index);
        const sum = nextList.reduce((acc, it) => acc + (parseFloat(it.price) || 0), 0);
        return {
          ...prev,
          repairItemList: nextList,
          cost: sum > 0 ? String(sum) : (nextList.length === 0 ? prev.cost : ""),
        };
      });
    };

    const handleRepairItemChange = (index: number, field: "name" | "price", value: string) => {
      setMaintenanceForm((prev) => {
        const nextList = [...(prev.repairItemList || [])];
        nextList[index] = { ...nextList[index], [field]: value };

        let nextCost = prev.cost;
        if (field === "price") {
          const sum = nextList.reduce((acc, it) => acc + (parseFloat(it.price) || 0), 0);
          if (sum > 0 || nextList.some((it) => (it.price || "").trim() !== "")) {
            nextCost = sum > 0 ? String(sum) : "";
          }
        }

        return {
          ...prev,
          repairItemList: nextList,
          cost: nextCost,
        };
      });
    };

    const repairItemsTotal = useMemo(() => {
      return (maintenanceForm.repairItemList || []).reduce(
        (acc, it) => acc + (parseFloat(it.price) || 0),
        0
      );
    }, [maintenanceForm.repairItemList]);

    const selectedVehicle = useMemo(
      () => vehicles.find((v) => v.id === maintenanceForm.vehicleId),
      [vehicles, maintenanceForm.vehicleId]
    );

    // Filter vehicles for combobox in modal
    const filteredVehiclesForModal = useMemo(() => {
      const q = vehicleSearchQuery.trim().toLowerCase();
      if (!q) return vehicles;
      // If query matches current selected vehicle text, show full list
      if (
        selectedVehicle &&
        `${selectedVehicle.plate} (${selectedVehicle.type})`.toLowerCase() === q
      ) {
        return vehicles;
      }
      return vehicles.filter((v) => {
        const plate = (v.plate || "").toLowerCase();
        const type = (v.type || "").toLowerCase();
        const brand = (v.brand || "").toLowerCase();
        return plate.includes(q) || type.includes(q) || brand.includes(q);
      });
    }, [vehicles, vehicleSearchQuery, selectedVehicle]);

    // Handle outside clicks to close combobox dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          vehicleComboboxRef.current &&
          !vehicleComboboxRef.current.contains(event.target as Node)
        ) {
          setIsVehicleDropdownOpen(false);
          // Restore text if a vehicle is selected
          if (maintenanceForm.vehicleId) {
            const current = vehicles.find((v) => v.id === maintenanceForm.vehicleId);
            if (current) {
              setVehicleSearchQuery(`${current.plate} (${current.type})`);
            }
          } else {
            // If user typed exact plate, auto-select it
            const exact = vehicles.find(
              (v) =>
                v.plate?.toLowerCase() === vehicleSearchQuery.trim().toLowerCase()
            );
            if (exact) {
              setMaintenanceForm((prev) => ({ ...prev, vehicleId: exact.id }));
              setVehicleSearchQuery(`${exact.plate} (${exact.type})`);
            } else {
              setVehicleSearchQuery("");
            }
          }
        }
      };
      if (isVehicleDropdownOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isVehicleDropdownOpen, maintenanceForm.vehicleId, vehicles, vehicleSearchQuery]);

    const handleSelectVehicle = (v: any) => {
      setMaintenanceForm((prev) => ({ ...prev, vehicleId: v.id }));
      setVehicleSearchQuery(`${v.plate} (${v.type})`);
      setIsVehicleDropdownOpen(false);
    };

    const handleClearVehicle = () => {
      setMaintenanceForm((prev) => ({ ...prev, vehicleId: "" }));
      setVehicleSearchQuery("");
      setIsVehicleDropdownOpen(true);
    };

    const openModal = (log: any = null) => {
      setEditingLog(log);
      if (log) {
        const vId = log.vehicleId || "";
        const rawPhotos: string[] = Array.isArray(log.photos)
          ? log.photos
          : log.photo
          ? [log.photo]
          : [];
        let initialRepairList: Array<{ name: string; price: string }> = [];
        if (Array.isArray(log.repairItemList) && log.repairItemList.length > 0) {
          initialRepairList = log.repairItemList.map((it: any) => ({
            name: it.name || "",
            price: it.price != null ? String(it.price) : "",
          }));
        } else if (log.repairItems && typeof log.repairItems === "string" && log.repairItems.trim()) {
          const parts = log.repairItems.split(/,\s*/).filter(Boolean);
          if (parts.length > 0) {
            initialRepairList = parts.map((part: string) => ({
              name: part.replace(/\s*\([\d,.]+\s*บ\.\)$/, "").trim(),
              price: "",
            }));
          }
        }
        if (initialRepairList.length === 0) {
          initialRepairList = [{ name: "", price: "" }];
        }
        setMaintenanceForm({ 
          vehicleId: vId,
          date: log.date || new Date().toISOString().split("T")[0],
          issue: log.issue || "",
          cause: log.cause || "",
          repairItems: log.repairItems || "",
          repairItemList: initialRepairList,
          cost: log.cost != null ? String(log.cost) : "",
          status: log.status === "Completed" ? "Completed" : "InProgress",
          finishDate: log.finishDate || "",
          photos: rawPhotos,
        });
        const currentV = vehicles.find((v) => v.id === vId);
        setVehicleSearchQuery(currentV ? `${currentV.plate} (${currentV.type})` : "");
      } else {
        setMaintenanceForm({
          vehicleId: "",
          date: new Date().toISOString().split("T")[0],
          issue: "",
          cause: "",
          repairItems: "",
          repairItemList: [{ name: "", price: "" }],
          cost: "",
          status: "InProgress",
          finishDate: "",
          photos: [],
        });
        setVehicleSearchQuery("");
      }
      setIsUploadingPhoto(false);
      setUploadProgress(0);
      setUploadingCount(0);
      setIsVehicleDropdownOpen(false);
      setIsModalOpen(true);
    };

    const handleMaintenancePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      const oversized = files.filter((f) => f.size > 10 * 1024 * 1024);
      if (oversized.length > 0) {
        return alert(`ไฟล์ ${oversized.map((f) => f.name).join(", ")} มีขนาดใหญ่เกิน 10MB`);
      }
      setIsUploadingPhoto(true);
      setUploadingCount(files.length);
      setUploadProgress(0);
      e.target.value = "";
      try {
        const urls = await Promise.all(
          files.map((f) => uploadImageToStorage(f, "maintenance", setUploadProgress))
        );
        setMaintenanceForm((prev) => ({
          ...prev,
          photos: [...(prev.photos || []), ...urls],
        }));
      } catch (err: any) {
        console.error("Maintenance file upload error:", err);
        alert("อัพโหลดไฟล์ไม่สำเร็จ: " + (err?.message || "กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือสิทธิ์"));
      } finally {
        setIsUploadingPhoto(false);
        setUploadingCount(0);
      }
    };

    const handleRemovePhoto = (indexToRemove: number) => {
      setMaintenanceForm((prev) => ({
        ...prev,
        photos: (prev.photos || []).filter((_, i) => i !== indexToRemove),
      }));
    };

    const handleSaveMaintenance = async () => {
      if (isUploadingPhoto) {
        return alert("กรุณารออัพโหลดรูปภาพให้เสร็จสิ้นก่อนกดบันทึกข้อมูล");
      }
      let finalVehicleId = maintenanceForm.vehicleId;
      if (!finalVehicleId && vehicleSearchQuery.trim()) {
        const match = vehicles.find(
          (v) =>
            v.plate?.toLowerCase() === vehicleSearchQuery.trim().toLowerCase() ||
            `${v.plate} (${v.type})`.toLowerCase() === vehicleSearchQuery.trim().toLowerCase()
        );
        if (match) {
          finalVehicleId = match.id;
        }
      }
      if (!finalVehicleId) return alert("กรุณาเลือกทะเบียนรถ");

      const cleanRepairList = (maintenanceForm.repairItemList || []).filter(
        (it) => it.name.trim() !== "" || (it.price || "").trim() !== ""
      );
      const repairItemsSummary = cleanRepairList
        .filter((it) => it.name.trim())
        .map((it) => (it.price ? `${it.name.trim()} (${Number(it.price).toLocaleString()} บ.)` : it.name.trim()))
        .join(", ");

      const payload = {
        ...maintenanceForm,
        repairItemList: cleanRepairList,
        repairItems: repairItemsSummary || maintenanceForm.repairItems || "",
        vehicleId: finalVehicleId,
        cost: parseFloat(maintenanceForm.cost) || 0,
      };
      if (editingLog) {
        await updateData("maintenance_logs", editingLog.id, payload);
        logActivity(
          "Edit Maintenance",
          `Edited maintenance log for vehicle ID: ${finalVehicleId}`
        );
      } else {
        await addData("maintenance_logs", payload);
        logActivity(
          "Add Maintenance",
          `Added maintenance log for vehicle ID: ${finalVehicleId}`
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

    // --- METRICS ---
    const totalCount = maintenanceLogs.length;
    const inProgressCount = maintenanceLogs.filter((m) => m.status === "InProgress").length;
    const pendingCount = maintenanceLogs.filter((m) => m.status === "Pending").length;
    const completedCount = maintenanceLogs.filter((m) => m.status === "Completed").length;
    const totalCost = useMemo(() => {
      return maintenanceLogs.reduce((acc, m) => acc + (parseFloat(m.cost) || 0), 0);
    }, [maintenanceLogs]);

    // --- FILTERED LOGS ---
    const filteredLogs = useMemo(() => {
      return maintenanceLogs.filter((m) => {
        const vName = getVehicleName(m.vehicleId) || "";
        const q = searchTerm.toLowerCase().trim();
        const matchSearch =
          !q ||
          vName.toLowerCase().includes(q) ||
          (m.issue && m.issue.toLowerCase().includes(q)) ||
          (m.cause && m.cause.toLowerCase().includes(q)) ||
          (m.repairItems && m.repairItems.toLowerCase().includes(q)) ||
          (m.date && m.date.includes(q));

        const matchStatus = statusFilter === "all" || m.status === statusFilter;
        const matchVehicle = vehicleFilter === "all" || m.vehicleId === vehicleFilter;
        return matchSearch && matchStatus && matchVehicle;
      });
    }, [maintenanceLogs, searchTerm, statusFilter, vehicleFilter, vehicles]);

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/80 flex items-center justify-center">
              <Wrench size={24} className="stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                ประวัติการซ่อมบำรุง
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                บันทึกและติดตามสถานะงานซ่อมบำรุง เครื่องจักรและยานพาหนะทั้งหมด
              </p>
            </div>
          </div>
          <button
            onClick={() => openModal()}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus size={18} className="stroke-[2.5]" />
            <span>แจ้งซ่อม / บันทึกประวัติ</span>
          </button>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)] transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Wrench size={18} />
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                ทั้งหมด
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                {totalCount}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                รายการแจ้งซ่อมในระบบ
              </div>
            </div>
          </div>

          {/* Card 2: In Progress / Pending */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)] transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 relative">
                <Clock size={18} />
                {(inProgressCount + pendingCount) > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                รอดำเนินการ
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                {inProgressCount + pendingCount}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                กำลังซ่อม ({inProgressCount}) • รอซ่อม ({pendingCount})
              </div>
            </div>
          </div>

          {/* Card 3: Completed */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)] transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <CheckCircle size={18} />
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                สำเร็จแล้ว
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                {completedCount}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                ซ่อมเสร็จพร้อมใช้งาน
              </div>
            </div>
          </div>

          {/* Card 4: Total Expense */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)] transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Fuel size={18} />
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                งบซ่อมรวม
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                ฿{totalCost.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                ค่าอะไหล่และค่าบริการรวม
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาทะเบียน, อาการเสีย, สถานที่ซ่อม, อะไหล่..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/90 rounded-xl text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === "all"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              ทั้งหมด ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter("InProgress")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === "InProgress"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/60"
              }`}
            >
              🔵 กำลังซ่อม ({inProgressCount})
            </button>
            {pendingCount > 0 && (
              <button
                onClick={() => setStatusFilter("Pending")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === "Pending"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-amber-700 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/60"
                }`}
              >
                🟡 รอการซ่อม ({pendingCount})
              </button>
            )}
            <button
              onClick={() => setStatusFilter("Completed")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === "Completed"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/60"
              }`}
            >
              🟢 ซ่อมเสร็จแล้ว ({completedCount})
            </button>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/90 text-slate-600 border-b border-slate-200/80 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-4 whitespace-nowrap">วันที่แจ้ง</th>
                  <th className="p-4 whitespace-nowrap">ทะเบียนรถ</th>
                  <th className="p-4 min-w-[240px]">อาการเสีย / สถานที่ซ่อม / รายการซ่อม</th>
                  <th className="p-4 whitespace-nowrap">สถานะ</th>
                  <th className="p-4 whitespace-nowrap">เสร็จสิ้น</th>
                  <th className="p-4 whitespace-nowrap text-right">ค่าใช้จ่าย</th>
                  <th className="p-4 whitespace-nowrap text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLogs.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => setViewingLog(m)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    title="คลิกเพื่อดูรายละเอียดและรูปภาพทั้งหมด"
                  >
                    <td className="p-4 align-top whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{m.date}</span>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="inline-flex items-center gap-2 bg-slate-100/90 text-slate-700 border border-slate-200/80 px-2.5 py-1 rounded-lg font-semibold text-xs group-hover:border-blue-300 transition-colors">
                        <Truck size={14} className="text-blue-600 shrink-0" />
                        <span>{getVehicleName(m.vehicleId)}</span>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-semibold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">
                        {m.issue || "-"}
                      </div>
                      {m.cause && (
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <span>📍</span>
                          <span>{m.cause}</span>
                        </div>
                      )}
                      {m.repairItemList && m.repairItemList.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {m.repairItemList.map((it: any, i: number) => (
                            <span
                              key={i}
                              className="text-xs text-amber-900 bg-amber-50/90 border border-amber-200/80 px-2 py-0.5 rounded-md inline-flex items-center gap-1.5 font-medium"
                            >
                              <span>🛠️ {it.name}</span>
                              {it.price && (
                                <span className="text-emerald-700 font-bold font-mono text-[11px] bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/60">
                                  ฿{Number(it.price).toLocaleString()}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : m.repairItems ? (
                        <div className="text-xs text-amber-800 bg-amber-50/90 border border-amber-200/70 px-2.5 py-0.5 rounded-md mt-1.5 inline-flex items-center gap-1 font-medium">
                          <span>🛠️</span>
                          <span>{m.repairItems}</span>
                        </div>
                      ) : null}
                      {m.photos && m.photos.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {m.photos.map((url: string, pIdx: number) => {
                            const isPdf = isPdfUrl(url);
                            return (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isPdf) {
                                    window.open(url, "_blank");
                                  } else {
                                    openLightbox(m.photos, pIdx);
                                  }
                                }}
                                className={`group/photo relative w-8 h-8 rounded-lg overflow-hidden border shadow-xs hover:ring-2 hover:ring-blue-500 transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                                  isPdf
                                    ? "bg-rose-50 border-rose-200 text-rose-600 font-bold"
                                    : "border-slate-200/90 bg-slate-100"
                                }`}
                                title={isPdf ? "คลิกเพื่อเปิดดูไฟล์ PDF" : "คลิกเพื่อดูรูปภาพขนาดเต็ม"}
                              >
                                {isPdf ? (
                                  <div className="flex flex-col items-center justify-center text-[7px] font-bold leading-none">
                                    <FileText size={13} className="text-rose-600" />
                                    <span className="mt-0.5 text-rose-700">PDF</span>
                                  </div>
                                ) : (
                                  <img
                                    src={url}
                                    alt={`รูปอะไหล่ที่ ${pIdx + 1}`}
                                    className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform"
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-top whitespace-nowrap">
                      <MaintenanceStatusBadge status={m.status} />
                    </td>
                    <td className="p-4 align-top whitespace-nowrap font-mono text-xs text-slate-500">
                      {m.finishDate ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle size={13} /> {m.finishDate}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4 align-top text-right whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-800 font-mono">
                        {parseInt(m.cost || 0) > 0 ? `฿${parseInt(m.cost).toLocaleString()}` : "-"}
                      </div>
                    </td>
                    <td className="p-4 align-top text-center whitespace-nowrap">
                      <div className="flex justify-center items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(m);
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all cursor-pointer"
                          title="แก้ไข"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(m.id);
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                          title="ลบ"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Wrench size={32} className="opacity-30" />
                        <div className="font-medium text-slate-600">ไม่พบข้อมูลการซ่อมบำรุง</div>
                        {searchTerm && (
                          <button
                            onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}
                            className="text-xs text-blue-600 hover:underline mt-1"
                          >
                            ล้างคำค้นหา
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen &&
          createPortal(
            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 sm:p-6 md:p-8 pt-8 sm:pt-12 pb-8 sm:pb-12 z-[9999] animate-fade-in backdrop-blur-md overflow-y-auto">
              <div className="bg-white border border-slate-200/90 text-slate-800 rounded-3xl w-full max-w-4xl max-h-[88vh] my-auto shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden transition-all">
                {/* Gradient Accent Bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 shrink-0" />

                {/* Header */}
                <div
                  style={{ paddingTop: "1.5rem", paddingBottom: "1.25rem" }}
                  className="px-6 sm:px-8 border-b border-slate-100 flex justify-between items-center bg-white/95 backdrop-blur-md sticky top-0 z-20 shrink-0"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                      <Wrench size={20} className="stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">
                          {editingLog ? "แก้ไขรายการซ่อมบำรุง" : "บันทึกการแจ้งซ่อมใหม่"}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            editingLog
                              ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                              : "bg-blue-50 text-blue-700 border border-blue-200/60"
                          }`}
                        >
                          {editingLog ? "แก้ไข" : "สร้างใหม่"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        บันทึกรายละเอียดงานซ่อม อะไหล่ที่เปลี่ยน รูปภาพ และติดตามสถานะ
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
                    title="ปิดหน้าต่าง"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                  {/* Section 1: ข้อมูลยานพาหนะและอาการ */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Searchable Vehicle Combobox */}
                      <div className="relative z-20" ref={vehicleComboboxRef}>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <span>🆔 ทะเบียนรถ</span>
                            <span className="text-rose-500">*</span>
                          </label>
                          {selectedVehicle && (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check size={11} className="stroke-[3]" />
                              <span>เลือกแล้ว</span>
                            </span>
                          )}
                        </div>

                        <div className="relative">
                          <Search
                            size={16}
                            className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                              isVehicleDropdownOpen ? "text-blue-500" : "text-slate-400"
                            }`}
                          />
                          <input
                            type="text"
                            placeholder="พิมพ์ค้นหาทะเบียน หรือ ประเภทรถ..."
                            value={vehicleSearchQuery}
                            onFocus={() => setIsVehicleDropdownOpen(true)}
                            onClick={() => setIsVehicleDropdownOpen(true)}
                            onChange={(e) => {
                              setVehicleSearchQuery(e.target.value);
                              setIsVehicleDropdownOpen(true);
                              if (!e.target.value) {
                                setMaintenanceForm((prev) => ({ ...prev, vehicleId: "" }));
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setIsVehicleDropdownOpen(false);
                              }
                            }}
                            style={{ paddingLeft: "2.6rem", paddingRight: "4.2rem" }}
                            className="input-field bg-slate-50/70 hover:bg-slate-50 focus:bg-white"
                          />

                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                            {(vehicleSearchQuery || maintenanceForm.vehicleId) && (
                              <button
                                type="button"
                                onClick={handleClearVehicle}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                                title="ล้างการเลือก"
                              >
                                <X size={15} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                              title="เปิด/ปิด รายการทะเบียน"
                            >
                              <ChevronDown
                                size={16}
                                className={`transition-transform duration-200 ${
                                  isVehicleDropdownOpen ? "rotate-180 text-blue-500" : ""
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Searchable Dropdown Popup */}
                        {isVehicleDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-60">
                            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold shrink-0">
                              <span>
                                {filteredVehiclesForModal.length > 0
                                  ? `พบ ${filteredVehiclesForModal.length} คัน`
                                  : "ไม่พบผลการค้นหา"}
                              </span>
                              <span className="text-[10px] text-slate-400">คลิกเพื่อเลือก</span>
                            </div>

                            <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                              {filteredVehiclesForModal.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-1.5">
                                  <Search size={18} className="text-slate-300" />
                                  <span>ไม่พบทะเบียนรถที่ตรงกับ "{vehicleSearchQuery}"</span>
                                  <span className="text-[11px] text-slate-400">
                                    ลองพิมพ์เลขทะเบียนหรือประเภทรถใหม่
                                  </span>
                                </div>
                              ) : (
                                filteredVehiclesForModal.map((v) => {
                                  const isSelected = v.id === maintenanceForm.vehicleId;
                                  return (
                                    <button
                                      key={v.id}
                                      type="button"
                                      onClick={() => handleSelectVehicle(v)}
                                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors ${
                                        isSelected
                                          ? "bg-blue-50/80 text-blue-900 font-medium"
                                          : "hover:bg-slate-50 text-slate-700"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                                            isSelected
                                              ? "bg-blue-600 text-white shadow-sm"
                                              : "bg-slate-100 text-slate-600 border border-slate-200/80"
                                          }`}
                                        >
                                          🚛
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-900 truncate">
                                              {v.plate}
                                            </span>
                                            {isSelected && (
                                              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                                                เลือกอยู่
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-600">
                                              {v.type || "ไม่ระบุประเภท"}
                                            </span>
                                            {v.brand && (
                                              <span className="text-slate-400 truncate text-[11px]">
                                                • {v.brand}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 ml-2 shadow-sm">
                                          <Check size={12} className="stroke-[3]" />
                                        </div>
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Date */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <span>📅 วันที่แจ้งซ่อม</span>
                        </label>
                        <input
                          type="date"
                          className="input-field bg-slate-50/70 hover:bg-slate-50 focus:bg-white"
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

                    {/* Symptoms & Location (2 Columns) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <span>⚠️ อาการเสีย</span>
                        </label>
                        <input
                          type="text"
                          className="input-field bg-slate-50/70 hover:bg-slate-50 focus:bg-white"
                          placeholder="เช่น บูมสั่นเวลาทำงาน, แอร์ไม่เย็น, เครื่องยนต์ดับ..."
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
                        <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <span>📍 สถานที่ซ่อม</span>
                        </label>
                        <input
                          type="text"
                          className="input-field bg-slate-50/70 hover:bg-slate-50 focus:bg-white"
                          placeholder="เช่น ศูนย์บริการ, ไซต์งาน A, อู่ซ่อม..."
                          value={maintenanceForm.cause}
                          onChange={(e) =>
                            setMaintenanceForm({
                              ...maintenanceForm,
                              cause: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: รายการซ่อม / อะไหล่ที่เปลี่ยน */}
                  <div className="pt-5 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          🛠️ รายการซ่อม / อะไหล่ที่เปลี่ยน
                        </span>
                        {maintenanceForm.repairItemList.filter((it) => it.name.trim() || it.price.trim()).length > 0 && (
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            {maintenanceForm.repairItemList.filter((it) => it.name.trim() || it.price.trim()).length} รายการ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Table Header Labels */}
                    <div className="hidden sm:flex items-center gap-2 px-1 text-[11px] font-bold text-slate-400 select-none">
                      <span className="w-6 text-center">#</span>
                      <span className="flex-1">รายการซ่อม / อะไหล่</span>
                      <span className="w-36 text-right pr-2">ราคา (บาท)</span>
                      <span className="w-8 text-center">ลบ</span>
                    </div>

                    {/* Flat Rows: Clean & Border-Clutter Free */}
                    <div className="space-y-2">
                      {maintenanceForm.repairItemList.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          {/* Index */}
                          <span className="w-6 text-center font-mono font-bold text-xs text-slate-400 select-none shrink-0">
                            {index + 1}
                          </span>

                          {/* Item Name */}
                          <input
                            type="text"
                            className="flex-1 input-field bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm"
                            placeholder={`ระบุรายการที่ ${index + 1} เช่น เปลี่ยนน้ำมันเครื่อง, กรองโซล่า...`}
                            value={item.name}
                            onChange={(e) => handleRepairItemChange(index, "name", e.target.value)}
                          />

                          {/* Price with single clean input */}
                          <div className="relative w-36 shrink-0">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none select-none">
                              ฿
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              style={{ paddingLeft: "1.8rem", paddingRight: "0.75rem" }}
                              className="w-full input-field font-mono font-bold text-slate-900 text-right bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm placeholder-slate-300"
                              placeholder="0.00"
                              value={item.price}
                              onChange={(e) => handleRepairItemChange(index, "price", e.target.value)}
                            />
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveRepairItem(index)}
                            className="w-8 h-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                            title="ลบแถวนี้"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Actions & Subtotal */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={handleAddRepairItem}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 py-1 px-1 hover:underline cursor-pointer"
                      >
                        <Plus size={14} className="stroke-[3]" />
                        <span>เพิ่มรายการถัดไป</span>
                      </button>

                      {repairItemsTotal > 0 && (
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <span>รวมค่ารายการ:</span>
                          <span className="text-sm font-bold font-mono text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                            ฿{repairItemsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 3: รูปภาพ / เอกสารประกอบ */}
                  <div className="pt-5 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Camera size={14} className="text-slate-500" />
                        <span>รูปภาพ / เอกสาร / ใบเสร็จ (รองรับ PDF)</span>
                        {maintenanceForm.photos && maintenanceForm.photos.length > 0 && (
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            {maintenanceForm.photos.length} ไฟล์
                          </span>
                        )}
                      </label>
                      <span className="text-[11px] text-slate-400">รูปภาพ หรือ PDF (สูงสุด 10MB)</span>
                    </div>

                    <div className="flex flex-wrap gap-2.5 items-center">
                      {maintenanceForm.photos?.map((url, idx) => {
                        const isPdf = isPdfUrl(url);
                        return (
                          <div
                            key={idx}
                            className={`group relative w-16 h-16 rounded-xl overflow-hidden border shadow-2xs shrink-0 cursor-pointer transition-transform hover:scale-105 flex flex-col items-center justify-center ${
                              isPdf
                                ? "bg-rose-50/80 border-rose-200 text-rose-700 hover:bg-rose-100/70"
                                : "border-slate-200 bg-slate-100"
                            }`}
                            onClick={() => {
                              if (isPdf) {
                                window.open(url, "_blank");
                              } else {
                                openLightbox(maintenanceForm.photos, idx);
                              }
                            }}
                            title={isPdf ? "คลิกเพื่อเปิดดูไฟล์ PDF" : "คลิกเพื่อดูรูปเต็ม"}
                          >
                            {isPdf ? (
                              <div className="flex flex-col items-center justify-center p-1 text-center select-none">
                                <FileText size={20} className="text-rose-600" />
                                <span className="text-[10px] font-bold font-mono text-rose-700 mt-0.5">PDF</span>
                              </div>
                            ) : (
                              <img
                                src={url}
                                alt={`รูปอะไหล่ที่ ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )}

                            <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isPdf) {
                                    window.open(url, "_blank");
                                  } else {
                                    openLightbox(maintenanceForm.photos, idx);
                                  }
                                }}
                                className="w-5 h-5 rounded bg-white text-slate-800 flex items-center justify-center hover:bg-slate-100 shadow-xs cursor-pointer"
                                title={isPdf ? "เปิดไฟล์ PDF" : "ดูรูปเต็ม"}
                              >
                                {isPdf ? <FileText size={10} className="text-rose-600" /> : <Search size={10} />}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemovePhoto(idx);
                                }}
                                className="w-5 h-5 rounded bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 shadow-xs cursor-pointer"
                                title="ลบไฟล์"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Upload Tile */}
                      <label
                        className={`w-16 h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer shrink-0 transition-all ${
                          isUploadingPhoto
                            ? "border-blue-300 bg-blue-50/70 cursor-wait"
                            : "border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 bg-slate-50/50"
                        }`}
                        title="คลิกเพื่อแนบรูปภาพหรือไฟล์ PDF"
                      >
                        <input
                          type="file"
                          accept="image/*,application/pdf,.pdf"
                          multiple
                          className="hidden"
                          onChange={handleMaintenancePhotoUpload}
                          disabled={isUploadingPhoto}
                        />
                        {isUploadingPhoto ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-[9px] font-bold text-blue-600">{uploadProgress}%</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-blue-600">
                            <Plus size={14} className="stroke-[3]" />
                            <span className="text-[9px] font-bold">แนบไฟล์</span>
                          </div>
                        )}
                      </label>
                    </div>

                    {isUploadingPhoto && uploadingCount > 1 && (
                      <p className="text-[11px] text-blue-600 font-medium">กำลังอัพโหลด {uploadingCount} ไฟล์... ({uploadProgress}%)</p>
                    )}
                  </div>

                  {/* Section 4: สรุปค่าใช้จ่ายและสถานะ */}
                  <div className="pt-5 border-t border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Cost */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            💰 ค่าใช้จ่ายรวม (บาท)
                          </label>
                          {repairItemsTotal > 0 && (
                            <span className="text-[10px] text-emerald-600 font-bold">
                              ✓ รวมจากรายการซ่อม
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none select-none">
                            ฿
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            style={{ paddingLeft: "2.3rem" }}
                            className="w-full input-field font-mono font-bold text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-base placeholder-slate-300"
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
                      </div>

                      {/* Status */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                          📊 สถานะ
                        </label>
                        <select
                          className="input-field bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800"
                          value={maintenanceForm.status}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            setMaintenanceForm({
                              ...maintenanceForm,
                              status: newStatus,
                              finishDate:
                                newStatus === "Completed" && !maintenanceForm.finishDate
                                  ? new Date().toISOString().split("T")[0]
                                  : maintenanceForm.finishDate,
                            });
                          }}
                        >
                          {MAINTENANCE_STATUS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Finish Date */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span>✅ วันที่ซ่อมเสร็จ</span>
                          {maintenanceForm.status === "Completed" && (
                            <span className="text-[10px] font-bold text-emerald-600">เสร็จสมบูรณ์</span>
                          )}
                        </label>
                        <input
                          type="date"
                          className={`input-field text-xs transition-all ${
                            maintenanceForm.status === "Completed"
                              ? "bg-emerald-50/30 border-emerald-300"
                              : "bg-slate-50/70 hover:bg-slate-50 focus:bg-white"
                          }`}
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
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/90 backdrop-blur-md flex items-center justify-between gap-3 rounded-b-3xl shrink-0">
                  <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span>ตรวจสอบข้อมูลและรูปภาพก่อนกดบันทึก</span>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-all active:scale-95 shadow-xs"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveMaintenance}
                      disabled={isUploadingPhoto}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingPhoto ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>กำลังอัพโหลดรูป...</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} className="stroke-[2.5]" />
                          <span>บันทึกข้อมูล</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* Maintenance Detail View Modal */}
        {viewingLog &&
          createPortal(
            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 sm:p-6 md:p-8 pt-8 sm:pt-12 pb-8 sm:pb-12 z-[9999] animate-fade-in backdrop-blur-md overflow-y-auto">
              <div className="bg-white border border-slate-200/90 text-slate-800 rounded-3xl w-full max-w-3xl max-h-[88vh] my-auto shadow-2xl flex flex-col overflow-hidden transition-all">
                {/* Accent Top Bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 shrink-0" />

                {/* Header */}
                <div
                  style={{ paddingTop: "1.25rem", paddingBottom: "1.25rem" }}
                  className="px-6 sm:px-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20 shrink-0"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                      <Wrench size={22} className="stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">
                          รายละเอียดการแจ้งซ่อมบำรุง
                        </h3>
                        <MaintenanceStatusBadge status={viewingLog.status} />
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {getVehicleName(viewingLog.vehicleId)} • วันที่ {viewingLog.date}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingLog(null)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                    title="ปิดหน้าต่าง"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto">
                  {/* Overview Cards: Vehicle, Date, Finish Date, Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        🚗 ทะเบียนรถ
                      </span>
                      <span className="text-sm font-bold text-slate-800 block mt-1 truncate" title={getVehicleName(viewingLog.vehicleId)}>
                        {getVehicleName(viewingLog.vehicleId)}
                      </span>
                    </div>

                    <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        📅 วันที่แจ้งซ่อม
                      </span>
                      <span className="text-sm font-bold text-slate-800 font-mono block mt-1">
                        {viewingLog.date || "-"}
                      </span>
                    </div>

                    <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        ✅ วันที่ซ่อมเสร็จ
                      </span>
                      <span className="text-sm font-bold text-slate-800 font-mono block mt-1">
                        {viewingLog.finishDate ? (
                          <span className="text-emerald-700 font-bold">{viewingLog.finishDate}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">ยังไม่เสร็จ</span>
                        )}
                      </span>
                    </div>

                    <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        📍 สถานที่ซ่อม
                      </span>
                      <span className="text-sm font-bold text-slate-800 block mt-1 truncate" title={viewingLog.cause || "-"}>
                        {viewingLog.cause || "-"}
                      </span>
                    </div>
                  </div>

                  {/* Issue / Symptoms */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span>⚠️</span> อาการเสีย / ปัญหาที่แจ้ง
                    </span>
                    <div className="p-4 bg-amber-50/40 border border-amber-200/70 rounded-2xl text-slate-800 font-medium text-sm leading-relaxed">
                      {viewingLog.issue || "ไม่ได้ระบุอาการเสีย"}
                    </div>
                  </div>

                  {/* Repair Items */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🛠️</span> รายการซ่อม / อะไหล่ที่เปลี่ยน
                      </span>
                      {viewingLog.repairItemList && viewingLog.repairItemList.length > 0 && (
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                          {viewingLog.repairItemList.length} รายการ
                        </span>
                      )}
                    </div>

                    {viewingLog.repairItemList && viewingLog.repairItemList.length > 0 ? (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-4 w-12 text-center">#</th>
                              <th className="py-2.5 px-4">รายการซ่อม / อะไหล่</th>
                              <th className="py-2.5 px-4 text-right w-36">ราคา (บาท)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {viewingLog.repairItemList.map((it: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-4 text-center font-mono text-xs text-slate-400">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 px-4 font-medium text-slate-800">
                                  {it.name || "-"}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                                  {it.price ? `฿${Number(it.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50/80 border-t border-slate-200 font-bold">
                            <tr>
                              <td colSpan={2} className="py-3 px-4 text-right text-slate-600 text-xs uppercase tracking-wider">
                                ค่าใช้จ่ายรวม:
                              </td>
                              <td className="py-3 px-4 text-right text-base font-mono font-black text-blue-600">
                                ฿{parseFloat(viewingLog.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl flex items-center justify-between">
                        <div className="text-sm font-medium text-slate-700">
                          {viewingLog.repairItems || "ไม่ได้ระบุรายการซ่อม"}
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">ค่าใช้จ่ายรวม</span>
                          <span className="text-base font-black font-mono text-blue-600">
                            ฿{parseFloat(viewingLog.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Photos & PDF Attachments */}
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📷</span> รูปภาพและเอกสารแนบ
                      {viewingLog.photos && viewingLog.photos.length > 0 && (
                        <span className="text-xs font-bold text-slate-600">
                          ({viewingLog.photos.length} ไฟล์)
                        </span>
                      )}
                    </span>

                    {viewingLog.photos && viewingLog.photos.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {viewingLog.photos.map((url: string, pIdx: number) => {
                          const isPdf = isPdfUrl(url);
                          return isPdf ? (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => window.open(url, "_blank")}
                              className="w-24 h-24 rounded-2xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200 text-rose-700 flex flex-col items-center justify-center p-2 transition-all hover:scale-105 shadow-2xs cursor-pointer group"
                              title="คลิกเพื่อเปิดไฟล์ PDF ในแท็บใหม่"
                            >
                              <FileText size={30} className="text-rose-600 group-hover:scale-110 transition-transform" />
                              <span className="text-[11px] font-bold font-mono mt-1 text-rose-700">เปิดดู PDF</span>
                            </button>
                          ) : (
                            <div
                              key={pIdx}
                              onClick={() => openLightbox(viewingLog.photos, pIdx)}
                              className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs cursor-pointer transition-all hover:scale-105 group relative"
                              title="คลิกเพื่อดูรูปภาพขนาดเต็ม"
                            >
                              <img
                                src={url}
                                alt={`รูปงานซ่อมที่ ${pIdx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Search size={18} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                        ไม่มีรูปภาพหรือเอกสารแนบในรายการนี้
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 sm:px-8 py-4 border-t border-slate-100 bg-slate-50/70 flex justify-between items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const logToEdit = viewingLog;
                      setViewingLog(null);
                      openModal(logToEdit);
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200/80 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil size={15} />
                    <span>แก้ไขรายการนี้</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingLog(null)}
                    className="px-5 py-2 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-xs transition-all cursor-pointer"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* Lightbox Modal for Maintenance Photos */}
        {lightboxUrl &&
          createPortal(
            <div
              className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center animate-fade-in backdrop-blur-sm"
              onClick={closeLightbox}
            >
              <button
                type="button"
                onClick={closeLightbox}
                className="absolute top-4 right-4 text-white bg-white/20 hover:bg-white/30 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold z-10 transition-colors"
                title="ปิด"
              >
                ×
              </button>
              {lightboxList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevPhoto();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/30 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold z-10 transition-colors"
                    title="รูปก่อนหน้า"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextPhoto();
                    }}
                    className="absolute right-14 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/30 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold z-10 transition-colors"
                    title="รูปถัดไป"
                  >
                    ›
                  </button>
                </>
              )}
              <img
                src={lightboxUrl}
                alt="ดูรูปใหญ่"
                className="max-w-[90vw] max-h-[88vh] object-contain rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              {lightboxList.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
                  {lightboxList.map((_, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(i);
                        setLightboxUrl(lightboxList[i]);
                      }}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        i === lightboxIndex ? "bg-white scale-125" : "bg-white/40 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>,
            document.body
          )}
      </div>
    );
  };

  const ProjectView = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
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

    // Filter projects based on search query
    const filteredProjects = useMemo(() => {
      if (!searchTerm.trim()) return projects;
      const q = searchTerm.toLowerCase();
      return projects.filter((p) => {
        const name = (p.name || p.projectName || "").toLowerCase();
        const jobNo = (p.jobNo || "").toLowerCase();
        const loc = (p.location || "").toLowerCase();
        const pm = (p.pm || "").toLowerCase();
        const cm = (p.cm || "").toLowerCase();
        return (
          name.includes(q) ||
          jobNo.includes(q) ||
          loc.includes(q) ||
          pm.includes(q) ||
          cm.includes(q)
        );
      });
    }, [projects, searchTerm]);

    // KPI Metrics
    const uniqueLocationsCount = useMemo(() => {
      const locs = new Set(
        projects
          .map((p) => (p.location || "").trim())
          .filter((l) => l && l !== "-")
      );
      return locs.size;
    }, [projects]);

    const assignedVehiclesCount = useMemo(() => {
      return vehicles.filter((v) => getVehicleProjectIds(v).length > 0).length;
    }, [vehicles]);

    const getProjectVehicleCount = (projectId?: string) => {
      if (!projectId) return 0;
      return vehicles.filter((v) => getVehicleProjectIds(v).includes(projectId)).length;
    };

    return (
      <div className="space-y-8 pb-8">
        {/* Header with Title and Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
              <Briefcase size={26} className="stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                ข้อมูลโครงการ
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                จัดการรายชื่อไซต์งาน ติดตามผู้รับผิดชอบ (PM/CM) และเครื่องจักรประจำโครงการ
              </p>
            </div>
          </div>

          <button
            onClick={() => openModal()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md shadow-amber-500/20 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer shrink-0"
          >
            <Plus size={19} className="stroke-[2.5]" />
            <span>เพิ่มโครงการใหม่</span>
          </button>
        </div>

        {/* 3 Metric Cards with Generous Spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                โครงการทั้งหมด
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center shrink-0">
                <Briefcase size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-slate-900">{projects.length}</span>
              <span className="text-xs font-semibold text-slate-400">โครงการ</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                สถานที่ / ไซต์งาน
              </span>
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200/60 text-sky-600 flex items-center justify-center shrink-0">
                <MapPin size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-slate-900">{uniqueLocationsCount}</span>
              <span className="text-xs font-semibold text-slate-400">จุดปฏิบัติงาน</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                ยานพาหนะประจำโครงการ
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shrink-0">
                <Truck size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-slate-900">{assignedVehiclesCount}</span>
              <span className="text-xs font-semibold text-slate-400">คัน</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-lg">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาชื่อโครงการ, Job No., สถานที่ หรือชื่อ PM/CM..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: "2.8rem", paddingRight: "2.5rem" }}
              className="w-full py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/90 rounded-xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                title="ล้างคำค้นหา"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="text-xs font-bold text-slate-500 flex items-center gap-2 self-end sm:self-center px-2">
            <span>แสดง {filteredProjects.length} จากทั้งหมด {projects.length} โครงการ</span>
          </div>
        </div>

        {/* Projects Cards Grid: Spacious 3-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {filteredProjects.map((p) => {
            const vCount = getProjectVehicleCount(p.id);
            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl border border-slate-200/90 hover:border-amber-400/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(245,158,11,0.12)] transition-all duration-200 flex flex-col justify-between overflow-hidden group relative"
              >
                {/* Top Accent Strip */}
                <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 opacity-70 group-hover:opacity-100 transition-opacity" />

                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-5">
                  {/* Card Header: Job No & Actions */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs bg-amber-50 text-amber-800 border border-amber-200/90 px-3 py-1 rounded-xl tracking-wide shadow-2xs">
                        {p.jobNo || "ไม่ระบุ Job No"}
                      </span>
                      {vCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/70 px-2.5 py-1 rounded-xl">
                          <Truck size={12} /> {vCount} คัน
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openModal(p)}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                        title="แก้ไขข้อมูลโครงการ"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={(e) => p.id && handleDelete(p.id, e)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="ลบโครงการ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Project Title & Location with generous line-height */}
                  <div className="space-y-2.5">
                    <h3
                      className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-amber-700 transition-colors line-clamp-2 leading-relaxed"
                      title={p.name || p.projectName}
                    >
                      {p.name || p.projectName || "-"}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500 pt-0.5">
                      <MapPin size={15} className="text-amber-500 shrink-0" />
                      <span className="truncate" title={p.location || "ไม่ได้ระบุสถานที่"}>
                        {p.location || "ไม่ได้ระบุสถานที่"}
                      </span>
                    </div>
                  </div>

                  {/* Personnel Info Box with ample padding */}
                  <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4.5 text-xs space-y-3.5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          PM (Project Mgr.)
                        </span>
                        <span className="font-semibold text-slate-800 truncate block mt-1 text-sm" title={p.pm || "-"}>
                          {p.pm || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          CM (Const. Mgr.)
                        </span>
                        <span className="font-semibold text-slate-800 truncate block mt-1 text-sm" title={p.cm || "-"}>
                          {p.cm || "-"}
                        </span>
                      </div>
                    </div>

                    {(p.machineRespName || p.machineRespPhone) && (
                      <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-600">
                        <span className="text-slate-400 font-medium">ดูแลเครื่องจักร:</span>
                        <span className="font-semibold text-slate-700 truncate max-w-[160px]" title={`${p.machineRespName || ""} ${p.machineRespPhone || ""}`}>
                          {p.machineRespName || "-"} {p.machineRespPhone ? `(${p.machineRespPhone})` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProjects.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
              <Briefcase size={36} className="text-slate-300" />
              <p className="text-sm font-bold text-slate-600">ไม่พบข้อมูลโครงการที่ค้นหา</p>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="text-xs text-amber-600 font-bold hover:underline cursor-pointer"
                >
                  ล้างคำค้นหา
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal: Add / Edit Project */}
        {isModalOpen &&
          createPortal(
            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 sm:p-6 md:p-8 pt-8 sm:pt-12 pb-8 sm:pb-12 z-[9999] animate-fade-in backdrop-blur-md overflow-y-auto">
              <div className="bg-white border border-slate-200/90 text-slate-800 rounded-3xl w-full max-w-lg my-auto shadow-2xl flex flex-col overflow-hidden transition-all">
                {/* Accent Top Bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shrink-0" />

                {/* Modal Header */}
                <div
                  style={{ paddingTop: "1.25rem", paddingBottom: "1.25rem" }}
                  className="px-6 sm:px-7 border-b border-slate-100 flex justify-between items-center bg-white shrink-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shadow-xs shrink-0">
                      {editingProject ? <Pencil size={18} /> : <Plus size={20} />}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        {editingProject ? "แก้ไขข้อมูลโครงการ" : "เพิ่มโครงการใหม่"}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {editingProject ? `แก้ไขรายละเอียด ${editingProject.jobNo}` : "กรอกข้อมูลเพื่อสร้างโครงการใหม่ในระบบ"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                    title="ปิดหน้าต่าง"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                      Job No. <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input-field bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm"
                      placeholder="เช่น J-01, JOB-67001"
                      value={formData.jobNo}
                      onChange={(e) => setFormData({ ...formData, jobNo: e.target.value })}
                      disabled={!!editingProject}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                      ชื่อโครงการ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input-field bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm"
                      placeholder="เช่น GMTP building project"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                      สถานที่ / ไซต์งาน
                    </label>
                    <input
                      type="text"
                      className="input-field bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm"
                      placeholder="เช่น ระยอง, ท่าเรือ, มาบตาพุด"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                        Project Manager (PM)
                      </label>
                      <input
                        type="text"
                        className="input-field bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm"
                        placeholder="ชื่อ PM"
                        value={formData.pm}
                        onChange={(e) => setFormData({ ...formData, pm: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                        Const. Manager (CM)
                      </label>
                      <input
                        type="text"
                        className="input-field bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm"
                        placeholder="ชื่อ CM"
                        value={formData.cm}
                        onChange={(e) => setFormData({ ...formData, cm: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-600 mb-2.5 block">
                      ผู้รับผิดชอบเครื่องจักร (Machine Resp.)
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 mb-1 block">ชื่อผู้รับผิดชอบ</label>
                        <input
                          type="text"
                          className="input-field bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm"
                          placeholder="ชื่อ-สกุล"
                          value={formData.machineRespName}
                          onChange={(e) => setFormData({ ...formData, machineRespName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 mb-1 block">เบอร์โทรศัพท์</label>
                        <input
                          type="text"
                          className="input-field bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm"
                          placeholder="08X-XXX-XXXX"
                          value={formData.machineRespPhone}
                          onChange={(e) => setFormData({ ...formData, machineRespPhone: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex justify-end items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProject}
                    className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 transition-all cursor-pointer active:scale-95"
                  >
                    บันทึกข้อมูล
                  </button>
                </div>
              </div>
            </div>,
            document.body
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
  // --- RENDER ---
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <style>{styleTags}</style>
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shadow-inner">
            <Truck size={32} />
          </div>
          <p className="text-sm font-medium animate-fade-in">กำลังโหลดระบบ...</p>
        </div>
      </div>
    );
  }

  if (!user) return (
    <LoginViewInner
      usersList={usersList}
      addData={addData}
      setUser={setUser}
      logActivity={logActivity}
      setActiveTab={setActiveTab}
    />
  );
  const newBreakdownCount = breakdownReports.filter(
    (b: any) => b.status === "New"
  ).length;

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] text-slate-800 font-sans flex-col">
      <style>{styleTags}</style>

      {viewReport && (
        <ReportDetailModal
          report={viewReport}
          onClose={() => setViewReport(null)}
          vehicleName={getVehicleName(viewReport.vehicleId)}
          projectName={getProjectName(viewReport.projectId)}
        />
      )}

      <header className="bg-white shadow-[0_1px_4px_rgba(15,23,42,0.04)] z-20 border-b border-slate-200/90 sticky top-0">
        <div className="flex justify-between items-center px-6 py-3.5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-sm flex items-center justify-center">
              <Truck size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  CMG EQM
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full">
                  PRO
                </span>
              </div>
              <div className="text-[10px] font-semibold tracking-wider text-slate-400">
                EQUIPMENT MANAGEMENT SYSTEM
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user.role === "Admin" && (
              <div
                className="relative cursor-pointer p-2.5 rounded-xl hover:bg-slate-100 border border-slate-200/80 transition-colors"
                onClick={() => setActiveTab("dashboard")}
                title="การแจ้งเตือน"
              >
                <Bell
                  size={18}
                  className="text-slate-600 hover:text-blue-600 transition-colors"
                />
                {newBreakdownCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center strobe-anim shadow-sm border-2 border-white">
                    {newBreakdownCount}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
              </div>
              <div className="text-right hidden sm:block">
                <div className="font-bold text-sm text-slate-800 leading-tight">{user.name}</div>
                <div className="text-[11px] font-medium text-slate-500 flex items-center justify-end gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {user.role}
                </div>
              </div>
            </div>
            <button
              onClick={() => { clearSession(); setUser(null); }}
              className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-1"
              title="ออกจากระบบ"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="flex overflow-x-auto px-6 py-2.5 gap-2 bg-slate-50/90 border-t border-slate-200/80 scrollbar-hide">
          {(user.role === "Admin" || user.role === "Driver") && (
            <NavButton
              icon={LayoutDashboard}
              label="ภาพรวม"
              active={activeTab === "dashboard"}
              onClick={() => setActiveTab("dashboard")}
              activeBg="bg-slate-800 text-white shadow-sm"
            />
          )}

          <NavButton
            icon={FileText}
            label="รายงานประจำวัน"
            active={activeTab === "daily"}
            onClick={() => setActiveTab("daily")}
            activeBg="bg-blue-600 text-white shadow-sm"
          />
          {user.role !== "Driver" && (
            <>
              <NavButton
                icon={Truck}
                label="ทะเบียนรถ"
                active={activeTab === "fleet"}
                onClick={() => setActiveTab("fleet")}
                activeBg="bg-emerald-600 text-white shadow-sm"
              />
              <NavButton
                icon={Briefcase}
                label="โครงการ"
                active={activeTab === "projects"}
                onClick={() => setActiveTab("projects")}
                activeBg="bg-amber-600 text-white shadow-sm"
              />
              <NavButton
                icon={Wrench}
                label="ซ่อมบำรุง"
                active={activeTab === "maintenance"}
                onClick={() => setActiveTab("maintenance")}
                activeBg="bg-orange-500 text-white shadow-sm font-bold"
              />
              <NavButton
                icon={User}
                label="คนขับ"
                active={activeTab === "drivers"}
                onClick={() => setActiveTab("drivers")}
                activeBg="bg-violet-600 text-white shadow-sm"
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
              activeBg="bg-indigo-600 text-white shadow-sm"
            />
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8 bg-[#f1f5f9]">
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
