import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Brain,
  Code2,
  Users,
  FileText,
  Lock,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Building2,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import {
  getCurrentPlacementDrive,
  startPlacementDrive,
  startAptitudeTest,
  startTechnicalRound,
  syncTechnicalRound,
  startGDRound,
  startResumeRound,
  syncResumeRound,
  getPlacementFinalReport,
  updatePlacementDriveRole
} from '../api/placementApi';
import AptitudeTestView from '../components/placement/AptitudeTestView';
import GDSimulationView from '../components/placement/GDSimulationView';
import PlacementReportView from '../components/placement/PlacementReportView';
import { CompanySelector } from '../components/aptitude/CompanySelector';
import { PYQTestEngine } from '../components/aptitude/PYQTestEngine';
import { PYQResultView } from '../components/aptitude/PYQResultView';
import { AdminPYQModal } from '../components/aptitude/AdminPYQModal';
import { AttemptHistoryModal } from '../components/aptitude/AttemptHistoryModal';
import { startPYQTest } from '../api/aptitudePYQApi';

export const PREDEFINED_ROLES = [
  'Full Stack Engineer',
  'Backend Engineer',
  'Frontend Engineer',
  'DevOps & Cloud Engineer',
  'AI / Machine Learning Engineer',
];

export default function PlacementDrive() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [drive, setDrive] = useState(null);
  const [targetRole, setTargetRole] = useState(() => {
    return localStorage.getItem('preppilot_target_role') || user?.targetRole || 'Full Stack Engineer';
  });

  // Simplified custom role inline state
  const [customInput, setCustomInput] = useState(() => {
    const current = localStorage.getItem('preppilot_target_role') || user?.targetRole || 'Full Stack Engineer';
    return PREDEFINED_ROLES.includes(current) ? '' : current;
  });
  const [isCustomSelected, setIsCustomSelected] = useState(() => {
    const current = localStorage.getItem('preppilot_target_role') || user?.targetRole || 'Full Stack Engineer';
    return !PREDEFINED_ROLES.includes(current);
  });
  const [roleError, setRoleError] = useState('');

  // Sub-views
  const [activeTest, setActiveTest] = useState(null);
  const [activeGD, setActiveGD] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // PYQ Sub-views
  const [pyqView, setPyqView] = useState('none'); // 'none' | 'selector' | 'test' | 'result'
  const [pyqTestConfig, setPyqTestConfig] = useState(null);
  const [pyqTestData, setPyqTestData] = useState(null);
  const [pyqResult, setPyqResult] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [pyqRefreshTrigger, setPyqRefreshTrigger] = useState(0);

  const handleRefreshPYQData = () => {
    setPyqRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    fetchCurrentDrive();
  }, []);

  const fetchCurrentDrive = async () => {
    try {
      setLoading(true);
      const res = await getCurrentPlacementDrive();
      if (res.drive) {
        setDrive(res.drive);
        if (res.drive.targetRole) {
          setTargetRole(res.drive.targetRole);
          localStorage.setItem('preppilot_target_role', res.drive.targetRole);
          const isCustom = !PREDEFINED_ROLES.includes(res.drive.targetRole);
          setIsCustomSelected(isCustom);
          if (isCustom) setCustomInput(res.drive.targetRole);
        }
      }
    } catch (err) {
      console.error('Failed to load placement drive:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (newRole) => {
    const cleanRole = typeof newRole === 'string' ? newRole.trim() : newRole;
    setTargetRole(cleanRole);
    try {
      localStorage.setItem('preppilot_target_role', cleanRole);
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        parsed.targetRole = cleanRole;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
    } catch (e) {}

    try {
      await updatePlacementDriveRole(cleanRole);
      setDrive((prev) => (prev ? { ...prev, targetRole: cleanRole } : prev));
    } catch (err) {
      console.warn('[PlacementDrive] Role update notice:', err);
    }
  };

  const handleDropdownSelect = async (e) => {
    const val = e.target.value;
    setRoleError('');
    if (val === 'CUSTOM') {
      setIsCustomSelected(true);
      if (!customInput && !PREDEFINED_ROLES.includes(targetRole)) {
        setCustomInput(targetRole);
      }
    } else {
      setIsCustomSelected(false);
      setCustomInput('');
      await handleRoleChange(val);
    }
  };

  const handleApplyCustomRole = async (e) => {
    if (e) e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed) {
      setRoleError('Please enter a role title.');
      return;
    }
    if (trimmed.length > 100) {
      setRoleError('Maximum 100 characters allowed.');
      return;
    }
    setRoleError('');
    await handleRoleChange(trimmed);
  };

  const handleCancelCustomRole = () => {
    setRoleError('');
    setIsCustomSelected(false);
    if (!PREDEFINED_ROLES.includes(targetRole)) {
      handleRoleChange(PREDEFINED_ROLES[0]);
    }
  };

  const handleStartFresh = async () => {
    const confirmReset = window.confirm(
      'Are you sure you want to start a new Placement Drive? This will reset your current round progress.'
    );
    if (!confirmReset) return;

    try {
      setActionLoading(true);
      const res = await startPlacementDrive(targetRole);
      setDrive(res.drive);
      setActiveTest(null);
      setActiveGD(null);
      setShowReport(false);
    } catch (err) {
      console.error('Failed to start placement drive:', err);
      alert('Failed to reset drive. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // 1. APTITUDE TEST LAUNCH (Diagnostic)
  const handleStartAptitude = async () => {
    if (!drive) return;
    try {
      setActionLoading(true);
      const testData = await startAptitudeTest(drive._id);
      setActiveTest(testData);
    } catch (err) {
      console.error('Failed to start aptitude test:', err);
      alert(err.response?.data?.message || 'Could not start Aptitude test.');
    } finally {
      setActionLoading(false);
    }
  };

  // 1.1 COMPANY-WISE PYQ ENGINE LAUNCHERS
  const handleLaunchPYQSelector = () => {
    setPyqView('selector');
  };

  const handleStartPYQTest = async (config) => {
    try {
      setActionLoading(true);
      setPyqTestConfig(config);
      const testRes = await startPYQTest(config);
      setPyqTestData(testRes);
      setPyqView('test');
    } catch (err) {
      console.error('Failed to start PYQ test:', err);
      alert(err.response?.data?.message || 'Could not start Company PYQ test.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePYQComplete = (result) => {
    setPyqResult(result);
    setPyqView('result');
    fetchCurrentDrive();
  };

  const handleRetakePYQ = () => {
    if (pyqTestConfig) {
      handleStartPYQTest(pyqTestConfig);
    } else {
      setPyqView('selector');
    }
  };

  // 2. TECHNICAL INTERVIEW LAUNCH & SYNC
  const handleStartTechnical = async () => {
    if (!drive) return;
    try {
      setActionLoading(true);
      const res = await startTechnicalRound(drive._id);
      setDrive(res.drive);
      if (res.sessionId) {
        navigate(`/interview/${res.sessionId}`);
      }
    } catch (err) {
      console.error('Failed to start technical round:', err);
      alert(err.response?.data?.message || 'Could not start Technical Interview.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncTechnical = async () => {
    if (!drive) return;
    try {
      setActionLoading(true);
      const res = await syncTechnicalRound(drive._id);
      setDrive(res.drive);
      alert(res.message);
    } catch (err) {
      console.error('Failed to sync technical round:', err);
      alert(err.response?.data?.message || 'Could not sync Technical round.');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. GROUP DISCUSSION LAUNCH
  const handleStartGD = async () => {
    if (!drive) return;
    try {
      setActionLoading(true);
      const res = await startGDRound(drive._id);
      setDrive(res.drive);
      setActiveGD(res);
    } catch (err) {
      console.error('Failed to start GD round:', err);
      alert(err.response?.data?.message || 'Could not start Group Discussion.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. RESUME-BASED INTERVIEW LAUNCH & SYNC
  const handleStartResume = async () => {
    if (!drive) return;
    try {
      setActionLoading(true);
      const res = await startResumeRound(drive._id);
      setDrive(res.drive);
      if (res.sessionId) {
        navigate(`/interview/${res.sessionId}`);
      }
    } catch (err) {
      console.error('Failed to start resume round:', err);
      alert(err.response?.data?.message || 'Could not start Resume Interview. Ensure you have uploaded a resume.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncResume = async () => {
    if (!drive) return;
    try {
      setActionLoading(true);
      const res = await syncResumeRound(drive._id);
      setDrive(res.drive);
      alert(res.message);
      if (res.passed) {
        setShowReport(true);
      }
    } catch (err) {
      console.error('Failed to sync resume round:', err);
      alert(err.response?.data?.message || 'Could not sync Resume round.');
    } finally {
      setActionLoading(false);
    }
  };

  // FINAL REPORT
  const handleViewFinalReport = async () => {
    if (!drive) return;
    try {
      setActionLoading(true);
      const res = await getPlacementFinalReport(drive._id);
      setDrive(res.drive);
      setShowReport(true);
    } catch (err) {
      console.error('Failed to fetch report:', err);
      alert('Failed to generate final report.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F47721] mb-2.5" />
        <span className="text-xs font-bold text-[#10221D]/70">Loading AI Placement Drive...</span>
      </div>
    );
  }

  // Active Aptitude test screen
  if (activeTest) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AptitudeTestView
          driveId={drive._id}
          testData={activeTest}
          onComplete={(updatedDrive) => {
            setDrive(updatedDrive);
          }}
          onCancel={() => {
            setActiveTest(null);
            fetchCurrentDrive();
          }}
        />
      </div>
    );
  }

  // Active Group Discussion screen
  if (activeGD) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <GDSimulationView
          driveId={drive._id}
          gdData={activeGD}
          onComplete={(updatedDrive) => {
            setDrive(updatedDrive);
          }}
          onCancel={() => {
            setActiveGD(null);
            fetchCurrentDrive();
          }}
        />
      </div>
    );
  }

  // Final Report modal view
  if (showReport) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PlacementReportView
          reportData={drive?.finalReport}
          overallScore={drive?.overallScore}
          drive={drive}
          onClose={() => setShowReport(false)}
        />
      </div>
    );
  }

  // Company-Wise PYQ Selector view
  if (pyqView === 'selector') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <button
          onClick={() => setPyqView('none')}
          className="inline-flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[#10221D] bg-white border border-[#10221D] hover:bg-[#F5F2E6] px-3.5 py-2 rounded-xl transition-all"
        >
          <span>← Back to Placement Arena Overview</span>
        </button>
        <CompanySelector
          user={user}
          onStartTest={handleStartPYQTest}
          onOpenHistory={() => setShowHistoryModal(true)}
          onOpenAdminStudio={() => setShowAdminModal(true)}
          actionLoading={actionLoading}
          refreshTrigger={pyqRefreshTrigger}
        />
        <AdminPYQModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          onRefreshData={handleRefreshPYQData}
        />
        <AttemptHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          onViewResult={(res) => {
            setPyqResult(res);
            setPyqView('result');
            setShowHistoryModal(false);
          }}
        />
      </div>
    );
  }

  // Active PYQ Test Engine view
  if (pyqView === 'test') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PYQTestEngine
          testData={pyqTestData}
          onComplete={handlePYQComplete}
          onExit={() => setPyqView('selector')}
        />
      </div>
    );
  }

  // PYQ Test Result view
  if (pyqView === 'result') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PYQResultView
          result={pyqResult}
          onRetake={handleRetakePYQ}
          onBackToSelector={() => setPyqView('selector')}
        />
        <AttemptHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          onViewResult={(res) => {
            setPyqResult(res);
            setShowHistoryModal(false);
          }}
        />
      </div>
    );
  }

  const rounds = drive?.rounds || {};
  const r1 = rounds.round1_aptitude || {};
  const r2 = rounds.round2_technical || {};
  const r3 = rounds.round3_gd || {};
  const r4 = rounds.round4_resume || {};

  const passedRoundsCount = [r1.passed, r2.passed, r3.passed, r4.passed].filter(Boolean).length;
  const isPredefined = PREDEFINED_ROLES.includes(targetRole);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6 animate-fadeIn">
      {/* ================= 1. SIMPLIFIED COMPACT HEADER ================= */}
      <div className="bg-[#FDFBF3] rounded-2xl border-2 border-[#10221D] editorial-shadow-sm p-4 sm:p-5 space-y-4">
        {/* Top Header Row: Heading + Subtitle + Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#10221D]/10">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-[#F47721] shrink-0" />
              <h1 className="font-serif-headline text-xl sm:text-3xl font-black text-[#10221D]">
                AI Placement Drive
              </h1>
              {drive?.status === 'completed' && (
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0">
                  Drive Completed
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#10221D]/70 font-medium">
              Prepare for all 4 placement rounds.
            </p>
          </div>

          {/* Small Progress Indicator */}
          <div className="flex items-center space-x-2 bg-[#F5F2E6] px-3 py-1.5 rounded-xl border border-[#10221D]/15 self-start sm:self-auto shrink-0">
            <div className="w-2 h-2 rounded-full bg-[#F47721]" />
            <span className="text-xs font-bold text-[#10221D]">
              {passedRoundsCount} of 4 rounds completed
            </span>
            <div className="w-16 bg-[#10221D]/10 rounded-full h-1.5 overflow-hidden ml-1">
              <div
                className="bg-[#F47721] h-full rounded-full transition-all duration-500"
                style={{ width: `${(passedRoundsCount / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Controls Row: Compact Target Role Dropdown & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Target Role Dropdown & Inline Custom Input */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs font-bold text-[#10221D]/70 shrink-0">
              Target Role:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={isCustomSelected ? 'CUSTOM' : targetRole}
                onChange={handleDropdownSelect}
                disabled={actionLoading}
                aria-label="Select Target Engineering Role"
                className="px-3 py-1.5 bg-white border border-[#10221D] rounded-xl text-xs font-bold text-[#10221D] focus:outline-hidden focus:ring-1 focus:ring-[#10221D] cursor-pointer"
              >
                {PREDEFINED_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
                <option value="CUSTOM">Other — enter custom role</option>
              </select>

              {/* Small Inline Custom Text Input */}
              {isCustomSelected && (
                <form onSubmit={handleApplyCustomRole} className="flex flex-wrap items-center gap-1.5">
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => {
                      setCustomInput(e.target.value);
                      if (roleError) setRoleError('');
                    }}
                    placeholder="Enter your target job role"
                    maxLength={100}
                    autoFocus
                    disabled={actionLoading}
                    className="px-2.5 py-1.5 bg-white border border-[#10221D] rounded-xl text-xs font-medium text-[#10221D] placeholder-[#10221D]/40 focus:outline-hidden focus:ring-1 focus:ring-[#10221D] w-full xs:w-44 sm:w-52"
                  />
                  <button
                    type="submit"
                    disabled={actionLoading || !customInput.trim()}
                    title="Apply custom role"
                    className="px-2.5 py-1.5 bg-[#10221D] text-[#FAF8F0] hover:bg-[#1A332E] rounded-xl text-xs font-bold border border-[#10221D] transition-colors disabled:opacity-40 flex items-center space-x-1"
                  >
                    <Check className="w-3 h-3 text-[#FFC400]" />
                    <span>Apply</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelCustomRole}
                    disabled={actionLoading}
                    title="Cancel custom role"
                    className="px-2 py-1.5 bg-white hover:bg-[#F5F2E6] text-[#10221D] rounded-xl text-xs font-medium border border-[#10221D]/30 transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              )}

              {!isCustomSelected && !isPredefined && (
                <span className="text-xs font-medium text-[#10221D]/80 bg-white px-2.5 py-1 rounded-xl border border-[#10221D]/20">
                  Custom: <strong>{targetRole}</strong>
                </span>
              )}
            </div>

            {roleError && (
              <span className="text-[11px] font-bold text-rose-700">
                {roleError}
              </span>
            )}
          </div>

          {/* Actions: Small Reset Drive + View Scorecard if Completed */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={handleStartFresh}
              disabled={actionLoading}
              title="Reset drive and start over"
              className="px-3 py-1.5 bg-white hover:bg-[#F5F2E6] text-[#10221D] rounded-xl text-xs font-bold border border-[#10221D]/30 transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#10221D]/70" />
              <span>Reset Drive</span>
            </button>

            {drive?.status === 'completed' && (
              <button
                onClick={handleViewFinalReport}
                className="px-3 py-1.5 bg-[#F47721] hover:bg-[#e06714] text-white rounded-xl text-xs font-bold border border-[#10221D] transition-colors flex items-center space-x-1.5 shadow-xs"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Scorecard</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= 2. FOUR COMPACT ROUND CARDS (2-COLUMN GRID) ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* ROUND 1: APTITUDE TEST */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col justify-between transition-all ${
            r1.passed
              ? 'bg-emerald-50/60 border-emerald-600 editorial-shadow-sm'
              : 'bg-[#FDFBF3] border-[#10221D] editorial-shadow-sm'
          }`}
        >
          <div className="space-y-3">
            {/* Header: Icon + Round Number + Status Pill */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-300 text-purple-800 flex items-center justify-center font-bold shrink-0">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#F47721]">
                    Round 1
                  </span>
                  <h3 className="font-serif-headline text-lg sm:text-xl font-black text-[#10221D] leading-tight">
                    Aptitude Test
                  </h3>
                </div>
              </div>

              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  r1.passed
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
                    : r1.status === 'in_progress'
                    ? 'bg-[#FFC400]/30 border-[#FFC400] text-[#10221D]'
                    : r1.status === 'failed'
                    ? 'bg-rose-100 border-rose-400 text-rose-800'
                    : 'bg-neutral-100 border-neutral-300 text-neutral-700'
                }`}
              >
                {r1.passed ? 'Cleared' : r1.status?.replace('_', ' ') || 'Available'}
              </span>
            </div>

            {/* Short Description */}
            <p className="text-xs text-[#10221D]/75 leading-relaxed">
              Timed MCQs and company-wise verified PYQs.
            </p>

            {/* Compact Metric Row */}
            <div className="flex items-center justify-between text-xs text-[#10221D]/75 bg-[#F5F2E6] px-3 py-1.5 rounded-xl border border-[#10221D]/10">
              <span>Attempts: <strong>{r1.attempts}/{r1.maxAttempts}</strong></span>
              <span>{r1.score > 0 ? `Score: ${r1.score}%` : `Cutoff: ${r1.passThreshold}%`}</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-3 mt-3 border-t border-[#10221D]/10 space-y-2">
            <button
              onClick={handleLaunchPYQSelector}
              className="w-full bg-[#10221D] hover:bg-[#1A332E] text-[#FAF8F0] py-2 px-3 rounded-xl text-xs font-bold border border-[#10221D] flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-[#FFC400]" />
              <span>Company-Wise PYQ Arena</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#FFC400]" />
            </button>

            <div className="flex items-center justify-between text-[11px] font-bold pt-0.5">
              <button
                onClick={handleStartAptitude}
                disabled={actionLoading || r1.attempts >= r1.maxAttempts}
                className="text-[#10221D]/70 hover:text-[#10221D] hover:underline disabled:opacity-40"
              >
                {r1.passed ? 'Review Diagnostic Test' : 'Diagnostic Test (15 Qs)'}
              </button>

              <button
                onClick={() => setShowHistoryModal(true)}
                className="text-[#F47721] hover:underline"
              >
                Past Attempts
              </button>

              {(user?.role === 'admin' || user?.email?.includes('admin')) && (
                <button
                  onClick={() => setShowAdminModal(true)}
                  className="text-purple-700 hover:underline"
                >
                  Admin Studio
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ROUND 2: TECHNICAL INTERVIEW */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col justify-between transition-all ${
            r2.passed
              ? 'bg-emerald-50/60 border-emerald-600 editorial-shadow-sm'
              : r2.status === 'locked'
              ? 'bg-[#FAF8F0]/80 border-neutral-300 opacity-80'
              : 'bg-[#FDFBF3] border-[#10221D] editorial-shadow-sm'
          }`}
        >
          <div className="space-y-3">
            {/* Header: Icon + Round Number + Status Pill */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-300 text-blue-800 flex items-center justify-center font-bold shrink-0">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#F47721]">
                    Round 2
                  </span>
                  <h3 className="font-serif-headline text-lg sm:text-xl font-black text-[#10221D] leading-tight">
                    Technical Interview
                  </h3>
                </div>
              </div>

              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  r2.passed
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
                    : r2.status === 'locked'
                    ? 'bg-neutral-100 border-neutral-300 text-neutral-600'
                    : 'bg-[#FFC400]/30 border-[#FFC400] text-[#10221D]'
                }`}
              >
                {r2.status === 'locked' ? 'Locked' : r2.passed ? 'Cleared' : 'Available'}
              </span>
            </div>

            {/* Short Description */}
            <p className="text-xs text-[#10221D]/75 leading-relaxed">
              AI-powered technical questions.
            </p>

            {/* Prerequisite or Metrics */}
            {r2.status === 'locked' ? (
              <p className="text-xs font-medium text-amber-800 flex items-center space-x-1.5 bg-amber-50/80 px-3 py-1.5 rounded-xl border border-amber-300/60">
                <Lock className="w-3 h-3 text-amber-700 shrink-0" />
                <span>Pass Round 1 Aptitude Test to unlock.</span>
              </p>
            ) : (
              <div className="flex items-center justify-between text-xs text-[#10221D]/75 bg-[#F5F2E6] px-3 py-1.5 rounded-xl border border-[#10221D]/10">
                <span>Cutoff: <strong>{r2.passThreshold}%</strong></span>
                <span>{r2.score > 0 ? `Evaluated Score: ${r2.score}%` : 'Evaluation: System Architecture'}</span>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="pt-3 mt-3 border-t border-[#10221D]/10">
            {r2.status === 'locked' ? (
              <button
                disabled
                className="w-full bg-neutral-100 text-neutral-400 py-2 rounded-xl text-xs font-bold border border-neutral-300 flex items-center justify-center space-x-1.5 cursor-not-allowed"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Pass Round 1 to Unlock</span>
              </button>
            ) : (
              <div className="space-y-1.5">
                <button
                  onClick={handleStartTechnical}
                  disabled={actionLoading}
                  className="w-full bg-[#10221D] hover:bg-[#1A332E] text-[#FAF8F0] py-2 px-3 rounded-xl text-xs font-bold border border-[#10221D] flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <span>{r2.sessionId ? 'Resume Technical Interview' : 'Start Technical Interview'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#FFC400]" />
                </button>

                {r2.sessionId && !r2.passed && (
                  <button
                    onClick={handleSyncTechnical}
                    disabled={actionLoading}
                    className="w-full text-center text-[11px] font-bold text-[#F47721] hover:underline pt-0.5"
                  >
                    Sync & Verify Session Score
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ROUND 3: GROUP DISCUSSION */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col justify-between transition-all ${
            r3.passed
              ? 'bg-emerald-50/60 border-emerald-600 editorial-shadow-sm'
              : r3.status === 'locked'
              ? 'bg-[#FAF8F0]/80 border-neutral-300 opacity-80'
              : 'bg-[#FDFBF3] border-[#10221D] editorial-shadow-sm'
          }`}
        >
          <div className="space-y-3">
            {/* Header: Icon + Round Number + Status Pill */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#F47721]">
                    Round 3
                  </span>
                  <h3 className="font-serif-headline text-lg sm:text-xl font-black text-[#10221D] leading-tight">
                    Group Discussion
                  </h3>
                </div>
              </div>

              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  r3.passed
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
                    : r3.status === 'locked'
                    ? 'bg-neutral-100 border-neutral-300 text-neutral-600'
                    : 'bg-[#FFC400]/30 border-[#FFC400] text-[#10221D]'
                }`}
              >
                {r3.status === 'locked' ? 'Locked' : r3.passed ? 'Cleared' : 'Available'}
              </span>
            </div>

            {/* Short Description */}
            <p className="text-xs text-[#10221D]/75 leading-relaxed">
              AI-moderated discussion practice.
            </p>

            {/* Prerequisite or Metrics */}
            {r3.status === 'locked' ? (
              <p className="text-xs font-medium text-amber-800 flex items-center space-x-1.5 bg-amber-50/80 px-3 py-1.5 rounded-xl border border-amber-300/60">
                <Lock className="w-3 h-3 text-amber-700 shrink-0" />
                <span>Pass Round 2 Technical Interview to unlock.</span>
              </p>
            ) : (
              <div className="flex items-center justify-between text-xs text-[#10221D]/75 bg-[#F5F2E6] px-3 py-1.5 rounded-xl border border-[#10221D]/10">
                <span>Rubrics: <strong>Clarity & Problem Solving</strong></span>
                <span>{r3.score > 0 ? `Score: ${r3.score}%` : 'Moderator: Active AI Loop'}</span>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="pt-3 mt-3 border-t border-[#10221D]/10">
            {r3.status === 'locked' ? (
              <button
                disabled
                className="w-full bg-neutral-100 text-neutral-400 py-2 rounded-xl text-xs font-bold border border-neutral-300 flex items-center justify-center space-x-1.5 cursor-not-allowed"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Pass Round 2 to Unlock</span>
              </button>
            ) : (
              <button
                onClick={handleStartGD}
                disabled={actionLoading}
                className="w-full bg-[#10221D] hover:bg-[#1A332E] text-[#FAF8F0] py-2 px-3 rounded-xl text-xs font-bold border border-[#10221D] flex items-center justify-center space-x-1.5 transition-colors"
              >
                <span>{r3.passed ? 'Review GD Simulation' : 'Enter GD Simulation'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#FFC400]" />
              </button>
            )}
          </div>
        </div>

        {/* ROUND 4: RESUME-BASED INTERVIEW */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col justify-between transition-all ${
            r4.passed
              ? 'bg-emerald-50/60 border-emerald-600 editorial-shadow-sm'
              : r4.status === 'locked'
              ? 'bg-[#FAF8F0]/80 border-neutral-300 opacity-80'
              : 'bg-[#FDFBF3] border-[#10221D] editorial-shadow-sm'
          }`}
        >
          <div className="space-y-3">
            {/* Header: Icon + Round Number + Status Pill */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center font-bold shrink-0">
                  <FileText className="w-4 h-4 text-[#F47721]" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#F47721]">
                    Round 4
                  </span>
                  <h3 className="font-serif-headline text-lg sm:text-xl font-black text-[#10221D] leading-tight">
                    Resume-Based Interview
                  </h3>
                </div>
              </div>

              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  r4.passed
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
                    : r4.status === 'locked'
                    ? 'bg-neutral-100 border-neutral-300 text-neutral-600'
                    : 'bg-[#FFC400]/30 border-[#FFC400] text-[#10221D]'
                }`}
              >
                {r4.status === 'locked' ? 'Locked' : r4.passed ? 'Cleared' : 'Available'}
              </span>
            </div>

            {/* Short Description */}
            <p className="text-xs text-[#10221D]/75 leading-relaxed">
              Questions based on your resume and projects.
            </p>

            {/* Prerequisite or Metrics */}
            {r4.status === 'locked' ? (
              <p className="text-xs font-medium text-amber-800 flex items-center space-x-1.5 bg-amber-50/80 px-3 py-1.5 rounded-xl border border-amber-300/60">
                <Lock className="w-3 h-3 text-amber-700 shrink-0" />
                <span>Pass Round 3 Group Discussion to unlock.</span>
              </p>
            ) : (
              <div className="flex items-center justify-between text-xs text-[#10221D]/75 bg-[#F5F2E6] px-3 py-1.5 rounded-xl border border-[#10221D]/10">
                <span>Focus: <strong>Projects & Architecture</strong></span>
                <span>{r4.score > 0 ? `Final Score: ${r4.score}%` : `Cutoff: ${r4.passThreshold}%`}</span>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="pt-3 mt-3 border-t border-[#10221D]/10">
            {r4.status === 'locked' ? (
              <button
                disabled
                className="w-full bg-neutral-100 text-neutral-400 py-2 rounded-xl text-xs font-bold border border-neutral-300 flex items-center justify-center space-x-1.5 cursor-not-allowed"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Pass Round 3 to Unlock</span>
              </button>
            ) : (
              <div className="space-y-1.5">
                <button
                  onClick={handleStartResume}
                  disabled={actionLoading}
                  className="w-full bg-[#10221D] hover:bg-[#1A332E] text-[#FAF8F0] py-2 px-3 rounded-xl text-xs font-bold border border-[#10221D] flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <span>{r4.sessionId ? 'Resume Final Interview' : 'Start Resume Interview'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#FFC400]" />
                </button>

                {r4.sessionId && !r4.passed && (
                  <button
                    onClick={handleSyncResume}
                    disabled={actionLoading}
                    className="w-full text-center text-[11px] font-bold text-[#F47721] hover:underline pt-0.5"
                  >
                    Sync & Finalize Report
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= 3. FINAL COMPACT REPORT BANNER IF COMPLETED ================= */}
      {drive?.status === 'completed' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#10221D] text-[#FAF8F0] border-2 border-[#10221D] editorial-shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase text-[#FFC400] tracking-wider">
              Assessment Complete
            </span>
            <h3 className="font-serif-headline text-xl sm:text-2xl font-black">
              Placement Performance Scorecard Ready
            </h3>
            <p className="text-xs text-[#FAF8F0]/75">
              Review your 4-round scores, AI breakdown, and hiring readiness index.
            </p>
          </div>

          <button
            onClick={handleViewFinalReport}
            className="bg-[#F47721] hover:bg-[#e06714] text-white px-5 py-2.5 rounded-xl text-xs font-bold border border-white/20 shrink-0 flex items-center space-x-2 transition-transform hover:scale-105"
          >
            <Trophy className="w-4 h-4" />
            <span>Open Scorecard</span>
          </button>
        </div>
      )}

      {/* Admin Import & Manage Modal */}
      <AdminPYQModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onRefreshData={handleRefreshPYQData}
      />

      {/* Student Attempt History Modal */}
      <AttemptHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onViewResult={(res) => {
          setPyqResult(res);
          setPyqView('result');
          setShowHistoryModal(false);
        }}
      />
    </div>
  );
}
