import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import TargetRoleSelector from '../components/common/TargetRoleSelector';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Sparkles,
  Shield,
  Bell,
  CreditCard,
  Lock,
  Trash2,
  Camera,
  Check,
  X,
  Edit3,
  Save,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Building2,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Zap,
  Clock,
  LogOut
} from 'lucide-react';

const PREFERRED_INDUSTRIES = [
  'Enterprise SaaS',
  'FinTech & Banking',
  'AI / Machine Learning',
  'E-Commerce & Retail',
  'Cloud Infrastructure',
  'Cybersecurity',
  'Healthcare & BioTech',
  'EdTech'
];

const EXPERIENCE_LEVELS = [
  'Entry Level (0-2 years)',
  'Mid-Level (2-5 years)',
  'Senior (5-8 years)',
  'Staff / Lead (8+ years)'
];

const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];

export default function Profile() {
  const { user, updateUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Active section from search query or default 'overview'
  const queryParams = new URLSearchParams(location.search);
  const initialSection = queryParams.get('tab') || 'overview';
  const [activeSection, setActiveSection] = useState(initialSection);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveSection(tab);
    }
  }, [location.search]);

  const handleSelectTab = (tabId) => {
    setActiveSection(tabId);
    navigate(`/profile?tab=${tabId}`, { replace: true });
  };

  // Profile Data State
  const [personalInfo, setPersonalInfo] = useState({
    name: user?.name || '',
    email: user?.email || '',
    headline: user?.headline || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    location: user?.location || '',
    avatar: user?.avatar || '',
  });

  const [careerPrefs, setCareerPrefs] = useState({
    targetRole: user?.targetRole || localStorage.getItem('preppilot_target_role') || 'Full Stack Engineer',
    experienceLevel: user?.careerPreferences?.experienceLevel || 'Mid-Level (2-5 years)',
    preferredLocation: user?.careerPreferences?.preferredLocation || 'Remote / Hybrid',
    workMode: user?.careerPreferences?.workMode || 'Hybrid',
    preferredIndustries: user?.careerPreferences?.preferredIndustries || ['Enterprise SaaS', 'AI / Machine Learning'],
  });

  const [education, setEducation] = useState({
    degree: user?.education?.degree || '',
    college: user?.education?.college || '',
    specialization: user?.education?.specialization || '',
    graduationYear: user?.education?.graduationYear || '',
  });

  const [skills, setSkills] = useState(Array.isArray(user?.skills) ? user.skills : []);
  const [newSkillInput, setNewSkillInput] = useState('');

  const [notificationPrefs, setNotificationPrefs] = useState({
    emailAlerts: user?.notificationPreferences?.emailAlerts ?? true,
    jobMatches: user?.notificationPreferences?.jobMatches ?? true,
    interviewReminders: user?.notificationPreferences?.interviewReminders ?? true,
  });

  // Edit Mode Toggles for Sections
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [isEditingEducation, setIsEditingEducation] = useState(false);

  // Resume State
  const [resumes, setResumes] = useState([]);
  const [activeResume, setActiveResume] = useState(null);
  const [loadingResumes, setLoadingResumes] = useState(true);

  // Password & Account State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', text: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState({ type: '', text: '' });
  const [savingSection, setSavingSection] = useState('');

  const fileInputRef = useRef(null);

  // Sync state when user context updates
  useEffect(() => {
    if (user) {
      setPersonalInfo({
        name: user.name || '',
        email: user.email || '',
        headline: user.headline || '',
        bio: user.bio || '',
        phone: user.phone || '',
        location: user.location || '',
        avatar: user.avatar || '',
      });
      setCareerPrefs({
        targetRole: user.targetRole || localStorage.getItem('preppilot_target_role') || 'Full Stack Engineer',
        experienceLevel: user.careerPreferences?.experienceLevel || 'Mid-Level (2-5 years)',
        preferredLocation: user.careerPreferences?.preferredLocation || 'Remote / Hybrid',
        workMode: user.careerPreferences?.workMode || 'Hybrid',
        preferredIndustries: user.careerPreferences?.preferredIndustries || ['Enterprise SaaS', 'AI / Machine Learning'],
      });
      setEducation({
        degree: user.education?.degree || '',
        college: user.education?.college || '',
        specialization: user.education?.specialization || '',
        graduationYear: user.education?.graduationYear || '',
      });
      if (Array.isArray(user.skills) && user.skills.length > 0) {
        setSkills(user.skills);
      }
      if (user.notificationPreferences) {
        setNotificationPrefs(user.notificationPreferences);
      }
    }
  }, [user]);

  // Sync section with URL tab
  useEffect(() => {
    const tabParam = new URLSearchParams(location.search).get('tab');
    if (tabParam) {
      setActiveSection(tabParam);
    }
  }, [location.search]);

  // Fetch Resumes for Resume Card
  useEffect(() => {
    const fetchResumes = async () => {
      setLoadingResumes(true);
      try {
        const res = await axiosClient.get('/resumes');
        const list = Array.isArray(res.data) ? res.data : [];
        setResumes(list);

        const storedActiveId = localStorage.getItem('preppilot_active_resume_id');
        const found = list.find((r) => String(r._id) === String(storedActiveId));
        setActiveResume(found || (list.length > 0 ? list[0] : null));

        // If user profile has 0 skills but active resume has extracted skills, populate suggestions
        if ((!user?.skills || user.skills.length === 0) && list.length > 0) {
          const extracted = list[0]?.parsedData?.skills || [];
          if (extracted.length > 0 && skills.length === 0) {
            setSkills(extracted.slice(0, 8));
          }
        }
      } catch (err) {
        console.error('Failed to fetch resumes in profile:', err);
      } finally {
        setLoadingResumes(false);
      }
    };
    fetchResumes();
  }, []);

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage({ type: '', text: '' }), 4000);
  };

  // Calculate Dynamic Profile Completion Percentage
  const calculateCompletion = () => {
    let score = 0;
    const items = [];

    // 1. Personal Information (25%)
    const hasName = Boolean(personalInfo.name.trim());
    const hasLocation = Boolean(personalInfo.location.trim());
    const hasHeadline = Boolean(personalInfo.headline.trim());
    if (hasName && (hasLocation || hasHeadline)) {
      score += 25;
      items.push({ label: 'Personal Information', completed: true });
    } else {
      items.push({ label: 'Personal Information (Headline & Location)', completed: false });
    }

    // 2. Career Preferences (25%)
    const hasRole = Boolean(careerPrefs.targetRole.trim());
    const hasIndustries = careerPrefs.preferredIndustries.length > 0;
    if (hasRole && hasIndustries) {
      score += 25;
      items.push({ label: 'Target Role & Preferences', completed: true });
    } else {
      items.push({ label: 'Target Role & Industry Preferences', completed: false });
    }

    // 3. Education Details (25%)
    const hasDegree = Boolean(education.degree.trim());
    const hasCollege = Boolean(education.college.trim());
    if (hasDegree || hasCollege) {
      score += 25;
      items.push({ label: 'Education Records', completed: true });
    } else {
      items.push({ label: 'Education Details (Degree or College)', completed: false });
    }

    // 4. Skills Indexed (25%)
    if (skills.length >= 3) {
      score += 25;
      items.push({ label: 'Technical Skills (3+ skills)', completed: true });
    } else {
      items.push({ label: `Add Skills (${skills.length}/3 indexed)`, completed: false });
    }

    return { percentage: Math.min(100, score), items };
  };

  const { percentage: completionPercentage, items: completionItems } = calculateCompletion();

  // Save Personal Info
  const handleSavePersonalInfo = async () => {
    if (!personalInfo.name.trim()) {
      showToast('error', 'Full name is required.');
      return;
    }
    setSavingSection('personal');
    try {
      const res = await axiosClient.put('/auth/profile', {
        name: personalInfo.name,
        headline: personalInfo.headline,
        bio: personalInfo.bio,
        phone: personalInfo.phone,
        location: personalInfo.location,
        avatar: personalInfo.avatar,
      });

      if (updateUser) {
        updateUser(res.data.user);
      }
      setIsEditingPersonal(false);
      showToast('success', 'Personal information saved successfully!');
    } catch (err) {
      console.error('Failed to update personal info:', err);
      showToast('error', err.response?.data?.message || 'Failed to update personal info.');
    } finally {
      setSavingSection('');
    }
  };

  // Save Career Preferences
  const handleSavePreferences = async (newRole) => {
    const roleToSave = newRole || careerPrefs.targetRole;
    setSavingSection('preferences');
    try {
      const res = await axiosClient.put('/auth/profile', {
        targetRole: roleToSave,
        careerPreferences: {
          experienceLevel: careerPrefs.experienceLevel,
          preferredLocation: careerPrefs.preferredLocation,
          workMode: careerPrefs.workMode,
          preferredIndustries: careerPrefs.preferredIndustries,
        },
      });

      localStorage.setItem('preppilot_target_role', roleToSave);
      setCareerPrefs((prev) => ({ ...prev, targetRole: roleToSave }));

      if (updateUser) {
        updateUser(res.data.user);
      }
      setIsEditingPreferences(false);
      showToast('success', 'Career preferences updated!');
    } catch (err) {
      console.error('Failed to update preferences:', err);
      showToast('error', err.response?.data?.message || 'Failed to update preferences.');
    } finally {
      setSavingSection('');
    }
  };

  // Save Education Details
  const handleSaveEducation = async () => {
    setSavingSection('education');
    try {
      const res = await axiosClient.put('/auth/profile', {
        education,
      });

      if (updateUser) {
        updateUser(res.data.user);
      }
      setIsEditingEducation(false);
      showToast('success', 'Education details saved!');
    } catch (err) {
      console.error('Failed to update education:', err);
      showToast('error', err.response?.data?.message || 'Failed to update education.');
    } finally {
      setSavingSection('');
    }
  };

  // Add / Remove Skills
  const handleAddSkill = async (e) => {
    if (e) e.preventDefault();
    const clean = newSkillInput.trim();
    if (!clean) return;
    if (skills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      showToast('error', 'This skill is already in your profile list.');
      return;
    }
    const updated = [...skills, clean];
    setSkills(updated);
    setNewSkillInput('');
    await handlePersistSkills(updated);
  };

  const handleRemoveSkill = async (skillToRemove) => {
    const updated = skills.filter((s) => s !== skillToRemove);
    setSkills(updated);
    await handlePersistSkills(updated);
  };

  const handlePersistSkills = async (updatedList) => {
    try {
      const res = await axiosClient.put('/auth/profile', {
        skills: updatedList,
      });
      if (updateUser) {
        updateUser(res.data.user);
      }
      showToast('success', 'Skills updated!');
    } catch (err) {
      console.error('Failed to persist skills:', err);
      showToast('error', 'Failed to save skills.');
    }
  };

  // Import skills from active resume
  const handleImportResumeSkills = async () => {
    const extracted = activeResume?.parsedData?.skills || [];
    if (extracted.length === 0) {
      showToast('error', 'No extracted skills found in active resume.');
      return;
    }
    const merged = Array.from(new Set([...skills, ...extracted]));
    setSkills(merged);
    await handlePersistSkills(merged);
    showToast('success', `Imported ${extracted.length} skills from active resume!`);
  };

  // Handle Photo Upload
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('error', 'Please upload a JPEG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Image size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      setPersonalInfo((prev) => ({ ...prev, avatar: base64Data }));
      try {
        const res = await axiosClient.put('/auth/profile', { avatar: base64Data });
        if (updateUser) {
          updateUser(res.data.user);
        }
        showToast('success', 'Profile photo updated!');
      } catch (err) {
        showToast('error', 'Failed to save profile photo.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    setPersonalInfo((prev) => ({ ...prev, avatar: '' }));
    try {
      const res = await axiosClient.put('/auth/profile', { avatar: '' });
      if (updateUser) {
        updateUser(res.data.user);
      }
      showToast('success', 'Profile photo removed.');
    } catch (err) {
      showToast('error', 'Failed to remove photo.');
    }
  };

  // Toggle Industry
  const handleToggleIndustry = (ind) => {
    const current = careerPrefs.preferredIndustries;
    const exists = current.includes(ind);
    const updated = exists ? current.filter((i) => i !== ind) : [...current, ind];
    setCareerPrefs((prev) => ({ ...prev, preferredIndustries: updated }));
  };

  // Notification Toggles
  const handleToggleNotification = async (key) => {
    const updated = { ...notificationPrefs, [key]: !notificationPrefs[key] };
    setNotificationPrefs(updated);
    try {
      const res = await axiosClient.put('/auth/profile', {
        notificationPreferences: updated,
      });
      if (updateUser) {
        updateUser(res.data.user);
      }
      showToast('success', 'Notification preferences saved.');
    } catch (err) {
      showToast('error', 'Failed to update preferences.');
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordStatus({ type: 'error', text: 'Please fill out all password fields.' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordStatus({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setSavingPassword(true);
    setPasswordStatus({ type: '', text: '' });
    try {
      await axiosClient.put('/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordStatus({ type: 'success', text: 'Password successfully changed!' });
    } catch (err) {
      setPasswordStatus({ type: 'error', text: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setDeleteError('');
    try {
      await axiosClient.delete('/auth/account', {
        data: { password: deletePassword },
      });
      setDeleteModalOpen(false);
      logout();
      navigate('/login');
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete account. Please verify password.');
    } finally {
      setDeletingAccount(false);
    }
  };

  // Sidebar Menu Items
  const sidebarItems = [
    { id: 'overview', label: 'My Profile', icon: User, desc: 'Candidate credentials, avatar & personal bio' },
    { id: 'preferences', label: 'Career Preferences', icon: Briefcase, desc: 'Target engineering role, work mode & target industries' },
    { id: 'education', label: 'Education & Skills', icon: GraduationCap, desc: 'Degrees, academic credentials & technical skills' },
    { id: 'resume', label: 'Resume & Documents', icon: FileText, desc: 'Active resume parsing, ATS score & role detection' },
    { id: 'settings', label: 'Account Settings', icon: Lock, desc: 'Password security & danger zone controls' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Email alerts, mock loop reminders & job matches' },
    { id: 'subscription', label: 'Subscription', icon: CreditCard, desc: 'PrepPilot Pro membership & platform access' },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield, desc: 'Data retention, interview audio security & policies' },
    { id: 'all', label: 'All Settings', icon: Layers, desc: 'Full unified profile configuration overview' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F6ED] py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ================= TOAST NOTIFICATION ================= */}
        {toastMessage.text && (
          <div
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl border-2 shadow-xl flex items-center space-x-3 text-xs font-bold animate-fadeIn ${
              toastMessage.type === 'error'
                ? 'bg-rose-50 border-rose-600 text-rose-950'
                : 'bg-emerald-50 border-emerald-600 text-emerald-950'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* ================= TOP BREADCRUMB / HEADER ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FDFBF3] p-4 sm:p-5 rounded-2xl border-2 border-[#10221D] editorial-shadow-sm">
          <div>
            <div className="flex items-center space-x-2 text-xs text-[#10221D]/60 font-semibold mb-1">
              <span className="hover:text-[#10221D] cursor-pointer" onClick={() => navigate('/dashboard')}>
                Dashboard
              </span>
              <span>/</span>
              <span className="text-[#F47721] font-bold">Candidate Profile</span>
            </div>
            <h1 className="font-serif-headline text-2xl sm:text-3xl font-black text-[#10221D]">
              Candidate Profile & Career Settings
            </h1>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/resumes')}
              className="px-3.5 py-1.5 bg-[#FAF8F0] hover:bg-[#F5F2E6] text-[#10221D] rounded-xl text-xs font-bold border border-[#10221D]/30 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#F47721]" />
              <span>Resume Studio</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/career-hub')}
              className="px-3.5 py-1.5 bg-[#10221D] hover:bg-[#1A332E] text-[#FAF8F0] rounded-xl text-xs font-bold border border-[#10221D] transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#FFC400]" />
              <span>Career Hub</span>
            </button>
          </div>
        </div>

        {/* ================= MOBILE / TABLET HORIZONTAL TABS ================= */}
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#10221D] text-[#FAF8F0] border-[#10221D] shadow-xs'
                    : 'bg-[#FDFBF3] text-[#10221D]/80 border-[#10221D]/15 hover:border-[#10221D]/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#FFC400]' : 'text-[#10221D]/60'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* ================= 3-COLUMN DESKTOP LAYOUT ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ----------------- COLUMN 1: LEFT SIDEBAR (col-span-3) ----------------- */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-[#FDFBF3] border-2 border-[#10221D] rounded-2xl p-3 sm:p-4 editorial-shadow-sm space-y-1">
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#10221D]/50 border-b border-[#10221D]/10 mb-1">
                Profile Navigation
              </div>

              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border-2 text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#10221D] text-[#FAF8F0] border-[#10221D] shadow-xs'
                        : 'border-transparent text-[#10221D]/80 hover:bg-[#F5F2E6] hover:text-[#10221D]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FFC400]' : 'text-[#10221D]/70'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#FFC400]" />}
                  </button>
                );
              })}
            </div>

            {/* Support Card at Bottom */}
            <div className="bg-[#FAF8F0] border-2 border-[#10221D] rounded-2xl p-4 editorial-shadow-sm space-y-2">
              <div className="flex items-center space-x-2 text-xs font-black text-[#F47721] uppercase tracking-wider">
                <HelpCircle className="w-4 h-4" />
                <span>Candidate Support</span>
              </div>
              <p className="text-[11px] text-[#10221D]/70 font-medium leading-relaxed">
                Have questions about interview readiness or career match algorithms?
              </p>
              <a
                href="mailto:support@preppilot.ai?subject=PrepPilot%20Candidate%20Support"
                className="w-full inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-[#10221D] text-[#FAF8F0] hover:bg-[#1A332E] text-xs font-bold border border-[#10221D] transition-colors"
              >
                <span>Contact Support</span>
                <ExternalLink className="w-3 h-3 text-[#FFC400]" />
              </a>
            </div>
          </aside>

          {/* ----------------- COLUMN 2: MAIN WORKSPACE (col-span-6) ----------------- */}
          <main className="lg:col-span-6 space-y-6">

            {/* Current Section Title Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
              <div>
                <h2 className="text-xl sm:text-2xl font-black font-serif-headline text-[#10221D]">
                  {sidebarItems.find((s) => s.id === activeSection)?.label || 'Candidate Profile'}
                </h2>
                <p className="text-xs text-[#10221D]/70 font-medium">
                  {sidebarItems.find((s) => s.id === activeSection)?.desc || 'Manage your account settings and preferences.'}
                </p>
              </div>
              {activeSection !== 'all' ? (
                <button
                  type="button"
                  onClick={() => handleSelectTab('all')}
                  className="text-xs font-bold text-[#F47721] hover:underline self-start sm:self-auto cursor-pointer"
                >
                  View All Settings →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelectTab('overview')}
                  className="text-xs font-bold text-[#F47721] hover:underline self-start sm:self-auto cursor-pointer"
                >
                  ← Back to Tab View
                </button>
              )}
            </div>

            {/* ================= SECTION: OVERVIEW / PERSONAL ================= */}
            {(activeSection === 'overview' || activeSection === 'all') && (
              <>
                {/* 1. PROFILE OVERVIEW CARD */}
                <div className="bg-[#FDFBF3] border-2 border-[#10221D] rounded-2xl p-5 sm:p-6 editorial-shadow-sm space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#10221D]/10">
                <div className="flex items-start space-x-4">
                  {/* Avatar with Upload Trigger */}
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-[#10221D] text-[#FFC400] border-2 border-[#10221D] flex items-center justify-center text-2xl font-black overflow-hidden shadow-xs">
                      {personalInfo.avatar ? (
                        <img src={personalInfo.avatar} alt={personalInfo.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{personalInfo.name ? personalInfo.name.charAt(0).toUpperCase() : 'U'}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-lg bg-[#FFC400] text-[#10221D] border border-[#10221D] hover:bg-[#e0b000] shadow-sm cursor-pointer transition-transform hover:scale-110"
                      title="Upload profile photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Name, Email, Headline */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif-headline text-xl sm:text-2xl font-black text-[#10221D]">
                        {personalInfo.name || 'Candidate'}
                      </h2>
                      <span className="bg-[#FFC400] text-[#10221D] border border-[#10221D]/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                        {careerPrefs.targetRole ? careerPrefs.targetRole.split(' ')[0] : 'Candidate'}
                      </span>
                    </div>

                    <p className="text-xs text-[#10221D]/70 font-semibold flex items-center space-x-1">
                      <Mail className="w-3 h-3 text-[#F47721]" />
                      <span>{personalInfo.email}</span>
                      <span className="text-emerald-700 font-bold ml-1">• Verified</span>
                    </p>

                    <p className="text-xs font-bold text-[#10221D] pt-0.5">
                      {personalInfo.headline || `${careerPrefs.targetRole} • Open to Opportunities`}
                    </p>

                    <div className="flex flex-wrap gap-3 text-[11px] text-[#10221D]/60 pt-1">
                      {personalInfo.location && (
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{personalInfo.location}</span>
                        </span>
                      )}
                      {education.degree && (
                        <span className="flex items-center space-x-1">
                          <GraduationCap className="w-3 h-3" />
                          <span>{education.degree}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingPersonal(!isEditingPersonal)}
                  className="px-3 py-1.5 rounded-xl border border-[#10221D]/30 bg-[#FAF8F0] hover:bg-[#F5F2E6] text-xs font-bold text-[#10221D] flex items-center space-x-1 self-start cursor-pointer shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#F47721]" />
                  <span>{isEditingPersonal ? 'Close Edit' : 'Edit Profile'}</span>
                </button>
              </div>

              {/* Bio / Career Statement */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#10221D]/60">
                  Career Statement
                </span>
                <p className="text-xs text-[#10221D]/80 leading-relaxed font-medium bg-[#FAF8F0] p-3 rounded-xl border border-[#10221D]/15">
                  {personalInfo.bio ||
                    `Motivated ${careerPrefs.targetRole} preparing for technical interviews and top placement rounds. Focused on scalable engineering practices, system performance, and continuous career growth.`}
                </p>
              </div>
            </div>

            {/* 2. PERSONAL INFORMATION FORM */}
            <div className="bg-[#FDFBF3] border-2 border-[#10221D] rounded-2xl p-5 sm:p-6 editorial-shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#10221D]/10">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-[#F47721]" />
                  <h3 className="font-serif-headline text-lg font-black text-[#10221D]">
                    Personal Information
                  </h3>
                </div>
                {!isEditingPersonal ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingPersonal(true)}
                    className="text-xs font-bold text-[#F47721] hover:underline"
                  >
                    Edit Details →
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    Editing Mode
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <label className="block text-[11px] font-bold text-[#10221D]/70 mb-1">Full Name</label>
                  {isEditingPersonal ? (
                    <input
                      type="text"
                      value={personalInfo.name}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#10221D]/30 bg-white font-bold text-[#10221D] focus:outline-hidden focus:border-[#10221D]"
                    />
                  ) : (
                    <p className="font-bold text-[#10221D] py-1">{personalInfo.name || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#10221D]/70 mb-1">Email Address</label>
                  <p className="font-bold text-[#10221D] py-1 text-[#10221D]/80">
                    {personalInfo.email}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#10221D]/70 mb-1">Phone Number (Optional)</label>
                  {isEditingPersonal ? (
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={personalInfo.phone}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#10221D]/30 bg-white font-bold text-[#10221D] focus:outline-hidden focus:border-[#10221D]"
                    />
                  ) : (
                    <p className="font-bold text-[#10221D] py-1">{personalInfo.phone || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#10221D]/70 mb-1">Location</label>
                  {isEditingPersonal ? (
                    <input
                      type="text"
                      placeholder="e.g. Bengaluru, India or Remote"
                      value={personalInfo.location}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, location: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#10221D]/30 bg-white font-bold text-[#10221D] focus:outline-hidden focus:border-[#10221D]"
                    />
                  ) : (
                    <p className="font-bold text-[#10221D] py-1">{personalInfo.location || 'Not provided'}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#10221D]/70 mb-1">Profile Headline</label>
                  {isEditingPersonal ? (
                    <input
                      type="text"
                      placeholder="e.g. Senior Backend Engineer | Distributed Systems"
                      value={personalInfo.headline}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, headline: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#10221D]/30 bg-white font-bold text-[#10221D] focus:outline-hidden focus:border-[#10221D]"
                      maxLength={140}
                    />
                  ) : (
                    <p className="font-bold text-[#10221D] py-1">{personalInfo.headline || 'Not provided'}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#10221D]/70 mb-1">Career Statement / Bio</label>
                  {isEditingPersonal ? (
                    <textarea
                      rows={3}
                      placeholder="Write a brief professional summary..."
                      value={personalInfo.bio}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, bio: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#10221D]/30 bg-white font-medium text-[#10221D] focus:outline-hidden focus:border-[#10221D]"
                      maxLength={600}
                    />
                  ) : (
                    <p className="font-medium text-[#10221D]/80 py-1 text-xs">{personalInfo.bio || 'Not provided'}</p>
                  )}
                </div>
              </div>

              {isEditingPersonal && (
                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#10221D]/10">
                  <button
                    type="button"
                    onClick={() => setIsEditingPersonal(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-[#10221D]/20 text-xs font-bold text-[#10221D] hover:bg-[#FAF8F0]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePersonalInfo}
                    disabled={savingSection === 'personal'}
                    className="px-4 py-1.5 rounded-xl bg-[#10221D] hover:bg-[#1A332E] text-[#FAF8F0] text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center space-x-1"
                  >
                    <Save className="w-3.5 h-3.5 text-[#FFC400]" />
                    <span>{savingSection === 'personal' ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ================= SECTION: CAREER PREFERENCES ================= */}
        {(activeSection === 'preferences' || activeSection === 'all') && (
          <div className="bg-[#FDFBF3] border-2 border-[#10221D] rounded-2xl p-5 sm:p-6 editorial-shadow-sm space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-[#10221D]/10">
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-[#F47721]" />
                  <h3 className="font-serif-headline text-lg font-black text-[#10221D]">
                    Career Preferences & Target Role
                  </h3>
                </div>
                {!isEditingPreferences ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingPreferences(true)}
                    className="text-xs font-bold text-[#F47721] hover:underline"
                  >
                    Configure Preferences →
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    Editing Mode
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {/* Target Role Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-[#10221D]/70 mb-1">
                    Target Engineering Role
                  </label>
                  {isEditingPreferences ? (
                    <TargetRoleSelector
                      value={careerPrefs.targetRole}
                      onChange={(val) => setCareerPrefs({ ...careerPrefs, targetRole: val })}
                      onApply={(val) => handleSavePreferences(val)}
                    />
                  ) : (
                    <div className="p-3 bg-[#FAF8F0] rounded-xl border border-[#10221D]/15 flex items-center justify-between">
                      <span className="font-black text-[#10221D] text-sm">{careerPrefs.targetRole}</span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        Active Preference
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-[#10221D]/70 mb-1">
                      Experience Level
                    </label>
                    {isEditingPreferences ? (
                      <select
                        value={careerPrefs.experienceLevel}
                        onChange={(e) => setCareerPrefs({ ...careerPrefs, experienceLevel: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#10221D]/30 bg-white font-bold text-[#10221D]"
                      >
                        {EXPERIENCE_LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="font-bold text-[#10221D] py-1">{careerPrefs.experienceLevel}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#10221D]/70 mb-1">
                      Work Mode Preference
                    </label>
                    {isEditingPreferences ? (
                      <select
                        value={careerPrefs.workMode}
                        onChange={(e) => setCareerPrefs({ ...careerPrefs, workMode: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#10221D]/30 bg-white font-bold text-[#10221D]"
                      >
                        {WORK_MODES.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="font-bold text-[#10221D] py-1">{careerPrefs.workMode}</p>
                    )}
                  </div>
                </div>

                {/* Target Industries */}
                <div>
                  <label className="block text-[11px] font-bold text-[#10221D]/70 mb-1.5">
                    Target Industries ({careerPrefs.preferredIndustries.length} Selected)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PREFERRED_INDUSTRIES.map((ind) => {
                      const isSelected = careerPrefs.preferredIndustries.includes(ind);
                      return (
                        <button
                          key={ind}
                          type="button"
                          onClick={() => isEditingPreferences && handleToggleIndustry(ind)}
                          disabled={!isEditingPreferences}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-[#10221D] text-[#FAF8F0] border-[#10221D]'
                              : 'bg-white text-[#10221D]/70 border-[#10221D]/20 hover:border-[#10221D]'
                          } ${!isEditingPreferences ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          {isSelected && '✓ '}
                          {ind}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {isEditingPreferences && (
                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#10221D]/10">
                  <button
                    type="button"
                    onClick={() => setIsEditingPreferences(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-[#10221D]/20 text-xs font-bold text-[#10221D] hover:bg-[#FAF8F0]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSavePreferences()}
                    disabled={savingSection === 'preferences'}
                    className="px-4 py-1.5 rounded-xl bg-[#10221D] hover:bg-[#1A332E] text-[#FAF8F0] text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center space-x-1"
                  >
                    <Save className="w-3.5 h-3.5 text-[#FFC400]" />
                    <span>{savingSection === 'preferences' ? 'Saving...' : 'Save Preferences'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= SECTION: EDUCATION & SKILLS ================= */}
          {(activeSection === 'education' || activeSection === 'all') && (
            <>
              {/* 4. EDUCATION DETAILS */}
              <div className="bg-[#FDFBF3] border-2 border-[#10221D] rounded-2xl p-5 sm:p-6 editorial-shadow-sm space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-[#10221D]/10">
                <div className="flex items-center space-x-2">
                  <GraduationCap className="w-4 h-4 text-[#F47721]" />
                  <h3 className="font-serif-headline text-lg font-black text-[#10221D]">
                    Education & Credentials
                  </h3>
                </div>
                {!isEditingEducation ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingEducation(true)}
                    className="text-xs font-bold text-[#F47721] hover:underline"
                  >
                    Edit Education →
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    Editing Mode
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <label className="block text-[11px] font-bold text-[#10221D]/70 mb-1">Degree</label>
                  {isEditingEducation ? (
                    <input
                      type="text"
                      placeholder="e.g. B.Tech Computer Science"
                      value={education.degree}
                      onChange={(e) => setEducation({ ...education, degree: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#10221D]/30 bg-white font-bold text-[#10221D]"
                    />
                  ) : (
                    <p className="font-bold text-[#10221D] py-1">{education.degree || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#10221D]/70 mb-1">College / University</label>
                  {isEditingEducation ? (
                    <input
                      type="text"
                      placeholder="e.g. National Institute of Technology"
                      value={education.college}
                      onChange={(e) => setEducation({ ...education, college: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#10221D]/30 bg-white font-bold text-[#10221D]"
                    />
                  ) : (
                    <p className="font-bold text-[#10221D] py-1">{education.college || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#10221D]/70 mb-1">Specialization / Major</label>
                  {isEditingEducation ? (
                    <input
                      type="text"
                      placeholder="e.g. AI & Cloud Architecture"
                      value={education.specialization}
                      onChange={(e) => setEducation({ ...education, specialization: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#10221D]/30 bg-white font-bold text-[#10221D]"
                    />
                  ) : (
                    <p className="font-bold text-[#10221D] py-1">{education.specialization || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#10221D]/70 mb-1">Graduation Year</label>
                  {isEditingEducation ? (
                    <input
                      type="text"
                      placeholder="e.g. 2025"
                      value={education.graduationYear}
                      onChange={(e) => setEducation({ ...education, graduationYear: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#10221D]/30 bg-white font-bold text-[#10221D]"
                    />
                  ) : (
                    <p className="font-bold text-[#10221D] py-1">{education.graduationYear || 'Not provided'}</p>
                  )}
                </div>
              </div>

              {isEditingEducation && (
                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#10221D]/10">
                  <button
                    type="button"
                    onClick={() => setIsEditingEducation(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-[#10221D]/20 text-xs font-bold text-[#10221D] hover:bg-[#FAF8F0]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEducation}
                    disabled={savingSection === 'education'}
                    className="px-4 py-1.5 rounded-xl bg-[#10221D] hover:bg-[#1A332E] text-[#FAF8F0] text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center space-x-1"
                  >
                    <Save className="w-3.5 h-3.5 text-[#FFC400]" />
                    <span>{savingSection === 'education' ? 'Saving...' : 'Save Education'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 5. SKILLS & TECHNOLOGIES */}
            <div className="bg-[#FDFBF3] border-2 border-[#10221D] rounded-2xl p-5 sm:p-6 editorial-shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#10221D]/10">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#F47721]" />
                  <h3 className="font-serif-headline text-lg font-black text-[#10221D]">
                    Indexed Skills & Competencies ({skills.length})
                  </h3>
                </div>
                {activeResume?.parsedData?.skills?.length > 0 && (
                  <button
                    type="button"
                    onClick={handleImportResumeSkills}
                    className="text-xs font-bold text-[#F47721] hover:underline flex items-center space-x-1"
                  >
                    <span>Import from Resume</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Add Skill Input Form */}
              <form onSubmit={handleAddSkill} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a technical skill (e.g. React, Docker, System Design)..."
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  maxLength={50}
                  className="flex-1 px-3 py-2 rounded-xl border border-[#10221D]/30 bg-white font-bold text-xs text-[#10221D] focus:outline-hidden focus:border-[#10221D]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-[#10221D] hover:bg-[#1A332E] text-[#FAF8F0] rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  + Add Skill
                </button>
              </form>

              {/* Skills Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {skills.length > 0 ? (
                  skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-[#FAF8F0] border border-[#10221D]/25 text-xs font-bold text-[#10221D] shadow-2xs"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-[#10221D]/50 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remove skill"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-[#10221D]/60 italic py-2">
                    No skills indexed in profile yet. Add skills above or import from your resume.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* ================= SECTION: RESUME & DOCUMENTS ================= */}
        {(activeSection === 'resume' || activeSection === 'all') && (
          <div className="bg-[#FDFBF3] border-2 border-[#10221D] rounded-2xl p-5 sm:p-6 editorial-shadow-sm space-y-5 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#10221D]/10">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-[#F47721]" />
                <div>
                  <h3 className="font-serif-headline text-lg font-black text-[#10221D]">
                    Resume & Document Intelligence
                  </h3>
                  <p className="text-xs text-[#10221D]/60 font-medium">
                    Manage parsed resumes, verify ATS compatibility, and synchronize technical skills.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/resumes')}
                className="px-3.5 py-1.5 bg-[#10221D] hover:bg-[#1A332E] text-[#FAF8F0] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 shrink-0 cursor-pointer"
              >
                <span>Open Resume Studio</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#FFC400]" />
              </button>
            </div>

            {loadingResumes ? (
              <div className="py-8 text-center text-xs text-[#10221D]/60 flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#F47721]" />
                <span>Loading your resume documents...</span>
              </div>
            ) : activeResume ? (
              <div className="space-y-4">
                {/* Active Document Card */}
                <div className="p-4 bg-[#FAF8F0] rounded-2xl border border-[#10221D]/20 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="p-2 rounded-xl bg-[#10221D] text-[#FFC400] shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs sm:text-sm text-[#10221D] truncate" title={activeResume.fileName}>
                          {activeResume.fileName}
                        </p>
                        <p className="text-[11px] text-[#10221D]/60">
                          Active Primary Document • Uploaded {new Date(activeResume.createdAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg">
                      Active for Mock Loops
                    </span>
                  </div>

                  {/* ATS Compatibility & Role Detection Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#10221D]/10">
                    <div className="p-3 bg-white rounded-xl border border-[#10221D]/10 text-center sm:text-left">
                      <span className="text-[10px] font-black uppercase text-[#10221D]/60 block mb-0.5">ATS Score</span>
                      <div className="flex items-baseline justify-center sm:justify-start space-x-1">
                        <span className="text-xl font-serif-headline font-black text-[#10221D]">
                          {activeResume.parsedData?.atsScore || 85}
                        </span>
                        <span className="text-xs text-[#10221D]/50 font-bold">/100</span>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-[#10221D]/10 text-center sm:text-left">
                      <span className="text-[10px] font-black uppercase text-[#10221D]/60 block mb-0.5">Resume Inferred Role</span>
                      <p className="text-xs font-bold text-[#10221D] truncate">
                        {activeResume.parsedData?.targetRole || 'Software Engineer'}
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-[#10221D]/10 text-center sm:text-left">
                      <span className="text-[10px] font-black uppercase text-[#10221D]/60 block mb-0.5">Extracted Skills</span>
                      <p className="text-xs font-bold text-[#10221D]">
                        {activeResume.parsedData?.skills?.length || skills.length} Keywords
                      </p>
                    </div>
                  </div>

                  {/* Skills Import Shortcut */}
                  {activeResume.parsedData?.skills?.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
                      <span className="text-[#10221D]/70 font-medium">
                        Resume contains {activeResume.parsedData.skills.length} technical skills.
                      </span>
                      <button
                        type="button"
                        onClick={handleImportResumeSkills}
                        className="font-bold text-[#F47721] hover:underline flex items-center space-x-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Sync with Profile Skills</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => navigate('/resumes')}
                    className="px-4 py-2 rounded-xl bg-[#FAF8F0] hover:bg-[#F5F2E6] border border-[#10221D]/30 text-xs font-bold text-[#10221D] transition-colors"
                  >
                    View All Documents ({resumes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/resumes')}
                    className="px-4 py-2 rounded-xl bg-[#10221D] hover:bg-[#1A332E] text-[#FAF8F0] text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
                  >
                    <span>Upload New Resume</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#FFC400]" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-[#FAF8F0] rounded-2xl border border-[#10221D]/15 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#10221D]/5 flex items-center justify-center mx-auto text-[#10221D]/50">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif-headline text-base font-bold text-[#10221D]">No Resume Attached</h4>
                  <p className="text-xs text-[#10221D]/60 max-w-md mx-auto">
                    Upload your resume to automatically calibrate AI mock interview loops, benchmark ATS compatibility, and extract your verified skills.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/resumes')}
                  className="px-4 py-2 bg-[#FFC400] text-[#10221D] hover:bg-[#e0b000] rounded-xl text-xs font-black border border-[#10221D] shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Upload Resume in Studio</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= SECTION: ACCOUNT SETTINGS ================= */}
        {(activeSection === 'settings' || activeSection === 'all') && (
          <div className="bg-[#FDFBF3] border-2 border-[#10221D] rounded-2xl p-5 sm:p-6 editorial-shadow-sm space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#10221D]/10">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-[#F47721]" />
                <h3 className="font-serif-headline text-lg font-black text-[#10221D]">
                  Account Security & Credentials
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                Password Protected
              </span>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-3 bg-[#FAF8F0] p-4 rounded-xl border border-[#10221D]/15">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#10221D]">
                Change Account Password
              </h4>

              {passwordStatus.text && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                    passwordStatus.type === 'error'
                      ? 'bg-rose-100 text-rose-900 border border-rose-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}
                >
                  {passwordStatus.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  )}
                  <span>{passwordStatus.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#10221D]/70 mb-1">Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#10221D]/30 bg-white text-xs font-bold text-[#10221D]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#10221D]/70 mb-1">New Password (6+ chars)</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#10221D]/30 bg-white text-xs font-bold text-[#10221D]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#10221D]/70 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#10221D]/30 bg-white text-xs font-bold text-[#10221D]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-1.5 bg-[#10221D] hover:bg-[#1A332E] text-[#FAF8F0] rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>

            {/* Danger Zone: Account Deletion */}
            <div className="p-4 bg-rose-50/70 border-2 border-rose-300 rounded-xl space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-rose-900 font-black">
                <Trash2 className="w-4 h-4 text-rose-700" />
                <span>Danger Zone: Account Deletion</span>
              </div>
              <p className="text-[11px] text-rose-900/80 font-medium leading-relaxed">
                Permanently deletes your PrepPilot candidate account, verified interview records, and uploaded resume analyses. This action cannot be reversed.
              </p>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Delete Account...
              </button>
            </div>
          </div>
        )}

        {/* ================= SECTION: NOTIFICATIONS ================= */}
        {(activeSection === 'notifications' || activeSection === 'all') && (
          <div className="bg-[#FDFBF3] border-2 border-[#10221D] rounded-2xl p-5 sm:p-6 editorial-shadow-sm space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#10221D]/10">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-[#F47721]" />
                <h3 className="font-serif-headline text-lg font-black text-[#10221D]">
                  Notification & Communication Alerts
                </h3>
              </div>
              <span className="text-xs font-bold text-[#10221D]/60">
                Auto-saved
              </span>
            </div>

            <p className="text-xs text-[#10221D]/70 font-medium">
              Control which email alerts and in-app updates you receive regarding mock interviews, streak milestones, and career opportunities.
            </p>

            <div className="space-y-3 pt-1">
              {[
                {
                  key: 'interviewReminders',
                  label: 'Interview Reminders & Daily Goal Alerts',
                  desc: 'Get reminders for scheduled mock loops, practice target streaks, and readiness checks.'
                },
                {
                  key: 'jobMatches',
                  label: 'AI Matched Job Alerts',
                  desc: 'Receive immediate alerts when jobs matching your career preferences and skills are detected.'
                },
                {
                  key: 'emailAlerts',
                  label: 'Platform & Security Announcements',
                  desc: 'Stay informed about major feature releases, model improvements, and security notices.'
                },
              ].map((notif) => (
                <div
                  key={notif.key}
                  className="p-3.5 bg-[#FAF8F0] rounded-xl border border-[#10221D]/15 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-[#10221D]">{notif.label}</p>
                    <p className="text-[11px] text-[#10221D]/60 font-medium">{notif.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotification(notif.key)}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 shrink-0 cursor-pointer ${
                      notificationPrefs[notif.key] ? 'bg-emerald-600 justify-end' : 'bg-stone-300 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-sm block" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= SECTION: SUBSCRIPTION ================= */}
        {(activeSection === 'subscription' || activeSection === 'all') && (
          <div className="bg-[#FDFBF3] border-2 border-[#10221D] rounded-2xl p-5 sm:p-6 editorial-shadow-sm space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#10221D]/10">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-[#F47721]" />
                <h3 className="font-serif-headline text-lg font-black text-[#10221D]">
                  PrepPilot Membership & Platform Tier
                </h3>
              </div>
              <span className="bg-[#FFC400] text-[#10221D] border border-[#10221D]/30 px-2.5 py-0.5 rounded-lg text-xs font-black uppercase">
                Active Tier
              </span>
            </div>

            <div className="p-4 bg-[#FAF8F0] rounded-2xl border border-[#10221D]/20 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-serif-headline text-xl font-black text-[#10221D]">PrepPilot Pro Plan</h4>
                  <p className="text-xs text-[#10221D]/70 font-medium">Complete candidate interview acceleration suite</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    Complimentary Pro Access
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#10221D]/10 space-y-2 text-xs font-medium text-[#10221D]/80">
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Unlimited AI Mock Interviews with Real-time Speech Transcription</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Deep Behavioral & Technical Answer Evaluation (STAR format)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Automated ATS Resume Parsing & Keyword Match Optimization</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Interactive Coding Sandbox with Multi-Language Execution</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION: PRIVACY & SECURITY ================= */}
        {(activeSection === 'privacy' || activeSection === 'all') && (
          <div className="bg-[#FDFBF3] border-2 border-[#10221D] rounded-2xl p-5 sm:p-6 editorial-shadow-sm space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#10221D]/10">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-[#F47721]" />
                <h3 className="font-serif-headline text-lg font-black text-[#10221D]">
                  Privacy, Audio Security & Governance
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                Enterprise Encrypted
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-[#FAF8F0] rounded-xl border border-[#10221D]/15 space-y-1">
                <div className="flex items-center space-x-2 text-[#10221D] font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Audio & Speech Processing Confidentiality</span>
                </div>
                <p className="text-[#10221D]/70 font-medium leading-relaxed pl-6">
                  Vocal answers and camera feeds during mock interviews are processed transiently in memory for evaluation. Your audio is never used to train public machine learning models.
                </p>
              </div>

              <div className="p-3.5 bg-[#FAF8F0] rounded-xl border border-[#10221D]/15 space-y-1">
                <div className="flex items-center space-x-2 text-[#10221D] font-bold">
                  <FileText className="w-4 h-4 text-[#F47721]" />
                  <span>Resume Data Isolation</span>
                </div>
                <p className="text-[#10221D]/70 font-medium leading-relaxed pl-6">
                  Uploaded PDF/DOCX files remain private to your account and are analyzed strictly for interview customization and skill matching.
                </p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ----------------- COLUMN 3: RIGHT SIDEBAR (col-span-3) ----------------- */}
      <aside className="lg:col-span-3 space-y-6 lg:sticky lg:top-6 self-start">

            {/* 1. PROFILE COMPLETION CARD */}
            <div className="bg-[#FDFBF3] border-2 border-[#10221D] rounded-2xl p-5 editorial-shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-[#F47721]" />
                  <h3 className="font-serif-headline text-base font-black text-[#10221D]">
                    Profile Completion
                  </h3>
                </div>
                <span className="text-xs font-black text-[#10221D] bg-[#FFC400] px-2 py-0.5 rounded-lg border border-[#10221D]">
                  {completionPercentage}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-[#FAF8F0] rounded-full border border-[#10221D]/20 overflow-hidden p-0.5">
                <div
                  className="h-full bg-[#10221D] rounded-full transition-all duration-700"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              {/* Checklist */}
              <div className="space-y-2 pt-1 text-xs font-medium">
                {completionItems.map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <span className={item.completed ? 'text-emerald-700 font-bold' : 'text-[#10221D]/30'}>
                      {item.completed ? '✓' : '○'}
                    </span>
                    <span className={item.completed ? 'text-[#10221D] font-bold' : 'text-[#10221D]/60'}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. RESUME & DOCUMENTS CARD */}
            <div className="bg-[#FDFBF3] border-2 border-[#10221D] rounded-2xl p-5 editorial-shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#10221D]/10">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-[#F47721]" />
                  <h3 className="font-serif-headline text-base font-black text-[#10221D]">
                    Active Resume
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/resumes')}
                  className="text-xs font-bold text-[#F47721] hover:underline"
                >
                  Manage →
                </button>
              </div>

              {loadingResumes ? (
                <div className="py-6 text-center text-xs text-[#10221D]/60">Loading resume info...</div>
              ) : activeResume ? (
                <div className="space-y-3">
                  <div className="p-3 bg-[#FAF8F0] rounded-xl border border-[#10221D]/15 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-[#F47721]">Document</span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                        Active Profile
                      </span>
                    </div>
                    <p className="font-bold text-xs text-[#10221D] truncate" title={activeResume.fileName}>
                      {activeResume.fileName}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-[#10221D]/60 pt-1 border-t border-[#10221D]/10">
                      <span>ATS Compatibility:</span>
                      <strong className="text-[#10221D] font-black">
                        {activeResume.parsedData?.atsScore || 85}/100
                      </strong>
                    </div>
                  </div>

                  {/* Detected Role notice */}
                  <div className="p-3 bg-[#FAF8F0] rounded-xl border border-[#10221D]/15 text-[11px] space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#10221D]/60">
                      Resume Inferred Role:
                    </span>
                    <p className="font-bold text-[#10221D]">
                      {activeResume.parsedData?.targetRole || 'Not detected'}
                    </p>
                    <p className="text-[10px] text-[#10221D]/60 font-medium">
                      Kept separate from your customized career goal.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/resumes')}
                    className="w-full py-2 bg-[#10221D] hover:bg-[#1A332E] text-[#FAF8F0] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <span>Open Resume Studio</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#FFC400]" />
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-[#FAF8F0] rounded-xl border border-[#10221D]/15 text-center space-y-2">
                  <FileText className="w-6 h-6 text-[#10221D]/40 mx-auto" />
                  <p className="text-xs font-bold text-[#10221D]">No Resume Uploaded</p>
                  <p className="text-[11px] text-[#10221D]/60">
                    Upload your resume to calculate your ATS score and unlock automatic skill suggestions.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/resumes')}
                    className="px-3 py-1.5 bg-[#FFC400] text-[#10221D] rounded-xl text-xs font-black border border-[#10221D] cursor-pointer"
                  >
                    Upload Resume
                  </button>
                </div>
              )}
            </div>

            {/* 3. SUBSCRIPTION & MEMBERSHIP */}
            <div className="bg-[#FAF8F0] border-2 border-[#10221D] rounded-2xl p-5 editorial-shadow-sm space-y-3">
              <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[#10221D]">
                <CreditCard className="w-4 h-4 text-[#F47721]" />
                <span>PrepPilot Membership</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#10221D]/15 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-[#10221D]">PrepPilot Pro</span>
                  <span className="bg-[#FFC400] text-[#10221D] px-2 py-0.5 rounded text-[10px] font-black uppercase">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-[#10221D]/70 font-medium">
                  Unlimited AI mock interview sessions, ATS resume parsing, and campus placement drives.
                </p>
              </div>
            </div>

          </aside>

        </div>

      </div>

      {/* ================= MODAL: DELETE ACCOUNT CONFIRMATION ================= */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#FDFBF3] border-3 border-rose-700 rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-800">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-serif-headline text-xl font-black text-rose-950">
                Confirm Account Deletion
              </h3>
            </div>

            <p className="text-xs text-[#10221D]/80 font-medium leading-relaxed">
              Are you sure you want to permanently delete your PrepPilot account? All resume records, application milestones, and mock interview transcripts will be deleted.
            </p>

            {deleteError && (
              <div className="p-2.5 bg-rose-100 border border-rose-300 rounded-xl text-rose-900 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[#10221D]/70 mb-1">
                Enter your password to confirm
              </label>
              <input
                type="password"
                placeholder="Your current password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-white text-xs font-bold text-[#10221D] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#10221D]/10">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteError('');
                  setDeletePassword('');
                }}
                className="px-4 py-2 rounded-xl border border-[#10221D]/20 text-xs font-bold text-[#10221D] hover:bg-[#FAF8F0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || !deletePassword}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {deletingAccount ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
