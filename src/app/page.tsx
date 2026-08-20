"use client";

import React, { useState, useEffect } from "react";
import {
  FolderPlus,
  Layers,
  Plus,
  Trash2,
  Edit2,
  Search,
  ExternalLink,
  Tag,
  Image as ImageIcon,
  Video as VideoIcon,
  BookOpen,
  CheckCircle2,
  X,
  FileText,
  Lock,
  LogIn,
  LogOut,
  ShieldCheck
} from "lucide-react";
import { Presentation, Slide } from "@/types/schema";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Check if session exists in localStorage
    const authSession = localStorage.getItem("admin_authenticated");
    if (authSession === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      if (!supabase) {
        setLoginError("Database connection not available.");
        setIsLoggingIn(false);
        return;
      }

      const inputVal = emailInput.trim();
      const passVal = passwordInput.trim();

      // Check admin_auth table in Supabase (columns: id, created_at, email, password)
      const { data, error } = await supabase
        .from("admin_auth")
        .select("*")
        .eq("email", inputVal)
        .eq("password", passVal);

      if (error) {
        console.error("Supabase admin_auth error:", error);
        setLoginError(`Database Error: ${error.message}`);
      } else if (data && data.length > 0) {
        localStorage.setItem("admin_authenticated", "true");
        setIsAuthenticated(true);
        showToast("Welcome to School Admin Portal!");
      } else {
        setLoginError("Invalid username/email or password.");
      }
    } catch (err: any) {
      console.error("Login catch error:", err);
      setLoginError("Failed to authenticate. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    setIsAuthenticated(false);
    showToast("Logged out successfully.");
  };

  const [activeTab, setActiveTab] = useState<"presentations" | "slides">("presentations");
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Presentation Form Modal State
  const [isPresModalOpen, setIsPresModalOpen] = useState(false);
  const [editingPresId, setEditingPresId] = useState<number | null>(null);
  const [presFormData, setPresFormData] = useState({
    topic_name: "",
    topic_category: "",
    link: "",
    topic_id: "",
    tagsInput: ""
  });

  // Slide Form Modal State
  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<number | null>(null);
  const [slideFormData, setSlideFormData] = useState({
    topic_id: "",
    slide_no: "1",
    image: "",
    video: ""
  });

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch from Supabase if configured
  useEffect(() => {
    async function fetchData() {
      if (!supabase) return;
      try {
        const { data: presData, error: presErr } = await supabase.from("presentation").select("*");
        if (!presErr && presData) {
          setPresentations(presData);
          if (presData.length > 0 && !selectedTopicId) {
            setSelectedTopicId(presData[0].topic_id);
          }
        }

        const { data: slideData, error: slideErr } = await supabase.from("slides").select("*");
        if (!slideErr && slideData) {
          setSlides(slideData);
        }
      } catch (e) {
        console.log("Supabase fetch error, fallback to local state:", e);
      }
    }
    fetchData();
  }, []);

  // Filtered Presentations
  const categories = ["All", ...Array.from(new Set(presentations.map((p) => p.topic_category)))];
  
  const filteredPresentations = presentations.filter((p) => {
    const matchesSearch =
      p.topic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.topic_id.toString().includes(searchQuery) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || p.topic_category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Slides for current active selected topic_id
  const activeSlides = slides
    .filter((s) => s.topic_id === selectedTopicId)
    .sort((a, b) => a.slide_no - b.slide_no);

  // --- Handlers for Presentation ---
  const handleOpenPresModal = (pres?: Presentation) => {
    if (pres) {
      setEditingPresId(pres.topic_id || null);
      setPresFormData({
        topic_name: pres.topic_name,
        topic_category: pres.topic_category,
        link: pres.link,
        topic_id: pres.topic_id.toString(),
        tagsInput: pres.tags ? pres.tags.join(", ") : ""
      });
    } else {
      setEditingPresId(null);
      // Calculate next auto-increment topic_id (max numeric topic_id + 1)
      const maxTopicId = presentations.reduce((max, p) => {
        const idNum = Number(p.topic_id);
        return !isNaN(idNum) && idNum > max ? idNum : max;
      }, 1000); // Defaults to starting from 1001 if no presentation exists or max is lower than 1000

      const nextTopicId = (maxTopicId + 1).toString();

      setPresFormData({
        topic_name: "",
        topic_category: "Foundational",
        link: "",
        topic_id: nextTopicId,
        tagsInput: ""
      });
    }
    setIsPresModalOpen(true);
  };

  const handleSavePresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    const topicIdNum = parseInt(presFormData.topic_id) || Math.floor(Math.random() * 900) + 100;
    const tagsArray = presFormData.tagsInput
      ? presFormData.tagsInput.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const newPresItem: Presentation = {
      topic_name: presFormData.topic_name,
      topic_category: presFormData.topic_category,
      link: presFormData.link,
      topic_id: topicIdNum,
      tags: tagsArray,
      created_at: new Date().toISOString()
    };

    if (supabase) {
      if (editingPresId) {
        const { error } = await supabase
          .from("presentation")
          .update(newPresItem)
          .eq("topic_id", editingPresId);

        if (error) {
          console.error("Supabase update error:", error);
          alert(`Failed to update presentation in Database: ${error.message}`);
          return;
        }
      } else {
        const { error } = await supabase.from("presentation").insert([newPresItem]);
        if (error) {
          console.error("Supabase insert error:", error);
          alert(`Failed to create presentation in Database: ${error.message}`);
          return;
        }
      }
    }

    if (editingPresId) {
      setPresentations((prev) =>
        prev.map((p) => (p.topic_id === editingPresId ? { ...p, ...newPresItem } : p))
      );
      showToast("Presentation updated!");
    } else {
      const createdItem = { ...newPresItem, id: Date.now() };
      setPresentations((prev) => [createdItem, ...prev]);
      setSelectedTopicId(topicIdNum);
      showToast("New Presentation created!");
    }

    setIsPresModalOpen(false);
  };

  const handleDeletePresentation = async (topic_id: number) => {
    if (!confirm(`Are you sure you want to delete presentation (topic_id: #${topic_id}) and its slides?`)) return;

    if (supabase) {
      const { error: presErr } = await supabase.from("presentation").delete().eq("topic_id", topic_id);
      const { error: slideErr } = await supabase.from("slides").delete().eq("topic_id", topic_id);

      if (presErr || slideErr) {
        const errMsg = presErr?.message || slideErr?.message;
        console.error("Supabase delete error:", presErr || slideErr);
        alert(`Failed to delete presentation from Database: ${errMsg}`);
        return;
      }
    }

    setPresentations((prev) => prev.filter((p) => p.topic_id !== topic_id));
    setSlides((prev) => prev.filter((s) => s.topic_id !== topic_id));
    if (selectedTopicId === topic_id) {
      const remaining = presentations.filter((p) => p.topic_id !== topic_id);
      setSelectedTopicId(remaining.length > 0 ? remaining[0].topic_id : null);
    }
    showToast("Presentation deleted.");
  };

  // --- Handlers for Slides ---
  const handleOpenSlideModal = (slide?: Slide) => {
    if (!selectedTopicId) {
      alert("Please select or create a presentation first!");
      return;
    }

    if (slide) {
      setEditingSlideId(slide.id || null);
      setSlideFormData({
        topic_id: slide.topic_id.toString(),
        slide_no: slide.slide_no.toString(),
        image: slide.image,
        video: slide.video
      });
    } else {
      setEditingSlideId(null);
      const nextSlideNo = activeSlides.length > 0 ? Math.max(...activeSlides.map(s => s.slide_no)) + 1 : 1;
      setSlideFormData({
        topic_id: selectedTopicId.toString(),
        slide_no: nextSlideNo.toString(),
        image: "",
        video: ""
      });
    }
    setIsSlideModalOpen(true);
  };

  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId) return;

    const newSlideItem: Slide = {
      topic_id: selectedTopicId,
      slide_no: parseInt(slideFormData.slide_no) || 1,
      image: slideFormData.image,
      video: slideFormData.video,
      created_at: new Date().toISOString()
    };

    if (supabase) {
      if (editingSlideId) {
        const { error } = await supabase.from("slides").update(newSlideItem).eq("id", editingSlideId);
        if (error) {
          console.error("Supabase slide update error:", error);
          alert(`Failed to update slide in Database: ${error.message}`);
          return;
        }
      } else {
        const { error } = await supabase.from("slides").insert([newSlideItem]);
        if (error) {
          console.error("Supabase slide insert error:", error);
          alert(`Failed to add slide in Database: ${error.message}`);
          return;
        }
      }
    }

    if (editingSlideId) {
      setSlides((prev) =>
        prev.map((s) => (s.id === editingSlideId ? { ...s, ...newSlideItem } : s))
      );
      showToast("Slide updated!");
    } else {
      const createdSlide = { ...newSlideItem, id: Date.now() };
      setSlides((prev) => [...prev, createdSlide]);
      showToast(`Slide #${newSlideItem.slide_no} added!`);
    }

    setIsSlideModalOpen(false);
  };

  const handleDeleteSlide = async (id: number) => {
    if (!confirm("Are you sure you want to delete this slide?")) return;

    if (supabase) {
      const { error } = await supabase.from("slides").delete().eq("id", id);
      if (error) {
        console.error("Supabase slide delete error:", error);
        alert(`Failed to delete slide from Database: ${error.message}`);
        return;
      }
    }

    setSlides((prev) => prev.filter((s) => s.id !== id));
    showToast("Slide removed.");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Background decorative elements */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-medium text-sm">{toastMessage}</span>
          </div>
        )}

        {/* Login Box */}
        <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-8 shadow-2xl relative z-10 text-white">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20 border border-white/10">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">School Admin Portal</h1>
            <p className="text-sm text-slate-400 mt-1">Sign in to manage presentations and slides</p>
          </div>

          {loginError && (
            <div className="mb-5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
              <X className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email / Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="admin@school.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 text-slate-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 text-slate-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition placeholder:text-slate-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm py-2.5 rounded-xl transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoggingIn ? "Signing in..." : "Sign In"}</span>
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-700/60 text-center">
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Protected Content Management System</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Clean Light Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold text-base text-slate-900 leading-none">School Admin Portal</h1>
              <p className="text-xs text-slate-500 mt-1">Presentation & Slide Content Manager</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleOpenPresModal()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Presentation</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg transition border border-slate-200"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Navigation Bar & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Simple Tab Pills */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl w-fit border border-slate-200">
            <button
              onClick={() => setActiveTab("presentations")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === "presentations"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FolderPlus className="w-4 h-4" />
              <span>Presentations ({presentations.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("slides")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === "slides"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Slides Builder ({slides.length})</span>
            </button>
          </div>

          {/* Search & Category Filter */}
          {activeTab === "presentations" && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search title, ID, tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-sm text-slate-800 pl-9 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white border border-slate-300 text-sm text-slate-700 px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 transition"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "All" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* TAB 1: PRESENTATIONS CATALOG */}
        {activeTab === "presentations" && (
          <div>
            {filteredPresentations.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm">
                <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-base font-semibold text-slate-800">No Presentations Found</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">Create a presentation to start linking slides.</p>
                <button
                  onClick={() => handleOpenPresModal()}
                  className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-3.5 py-2 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Presentation</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPresentations.map((pres) => {
                  const slideCount = slides.filter((s) => s.topic_id === pres.topic_id).length;
                  const isSelected = selectedTopicId === pres.topic_id;

                  return (
                    <div
                      key={pres.id || pres.topic_id}
                      className={`bg-white border rounded-xl p-5 transition flex flex-col justify-between shadow-sm hover:shadow-md ${
                        isSelected ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200"
                      }`}
                    >
                      <div>
                        {/* Header Badge */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                            {pres.topic_category}
                          </span>
                          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            topic_id: #{pres.topic_id}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-semibold text-base text-slate-900 mb-1.5">
                          {pres.topic_name}
                        </h3>

                        {/* Link */}
                        {pres.link && (
                          <a
                            href={pres.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-3 truncate max-w-full"
                          >
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{pres.link}</span>
                          </a>
                        )}

                        {/* Tags */}
                        {pres.tags && pres.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {pres.tags.map((tag, idx) => (
                              <span key={idx} className="flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                <Tag className="w-2.5 h-2.5 text-slate-400" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          onClick={() => {
                            setSelectedTopicId(pres.topic_id);
                            setActiveTab("slides");
                          }}
                          className="flex items-center gap-1 text-blue-600 font-medium hover:bg-blue-50 px-2.5 py-1 rounded transition"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>View Slides ({slideCount})</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenPresModal(pres)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePresentation(pres.topic_id)}
                            className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SLIDES BUILDER */}
        {activeTab === "slides" && (
          <div className="space-y-5">
            {/* Topic selector banner */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500 uppercase">Topic:</span>
                <select
                  value={selectedTopicId || ""}
                  onChange={(e) => setSelectedTopicId(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-300 text-slate-800 font-medium text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  {presentations.map((p) => (
                    <option key={p.topic_id} value={p.topic_id}>
                      {p.topic_name} (ID: #{p.topic_id})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => handleOpenSlideModal()}
                disabled={!selectedTopicId}
                className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium px-3.5 py-2 rounded-lg shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Slide</span>
              </button>
            </div>

            {/* Slides List Grid */}
            {activeSlides.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm">
                <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-base font-semibold text-slate-800">No Slides for Topic #{selectedTopicId}</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">Click below to attach slide image or video link.</p>
                <button
                  onClick={() => handleOpenSlideModal()}
                  className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-3.5 py-2 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Slide</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeSlides.map((slide) => (
                  <div
                    key={slide.id || slide.slide_no}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between"
                  >
                    {/* Media Thumbnail */}
                    <div className="relative h-44 bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-200">
                      {slide.image ? (
                        <img
                          src={slide.image}
                          alt={`Slide ${slide.slide_no}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <ImageIcon className="w-8 h-8" />
                          <span className="text-xs">No Image</span>
                        </div>
                      )}

                      <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-xs text-slate-800 border border-slate-200 text-xs font-semibold px-2 py-0.5 rounded shadow-xs">
                        Slide #{slide.slide_no}
                      </div>

                      {slide.video && (
                        <div className="absolute top-2.5 right-2.5 bg-red-50 text-red-600 border border-red-200 text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1 shadow-xs">
                          <VideoIcon className="w-3 h-3" />
                          <span>Video</span>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-4 space-y-2">
                      <div>
                        <span className="text-[11px] font-medium text-slate-400 uppercase">Image URL</span>
                        <p className="text-xs font-mono text-slate-600 truncate bg-slate-50 px-2 py-1 rounded border border-slate-200">
                          {slide.image || "—"}
                        </p>
                      </div>

                      {slide.video && (
                        <div>
                          <span className="text-[11px] font-medium text-slate-400 uppercase">Video URL</span>
                          <a
                            href={slide.video}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-blue-600 hover:underline truncate block bg-slate-50 px-2 py-1 rounded border border-slate-200"
                          >
                            {slide.video}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-mono">topic_id: {slide.topic_id}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenSlideModal(slide)}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSlide(slide.id!)}
                          className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- MODAL 1: Presentation Modal --- */}
      {isPresModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-base text-slate-900">
                {editingPresId ? "Edit Presentation" : "New Presentation"}
              </h2>
              <button
                onClick={() => setIsPresModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePresentation} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Topic Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Solar System & Planets"
                  value={presFormData.topic_name}
                  onChange={(e) => setPresFormData({ ...presFormData, topic_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={presFormData.topic_category}
                    onChange={(e) => setPresFormData({ ...presFormData, topic_category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Foundational">Foundational</option>
                    <option value="Preparatory">Preparatory</option>
                    <option value="Middle">Middle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Topic ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="101"
                    value={presFormData.topic_id}
                    onChange={(e) => setPresFormData({ ...presFormData, topic_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={presFormData.link}
                  onChange={(e) => setPresFormData({ ...presFormData, link: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="Astronomy, Grade 6"
                  value={presFormData.tagsInput}
                  onChange={(e) => setPresFormData({ ...presFormData, tagsInput: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPresModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Slide Modal --- */}
      {isSlideModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-base text-slate-900">
                {editingSlideId ? "Edit Slide" : `Add Slide (Topic #${selectedTopicId})`}
              </h2>
              <button
                onClick={() => setIsSlideModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlide} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Slide No <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={slideFormData.slide_no}
                    onChange={(e) => setSlideFormData({ ...slideFormData, slide_no: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Topic ID
                  </label>
                  <input
                    type="text"
                    disabled
                    value={slideFormData.topic_id}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={slideFormData.image}
                  onChange={(e) => setSlideFormData({ ...slideFormData, image: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Video URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/..."
                  value={slideFormData.video}
                  onChange={(e) => setSlideFormData({ ...slideFormData, video: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Preview */}
              {slideFormData.image && (
                <div>
                  <span className="block text-xs font-medium text-slate-500 mb-1">Preview</span>
                  <div className="h-32 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                    <img src={slideFormData.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSlideModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                >
                  Save Slide
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
