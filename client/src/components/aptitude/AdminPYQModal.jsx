import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  ShieldCheck,
  Trash2,
  Edit3,
  Layers,
  Copy,
  Download,
  Building2,
  FileText
} from 'lucide-react';
import {
  importPYQQuestions,
  getAdminPYQQuestions,
  verifyPYQQuestion,
  deletePYQQuestion,
} from '../../api/aptitudePYQApi';

export const AdminPYQModal = ({ isOpen, onClose, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'manage'
  const [jsonInput, setJsonInput] = useState('');
  const [autoVerify, setAutoVerify] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importReport, setImportReport] = useState(null);

  // Management tab states
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && activeTab === 'manage') {
      fetchAdminQuestions();
    }
  }, [isOpen, activeTab, filterCompany, filterStatus]);

  const fetchAdminQuestions = async () => {
    try {
      setLoadingQuestions(true);
      const res = await getAdminPYQQuestions({
        company: filterCompany,
        verificationStatus: filterStatus,
        search: searchQuery,
      });
      setQuestions(res.questions || []);
    } catch (err) {
      console.error('Failed to fetch admin questions:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleLoadAuthorizedTemplate = () => {
    const template = [
      {
        company: "TCS",
        examName: "TCS NQT",
        examYear: 2024,
        topic: "Quantitative Aptitude",
        subtopic: "Time and Work",
        difficulty: "Medium",
        questionText: "A and B can complete a work together in 12 days. If A works twice as fast as B, in how many days can B alone finish the entire work?",
        options: ["18 days", "24 days", "36 days", "48 days"],
        correctAnswer: "36 days",
        explanation: "Let B's rate be x, A's rate = 2x. Together 3x = 1/12 => x = 1/36. Hence B alone takes 36 days.",
        sourceTitle: "TCS NQT Official Model Assessment Paper",
        sourceUrl: "https://www.tcs.com/careers/india/tcs-national-qualifier-test",
        sourceType: "official_sample",
        verificationStatus: "verified"
      },
      {
        company: "Infosys",
        examName: "Infosys INFYTQ",
        examYear: 2024,
        topic: "Quantitative Aptitude",
        subtopic: "Percentages & Profit",
        difficulty: "Medium",
        questionText: "A vendor sells a software license at a 20% discount on the marked price and still secures a 25% profit. If the cost price is $800, what is the marked price?",
        options: ["$1000", "$1200", "$1250", "$1300"],
        correctAnswer: "$1250",
        explanation: "Selling Price = 800 * 1.25 = $1000. Marked Price = 1000 / 0.80 = $1250.",
        sourceTitle: "Infosys Campus Recruitment Mathematical Ability Sample",
        sourceUrl: "https://www.infosys.com/careers/entry-level-jobs.html",
        sourceType: "official_sample",
        verificationStatus: "verified"
      },
      {
        company: "Accenture",
        examName: "Accenture Cognitive Assessment",
        examYear: 2024,
        topic: "Quantitative Aptitude",
        subtopic: "Speed & Distance",
        difficulty: "Medium",
        questionText: "A data packet travels from Server A to Server B at 60 MB/s and returns along the same route at 40 MB/s. What is the average transmission speed for the complete round-trip?",
        options: ["48 MB/s", "50 MB/s", "52 MB/s", "54 MB/s"],
        correctAnswer: "48 MB/s",
        explanation: "Average speed = 2xy / (x + y) = (2 * 60 * 40) / 100 = 48 MB/s.",
        sourceTitle: "Accenture Cognitive Assessment Aptitude Paper",
        sourceUrl: "https://www.accenture.com/in-en/careers/life-at-accenture/entry-level",
        sourceType: "official_sample",
        verificationStatus: "verified"
      }
    ];

    setJsonInput(JSON.stringify(template, null, 2));
  };

  const handleDownloadTemplate = (format = 'json') => {
    let content = '';
    let fileName = '';
    let mimeType = '';

    if (format === 'json') {
      const template = [
        {
          company: "TCS",
          examName: "TCS NQT (National Qualifier Test)",
          examYear: 2024,
          topic: "Quantitative Aptitude",
          subtopic: "Time and Work",
          difficulty: "Medium",
          questionText: "A and B can complete a work together in 12 days. If A works twice as fast as B, in how many days can B alone finish the entire work?",
          options: ["18 days", "24 days", "36 days", "48 days"],
          correctAnswer: "36 days",
          explanation: "Let B's daily work rate be x. Since A is twice as fast, A's rate = 2x. Together, 3x = 1/12 => x = 1/36. Therefore, B alone takes 36 days.",
          sourceReference: "https://www.tcs.com/careers/india/tcs-national-qualifier-test",
          sourceType: "official_sample",
          verificationStatus: "verified"
        },
        {
          company: "Infosys",
          examName: "Infosys INFYTQ & Campus Qualifier",
          examYear: 2024,
          topic: "Quantitative Aptitude",
          subtopic: "Percentages & Profit",
          difficulty: "Medium",
          questionText: "A vendor sells a software license at a 20% discount on the marked price and still secures a 25% profit. If the cost price is $800, what is the marked price?",
          options: ["$1000", "$1200", "$1250", "$1300"],
          correctAnswer: "$1250",
          explanation: "Selling Price = 800 * 1.25 = $1000. Marked Price = 1000 / 0.80 = $1250.",
          sourceReference: "https://www.infosys.com/careers/entry-level-jobs.html",
          sourceType: "official_sample",
          verificationStatus: "verified"
        }
      ];
      content = JSON.stringify(template, null, 2);
      fileName = 'authorized_pyq_template.json';
      mimeType = 'application/json';
    } else {
      content = `company,exam_name,exam_year,topic,subtopic,difficulty,question_text,options,correct_answer,explanation,source_reference,source_type,verification_status
TCS,TCS NQT (National Qualifier Test),2024,Quantitative Aptitude,Time and Work,Medium,"A and B can complete a work together in 12 days. If A works twice as fast as B, in how many days can B alone finish the entire work?","18 days | 24 days | 36 days | 48 days",36 days,"Let B's rate be x, A's rate = 2x. Together 3x = 1/12 => x = 1/36. Hence B alone takes 36 days.",https://www.tcs.com/careers/india/tcs-national-qualifier-test,official_sample,verified
Infosys,Infosys INFYTQ & Campus Qualifier,2024,Quantitative Aptitude,Percentages & Profit,Medium,"A vendor sells a software license at a 20% discount on the marked price and still secures a 25% profit. If the cost price is $800, what is the marked price?","$1000 | $1200 | $1250 | $1300",$1250,"Selling Price = 800 * 1.25 = $1000. Marked Price = 1000 / 0.80 = $1250.",https://www.infosys.com/careers/entry-level-jobs.html,official_sample,verified
Accenture,Accenture Cognitive Assessment,2024,Quantitative Aptitude,Speed & Distance,Medium,"A data packet travels from Server A to Server B at 60 MB/s and returns along the same route at 40 MB/s. What is the average transmission speed for the complete round-trip?","48 MB/s | 50 MB/s | 52 MB/s | 54 MB/s",48 MB/s,"Average speed = 2xy / (x + y) = (2 * 60 * 40) / 100 = 48 MB/s.",https://www.accenture.com/in-en/careers/life-at-accenture/entry-level,official_sample,verified`;
      fileName = 'authorized_pyq_template.csv';
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (typeof content === 'string') {
          if (file.name.endsWith('.json')) {
            const parsed = JSON.parse(content);
            setJsonInput(JSON.stringify(parsed, null, 2));
          } else {
            parseCSVContent(content);
          }
        }
      } catch (err) {
        alert('Failed to parse file. Please verify valid JSON or CSV syntax.');
      }
    };
    reader.readAsText(file);
  };

  // Robust RFC-4180 CSV parser handling commas inside quotes, escaped quotes ("") and multiline text
  const parseCSVContent = (csvText) => {
    if (!csvText || typeof csvText !== 'string') return;

    const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      const nextChar = normalized[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n' && !insideQuotes) {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
    }

    if (rows.length < 2) {
      alert('CSV must contain a header row and at least one data row.');
      return;
    }

    const rawHeaders = rows[0].map((h) => h.replace(/^["']|["']$/g, '').trim());
    const parsedObjects = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const obj = {};
      rawHeaders.forEach((header, idx) => {
        obj[header] = row[idx] !== undefined ? row[idx] : '';
      });

      // Parse options if pipe-separated or comma-separated
      if (typeof obj.options === 'string') {
        if (obj.options.includes('|') || obj.options.includes(';')) {
          obj.options = obj.options.split(/[|;]/).map((o) => o.trim()).filter(Boolean);
        } else if (obj.options.includes(',')) {
          obj.options = obj.options.split(',').map((o) => o.trim()).filter(Boolean);
        } else if (obj.options.startsWith('[') && obj.options.endsWith(']')) {
          try {
            obj.options = JSON.parse(obj.options);
          } catch {}
        }
      }

      parsedObjects.push(obj);
    }

    setJsonInput(JSON.stringify(parsedObjects, null, 2));
  };

  const handleExecuteImport = async () => {
    if (!jsonInput.trim()) {
      alert('Please enter or upload valid JSON/CSV question data.');
      return;
    }

    let parsedQuestions = [];
    try {
      parsedQuestions = JSON.parse(jsonInput);
      if (!Array.isArray(parsedQuestions)) {
        alert('Root JSON structure must be an array of question objects.');
        return;
      }
    } catch {
      alert('Invalid JSON syntax. Please check formatting before submitting.');
      return;
    }

    setIsProcessing(true);
    setImportReport(null);

    try {
      const res = await importPYQQuestions({
        questions: parsedQuestions,
        autoVerify,
      });

      setImportReport(res.report);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Import error:', err);
      alert(err.response?.data?.message || 'Question import failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyQuestion = async (id) => {
    try {
      await verifyPYQQuestion(id);
      setQuestions((prev) =>
        prev.map((q) => (q._id === id ? { ...q, verificationStatus: 'verified' } : q))
      );
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert('Failed to verify question.');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to archive this question from student tests?')) return;
    try {
      await deletePYQQuestion(id);
      setQuestions((prev) => prev.filter((q) => q._id !== id));
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert('Failed to archive question.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-[#FDFBF3] rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-6 border-b-2 border-[#0F1E1B]/15 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="w-10 h-10 rounded-xl bg-[#0F1E1B] text-[#F5D90A] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-serif-headline text-2xl font-black text-[#0F1E1B]">
                Admin PYQ Management Studio
              </h3>
              <p className="text-xs text-[#0F1E1B]/70">
                Authorized Import, Duplicate Detection, Verification & Question Repository
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#0F1E1B]/70 hover:text-[#C1440E] rounded-xl hover:bg-[#F5F2E6] border border-transparent hover:border-[#0F1E1B]/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b-2 border-[#0F1E1B]/15 px-6 bg-[#F5F2E6]">
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'import'
                ? 'border-[#C1440E] text-[#C1440E]'
                : 'border-transparent text-[#0F1E1B]/70 hover:text-[#0F1E1B]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import & Validate Questions</span>
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'manage'
                ? 'border-[#C1440E] text-[#C1440E]'
                : 'border-transparent text-[#0F1E1B]/70 hover:text-[#0F1E1B]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Repository & Verification</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'import' ? (
            /* TAB 1: IMPORT */
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="bg-white hover:bg-[#F5F2E6] text-[#0F1E1B] px-3.5 py-1.5 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] cursor-pointer flex items-center space-x-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#C1440E]" />
                    <span>Upload CSV / JSON File</span>
                    <input
                      type="file"
                      accept=".json,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={handleLoadAuthorizedTemplate}
                    className="bg-white hover:bg-[#F5F2E6] text-[#0F1E1B] px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] flex items-center space-x-1"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#F5D90A]" />
                    <span>Load 10 Auth PYQs</span>
                  </button>

                  <button
                    onClick={() => handleDownloadTemplate('csv')}
                    className="bg-white hover:bg-[#F5F2E6] text-[#0F1E1B] px-3 py-1.5 rounded-xl text-xs font-bold border border-[#0F1E1B]/30 flex items-center space-x-1"
                    title="Download template CSV with standard headers"
                  >
                    <Download className="w-3.5 h-3.5 text-[#0F1E1B]/70" />
                    <span>Template (.CSV)</span>
                  </button>

                  <button
                    onClick={() => handleDownloadTemplate('json')}
                    className="bg-white hover:bg-[#F5F2E6] text-[#0F1E1B] px-3 py-1.5 rounded-xl text-xs font-bold border border-[#0F1E1B]/30 flex items-center space-x-1"
                    title="Download template JSON structure"
                  >
                    <Download className="w-3.5 h-3.5 text-[#0F1E1B]/70" />
                    <span>Template (.JSON)</span>
                  </button>
                </div>

                <label className="flex items-center space-x-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoVerify}
                    onChange={(e) => setAutoVerify(e.target.checked)}
                    className="w-4 h-4 rounded text-[#C1440E] accent-[#C1440E]"
                  />
                  <span>Mark as Verified upon import</span>
                </label>
              </div>

              {/* JSON Editor Box */}
              <div>
                <label className="text-xs font-bold text-[#0F1E1B]/70 uppercase block mb-1">
                  Question Dataset JSON (Validated Schema):
                </label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`[\n  {\n    "company": "TCS",\n    "examName": "TCS NQT",\n    "examYear": 2024,\n    "topic": "Quantitative Aptitude",\n    "subtopic": "Time and Work",\n    "difficulty": "Medium",\n    "questionText": "A and B can finish a project in...",\n    "options": ["10 days", "12 days", "15 days", "20 days"],\n    "correctAnswer": "12 days",\n    "explanation": "...",\n    "sourceTitle": "Official Qualifier Paper",\n    "sourceUrl": "https://..."\n  }\n]`}
                  rows={10}
                  className="w-full font-mono text-xs p-3.5 rounded-2xl border-2 border-[#0F1E1B] bg-white focus:outline-hidden"
                />
              </div>

              {/* Commit Button */}
              <button
                onClick={handleExecuteImport}
                disabled={isProcessing || !jsonInput.trim()}
                className="w-full bg-[#C1440E] hover:bg-[#A3370B] text-white py-3 rounded-2xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm transition-all disabled:opacity-40"
              >
                {isProcessing ? 'Validating & Importing...' : 'Validate & Import into Database'}
              </button>

              {/* Import Results Summary */}
              {importReport && (
                <div className="p-5 rounded-2xl border-2 border-[#0F1E1B] bg-white space-y-3">
                  <h4 className="font-serif-headline text-lg font-black text-[#0F1E1B] flex items-center space-x-2">
                    <FileCheck2 className="w-5 h-5 text-emerald-600" />
                    <span>Import Execution Summary</span>
                  </h4>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300">
                      <div className="text-2xl font-black text-emerald-950">
                        {importReport.importedCount}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-800 uppercase">
                        Imported Successfully
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300">
                      <div className="text-2xl font-black text-amber-950">
                        {importReport.duplicateCount}
                      </div>
                      <div className="text-[10px] font-bold text-amber-800 uppercase">
                        Duplicates Skipped
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-300">
                      <div className="text-2xl font-black text-rose-950">
                        {importReport.failedCount}
                      </div>
                      <div className="text-[10px] font-bold text-rose-800 uppercase">
                        Validation Errors
                      </div>
                    </div>
                  </div>

                  {/* Duplicate / Error notes */}
                  {importReport.duplicates?.length > 0 && (
                    <div className="mt-3 text-xs text-amber-900 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200">
                      <span className="font-bold">Duplicate Detection: </span>
                      {importReport.duplicates.length} question(s) already exist in database with identical content hash and were skipped.
                    </div>
                  )}

                  {importReport.errors?.length > 0 && (
                    <div className="mt-3 text-xs text-rose-900 bg-rose-50/50 p-2.5 rounded-lg border border-rose-200 space-y-1">
                      <span className="font-bold">Validation Failures:</span>
                      {importReport.errors.map((err, idx) => (
                        <div key={idx}>
                          Row {err.index + 1}: {err.reasons.join(', ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: REPOSITORY & VERIFICATION */
            <div className="space-y-4">
              {/* Filter toolbar */}
              <div className="flex flex-wrap items-center gap-3 bg-[#F5F2E6] p-3 rounded-xl border border-[#0F1E1B]/15">
                <select
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#0F1E1B] text-xs font-bold bg-white"
                >
                  <option value="all">All Companies</option>
                  <option value="TCS">TCS</option>
                  <option value="Infosys">Infosys</option>
                  <option value="Accenture">Accenture</option>
                  <option value="Capgemini">Capgemini</option>
                  <option value="Cognizant">Cognizant</option>
                  <option value="Wipro">Wipro</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#0F1E1B] text-xs font-bold bg-white"
                >
                  <option value="all">All Verification Statuses</option>
                  <option value="verified">Verified Only</option>
                  <option value="unverified">Unverified Only</option>
                  <option value="archived">Archived</option>
                </select>

                <button
                  onClick={fetchAdminQuestions}
                  className="bg-[#0F1E1B] text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                >
                  Refresh
                </button>
              </div>

              {/* Questions list */}
              {loadingQuestions ? (
                <div className="text-center py-8 text-xs font-bold text-[#0F1E1B]/60">
                  Loading repository...
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-8 text-xs font-bold text-[#0F1E1B]/60 bg-white p-6 rounded-2xl border">
                  No questions match your current filters. Use the "Import & Validate" tab to seed authorized questions.
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q) => (
                    <div
                      key={q._id}
                      className="p-4 rounded-xl border-2 border-[#0F1E1B]/20 bg-white space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs bg-[#0F1E1B] text-white px-2 py-0.5 rounded">
                            {q.company}
                          </span>
                          <span className="text-xs font-bold text-[#C1440E]">
                            {q.examName} ({q.examYear})
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 font-semibold">
                            {q.topic}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              q.verificationStatus === 'verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {q.verificationStatus}
                          </span>

                          {q.verificationStatus !== 'verified' && (
                            <button
                              onClick={() => handleVerifyQuestion(q._id)}
                              className="text-[10px] font-bold bg-emerald-700 text-white px-2 py-1 rounded hover:bg-emerald-800"
                            >
                              Verify
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteQuestion(q._id)}
                            className="p-1 text-rose-600 hover:text-rose-800"
                            title="Archive question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="font-bold text-xs text-[#0F1E1B]">{q.questionText}</p>
                      <div className="text-[11px] text-[#0F1E1B]/70">
                        Options: [{q.options?.join(', ')}] • Correct:{' '}
                        <b className="text-emerald-700">{q.correctAnswer}</b>
                      </div>
                      {q.sourceTitle && (
                        <div className="text-[10px] text-[#0F1E1B]/50">
                          Source: {q.sourceTitle}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPYQModal;
