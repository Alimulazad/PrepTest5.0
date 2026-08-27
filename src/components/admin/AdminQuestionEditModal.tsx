import React, { useState, useRef } from 'react';
import { X, Save, AlertCircle, Sparkles, Check, Image as ImageIcon, UploadCloud, Trash2, Link as LinkIcon } from 'lucide-react';
import { Question, QuestionSubject } from '../../types';
import { SUBJECTS_DATA, CHAPTERS_DATA } from '../../data/admissionData';
import { COMPREHENSIVE_CHAPTERS_DATA } from '../../data/subjectTopicsData';
import { CascadingTaxonomyPicker } from './CascadingTaxonomyPicker';
import MathText from '../MathText';

interface AdminQuestionEditModalProps {
  question: Partial<Question> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    questionData: Partial<Question>,
    files?: { questionImageFile?: File | null; explanationImageFile?: File | null }
  ) => Promise<void>;
  isNew?: boolean;
}

export const AdminQuestionEditModal: React.FC<AdminQuestionEditModalProps> = ({
  question,
  isOpen,
  onClose,
  onSave,
  isNew = false,
}) => {
  if (!isOpen || !question) return null;

  const [formData, setFormData] = useState<Partial<Question>>({ ...question });
  const [tagsString, setTagsString] = useState<string>(
    Array.isArray(question.tags) ? question.tags.join(', ') : 'DU Ka 24-25, Varsity A'
  );
  
  // Image states
  const [questionImageFile, setQuestionImageFile] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<string>(question.question_image_url || '');
  const [explanationImageFile, setExplanationImageFile] = useState<File | null>(null);
  const [explanationImagePreview, setExplanationImagePreview] = useState<string>(question.explanation_image_url || '');

  const qFileInputRef = useRef<HTMLInputElement>(null);
  const expFileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isCustomTopicMode, setIsCustomTopicMode] = useState<boolean>(false);

  const availableChapters = CHAPTERS_DATA.filter((ch) => ch.subject_id === formData.subject_id);

  // Compute subtopics for selected chapter
  const currentChapterData = COMPREHENSIVE_CHAPTERS_DATA.find(
    (ch) => ch.id === formData.chapter_id || ch.subject_id === formData.subject_id
  );
  const availableSubtopics = currentChapterData?.subtopics || [];

  const handleSubjectChange = (subjectId: QuestionSubject) => {
    const subObj = SUBJECTS_DATA.find((s) => s.id === subjectId);
    const firstChap = CHAPTERS_DATA.find((ch) => ch.subject_id === subjectId);
    setFormData({
      ...formData,
      subject_id: subjectId,
      subject_name: subObj ? subObj.name : '',
      paper: subObj ? (subObj.paper.includes('১ম') ? '1st' : '2nd') : '1st',
      chapter_id: firstChap ? firstChap.id : '',
      chapter_name: firstChap ? firstChap.name : '',
    });
  };

  const handleChapterChange = (chapterId: string) => {
    const chapObj = CHAPTERS_DATA.find((c) => c.id === chapterId);
    setFormData({
      ...formData,
      chapter_id: chapterId,
      chapter_name: chapObj ? chapObj.name : '',
    });
  };

  const handleQuestionImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setQuestionImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setQuestionImagePreview(previewUrl);
      setFormData((prev) => ({ ...prev, question_image_url: undefined }));
    }
  };

  const handleRemoveQuestionImage = () => {
    setQuestionImageFile(null);
    setQuestionImagePreview('');
    setFormData((prev) => ({ ...prev, question_image_url: '' }));
    if (qFileInputRef.current) qFileInputRef.current.value = '';
  };

  const handleExplanationImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setExplanationImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setExplanationImagePreview(previewUrl);
      setFormData((prev) => ({ ...prev, explanation_image_url: undefined }));
    }
  };

  const handleRemoveExplanationImage = () => {
    setExplanationImageFile(null);
    setExplanationImagePreview('');
    setFormData((prev) => ({ ...prev, explanation_image_url: '' }));
    if (expFileInputRef.current) expFileInputRef.current.value = '';
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const finalData: Partial<Question> = {
        ...formData,
        tags: tagsString
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        question_image_url: questionImageFile ? undefined : formData.question_image_url,
        explanation_image_url: explanationImageFile ? undefined : formData.explanation_image_url,
      };

      await onSave(finalData, {
        questionImageFile,
        explanationImageFile,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'প্রশ্ন সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              {isNew ? 'নতুন প্রশ্ন সংযোজন' : 'প্রশ্ন সম্পাদনা'}
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {isNew ? 'লাইভ ডেটাবেজে নতুন প্রশ্ন তৈরি করুন' : 'বিদ্যমান প্রশ্ন সংশোধন করুন'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cascading Taxonomy Picker (Subject → Paper → Chapter → Topic) */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-slate-800/40 border border-indigo-100 dark:border-slate-700/60">
            <CascadingTaxonomyPicker
              value={{
                subject_id: formData.subject_id,
                paper: (formData.paper as any) || (formData.subject_id?.endsWith('_2') ? '2nd' : '1st'),
                chapter_id: formData.chapter_id,
                topic_id: formData.topic_id,
                topic_name: formData.topic_name,
              }}
              onChange={(val) => {
                setFormData((prev) => ({
                  ...prev,
                  subject_id: (val.subject_id as QuestionSubject) || prev.subject_id,
                  paper: val.paper || (val.subject_id?.endsWith('_2') ? '2nd' : '1st'),
                  chapter_id: val.chapter_id || prev.chapter_id,
                  topic_id: val.topic_id,
                  topic_name: val.topic_name,
                }));
              }}
              layout="grid"
              showTopic={true}
              allowCreateTopic={true}
              required={true}
            />
          </div>

          {/* Question Text */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                প্রশ্ন টেক্সট (বাংলা, LaTeX ও TikZ ডায়াগ্রাম)
              </label>
              {/* Quick TikZ Inserters */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-400 font-medium">TikZ যোগ করুন:</span>
                <button
                  type="button"
                  onClick={() => {
                    const sampleTikz = `\n\\begin{tikzpicture}[scale=1.2]\n  \\draw[->, thick, blue] (0,0) -- (2,0) node[right] {\\( \\vec{A} \\)};\n  \\draw[->, thick, red] (2,0) -- (1,1.5) node[above] {\\( \\vec{B} \\)};\n  \\draw[->, thick, emerald] (1,1.5) -- (0,0) node[left] {\\( \\vec{C} \\)};\n\\end{tikzpicture}\n`;
                    setFormData({ ...formData, question_text: (formData.question_text || '') + sampleTikz });
                  }}
                  className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium border border-indigo-200 cursor-pointer"
                  title="ভেক্টর ত্রিভুজ ডায়াগ্রাম কোড যুক্ত করুন"
                >
                  + ভেক্টর ত্রিভুজ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sampleAxis = `\n\\begin{tikzpicture}[scale=1.0]\n  \\draw[->, thick] (-0.5,0) -- (3,0) node[right] {\\( x \\)};\n  \\draw[->, thick] (0,-0.5) -- (0,3) node[above] {\\( y \\)};\n  \\draw[blue, thick] (0,0) -- (2,2) node[above right] {\\( \\vec{v} \\)};\n\\end{tikzpicture}\n`;
                    setFormData({ ...formData, question_text: (formData.question_text || '') + sampleAxis });
                  }}
                  className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium border border-emerald-200 cursor-pointer"
                  title="অক্ষরেখা ডায়াগ্রাম কোড যুক্ত করুন"
                >
                  + স্থানাঙ্ক অক্ষ
                </button>
              </div>
            </div>
            <textarea
              value={formData.question_text || ''}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              rows={3}
              required
              placeholder="প্রশ্ন এখানে লিখুন..."
              className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
            />
            {formData.question_text && (
              <div className="mt-1.5 p-2.5 bg-slate-50 rounded-lg text-xs text-slate-800 border border-slate-200">
                <span className="text-slate-400 font-semibold block mb-0.5">লাইভ প্রিভিউ (LaTeX ও TikZ):</span>
                <MathText text={formData.question_text} />
              </div>
            )}
          </div>

          {/* Question Image Attachment (Cloudinary Upload) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>প্রশ্নের ছবি (Question Image - Cloudinary)</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">ঐচ্ছিক (Optional)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {/* File upload input */}
              <div>
                <input
                  ref={qFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleQuestionImageSelect}
                  className="hidden"
                  id="question-image-file-input"
                />
                <button
                  type="button"
                  onClick={() => qFileInputRef.current?.click()}
                  className="w-full py-2 px-3 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50 rounded-xl text-xs font-semibold text-indigo-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{questionImageFile ? questionImageFile.name : 'কম্পিউটার থেকে ছবি আপলোড করুন'}</span>
                </button>
              </div>

              {/* Direct image URL input */}
              <div className="relative">
                <input
                  type="url"
                  value={formData.question_image_url || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, question_image_url: e.target.value });
                    setQuestionImagePreview(e.target.value);
                    setQuestionImageFile(null);
                  }}
                  placeholder="বা ছবির সরাসরি URL পেস্ট করুন..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
                />
                <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Question Image Preview */}
            {questionImagePreview && (
              <div className="relative inline-block mt-2 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                <img
                  src={questionImagePreview}
                  alt="Question Attachment"
                  className="max-h-40 max-w-xs object-contain p-1"
                />
                <button
                  type="button"
                  onClick={handleRemoveQuestionImage}
                  className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-xs transition-colors cursor-pointer"
                  title="ছবি মুছুন"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['A', 'B', 'C', 'D'] as const).map((opt) => (
              <div key={opt} className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                  <span>অপশন ({opt === 'A' ? 'ক' : opt === 'B' ? 'খ' : opt === 'C' ? 'গ' : 'ঘ'})</span>
                  {formData.correct_ans === opt && (
                    <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> সঠিক উত্তর
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.options?.[opt] || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      options: { ...formData.options, [opt]: e.target.value } as any,
                    })
                  }
                  required
                  placeholder={`অপশন ${opt}`}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            ))}
          </div>

          {/* Correct Answer & Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">সঠিক উত্তর</label>
              <select
                value={formData.correct_ans || 'A'}
                onChange={(e) => setFormData({ ...formData, correct_ans: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="A">অপশন A (ক)</option>
                <option value="B">অপশন B (খ)</option>
                <option value="C">অপশন C (গ)</option>
                <option value="D">অপশন D (ঘ)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">ক্যাটাগরি</label>
              <select
                value={formData.category || 'varsity_a'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="varsity_a">ভার্সিটি 'ক' (Varsity A)</option>
                <option value="engineering">ইঞ্জিনিয়ারিং (BUET / CKET)</option>
                <option value="medical">মেডিকেল (Medical)</option>
                <option value="academic">এইচএসসি (HSC)</option>
                <option value="main_book">মেইন বুক স্ট্যান্ডার্ড</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">স্টার রেটিং</label>
              <select
                value={formData.star_rating || 3}
                onChange={(e) => setFormData({ ...formData, star_rating: parseInt(e.target.value, 10) as 1 | 2 | 3 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value={3}>⭐⭐⭐ ৩ স্টার</option>
                <option value={2}>⭐⭐ ২ স্টার</option>
                <option value={1}>⭐ ১ স্টার</option>
              </select>
            </div>
          </div>

          {/* Explanation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                ব্যাখ্যা ও শর্টকাট টেকনিক (বাংলা, LaTeX ও TikZ)
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const sampleTikz = `\n\\begin{tikzpicture}[scale=1.0]\n  \\draw[->, thick, blue] (0,0) -- (2,0) node[right] {\\( \\vec{F} \\)};\n  \\draw[dashed, gray] (0,0) -- (0,2);\n  \\draw[->, thick, red] (0,0) -- (1.4,1.4) node[above right] {\\( \\vec{R} \\)};\n\\end{tikzpicture}\n`;
                    setFormData({ ...formData, explanation: (formData.explanation || '') + sampleTikz });
                  }}
                  className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium border border-emerald-200 cursor-pointer"
                  title="ব্যাখ্যায় ভেক্টর লব্ধি ডায়াগ্রাম যুক্ত করুন"
                >
                  + বলের লব্ধি ডায়াগ্রাম
                </button>
              </div>
            </div>
            <textarea
              value={formData.explanation || ''}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              rows={3}
              placeholder="প্রশ্নের বিস্তারিত সমাধান..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
            />
            {formData.explanation && (
              <div className="mt-1.5 p-2.5 bg-slate-50 rounded-lg text-xs text-slate-800 border border-slate-200">
                <span className="text-slate-400 font-semibold block mb-0.5">ব্যাখ্যার লাইভ প্রিভিউ:</span>
                <MathText text={formData.explanation} />
              </div>
            )}
          </div>

          {/* Explanation Image Attachment (Cloudinary Upload) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>ব্যাখ্যার ছবি / চিত্র (Explanation Image - Cloudinary)</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">ঐচ্ছিক (Optional)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {/* File upload input */}
              <div>
                <input
                  ref={expFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleExplanationImageSelect}
                  className="hidden"
                  id="explanation-image-file-input"
                />
                <button
                  type="button"
                  onClick={() => expFileInputRef.current?.click()}
                  className="w-full py-2 px-3 border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50 rounded-xl text-xs font-semibold text-emerald-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{explanationImageFile ? explanationImageFile.name : 'ব্যাখ্যার ছবি আপলোড করুন'}</span>
                </button>
              </div>

              {/* Direct image URL input */}
              <div className="relative">
                <input
                  type="url"
                  value={formData.explanation_image_url || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, explanation_image_url: e.target.value });
                    setExplanationImagePreview(e.target.value);
                    setExplanationImageFile(null);
                  }}
                  placeholder="বা ব্যাখ্যার ছবির URL পেস্ট করুন..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                />
                <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Explanation Image Preview */}
            {explanationImagePreview && (
              <div className="relative inline-block mt-2 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                <img
                  src={explanationImagePreview}
                  alt="Explanation Attachment"
                  className="max-h-40 max-w-xs object-contain p-1"
                />
                <button
                  type="button"
                  onClick={handleRemoveExplanationImage}
                  className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-xs transition-colors cursor-pointer"
                  title="ছবি মুছুন"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">ট্যাগসমূহ (কমা দিয়ে আলাদা করুন)</label>
            <input
              type="text"
              value={tagsString}
              onChange={(e) => setTagsString(e.target.value)}
              placeholder="DU Ka 24-25, BUET 22-23"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'সংরক্ষণ ও আপলোড হচ্ছে...' : isNew ? 'প্রশ্ন সংরক্ষণ করুন' : 'আপডেট করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

