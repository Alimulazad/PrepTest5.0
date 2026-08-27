import { WrittenQuestion } from '../types';

export const INITIAL_WRITTEN_QUESTIONS: WrittenQuestion[] = [
  // Physics 2nd Paper (পদার্থবিজ্ঞান ২য় পত্র) - Chapter 1: তাপগতিবিদ্যা (phy2_ch1 / p2c1)
  {
    id: 'wq_phy2_ch1_1',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s2',
    topic_name: 'এনট্রপি',
    question_number: 1,
    question_text: 'চার্জের মানদ্বয় সমান হলে একটি তড়িৎ নিরপেক্ষ পানির অণুর ধনাত্মক ও ঋণাত্মক আধানের মধ্যবর্তী দূরত্ব 3.9 পিকোমিটার। পানির অণুর দ্বিপোল ভ্রামক কত?',
    explanation: `প্রদত্ত দূরত্ব $d = 3.9\\text{ পিকোমিটার} = 3.9 \\times 10^{-12}\\text{ মিটার}$।
আমরা জানি, প্রতিটি ইলেকট্রন বা প্রোটনের আধানের পরম মান $q \\approx 1.6 \\times 10^{-19}\\text{ C}$।

দ্বিপোল ভ্রামক $p$ হলো আধানের মান $q$ এবং মধ্যবর্তী দূরত্ব $d$-এর গুণফল:
$$p = q \\times d$$

প্রদত্ত মানসমূহ বসিয়ে পাই:
$$p = (1.6 \\times 10^{-19}\\text{ C}) \\times (3.9 \\times 10^{-12}\\text{ m})$$
$$p = (1.6 \\times 3.9) \\times 10^{-31}\\text{ C}\\cdot\\text{m}$$
$$p = 6.24 \\times 10^{-31}\\text{ C}\\cdot\\text{m}$$

পানির অণুর দ্বিপোল ভ্রামক $6.24 \\times 10^{-31}\\text{ C}\\cdot\\text{m}$`,
    explanation_latex: 'p = 6.24 \\times 10^{-31}\\,\\text{C}\\cdot\\text{m}',
    tags: ['KhU B 25-26', 'KhU B Unit 24-25 (Written)'],
    category: 'varsity_a',
    difficulty: 'medium',
    star_rating: 3,
  },
  {
    id: 'wq_phy2_ch1_2',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s2',
    topic_name: 'এনট্রপি',
    question_number: 2,
    question_text: '10°C তাপমাত্রার 5 kg পানিকে 100°C তাপমাত্রায় উন্নীত করতে এনট্রপির পরিবর্তন নির্ণয় কর।\n[পানির আপেক্ষিক তাপ $4.2 \\times 10^3$ J/(kg·K)]',
    explanation: `প্রদত্ত মানগুলো হলো:
ভর, $m = 5\\text{ kg}$
প্রাথমিক তাপমাত্রা, $T_1 = 10^\circ\\text{C} = (10 + 273)\\text{ K} = 283\\text{ K}$
চূড়ান্ত তাপমাত্রা, $T_2 = 100^\circ\\text{C} = (100 + 273)\\text{ K} = 373\\text{ K}$
পানির আপেক্ষিক তাপ, $s = 4.2 \\times 10^3\\text{ J/(kg}\\cdot\\text{K)}$

তাপমাত্রা পরিবর্তনের ক্ষেত্রে এনট্রপির পরিবর্তন ($\\Delta S$) নির্ণয়ের সূত্র হলো:
$$\\Delta S = m s \\ln\\left(\\frac{T_2}{T_1}\\right)$$

মানগুলো বসিয়ে পাই:
$$\\Delta S = 5\\text{ kg} \\times 4200\\text{ J/(kg}\\cdot\\text{K)} \\times \\ln\\left(\\frac{373\\text{ K}}{283\\text{ K}}\\right)$$
$$\\Delta S = 21000\\text{ J/K} \\times \\ln(1.318)$$
$$\\Delta S = 21000\\text{ J/K} \\times 0.276$$
$$\\Delta S = 5796\\text{ J/K}$$

এনট্রপির পরিবর্তন $\\Delta S = 5796\\text{ J/K}$ (প্রায়)`,
    explanation_latex: '\\Delta S = 5796\\,\\text{J/K}',
    tags: ['KhU B Unit 24-25 (Written)'],
    category: 'varsity_a',
    difficulty: 'medium',
    star_rating: 3,
  },
  {
    id: 'wq_phy2_ch1_3',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s1',
    topic_name: 'তাপমাত্রার পরিমাপ ও ফারেনহাইট স্কেল',
    question_number: 3,
    question_text: 'একটি ট্রান্সফরমারের মুখ্যকুন্ডলীর বিভব 10V এবং তড়িৎ প্রবাহ 4A। যদি গৌণ কুন্ডলীর বিভব 20V হয়, তবে এতে তড়িৎ প্রবাহের মান কত?',
    explanation: `মুখ্যকুন্ডলীর বিভব $E_p = 10\\text{ V}$, প্রবাহ $I_p = 4\\text{ A}$।
গৌণ কুন্ডলীর বিভব $E_s = 20\\text{ V}$, প্রবাহ $I_s = ?$

আমরা জানি, আদর্শ ট্রান্সফরমারের জন্য:
$$\\frac{E_p}{E_s} = \\frac{I_s}{I_p}$$
$$\\implies \\frac{10}{20} = \\frac{I_s}{4} \\implies I_s = 2\\text{ A (Ans.)}$$`,
    explanation_latex: 'I_s = 2\\,\\text{A}',
    tags: ['FET 22-23'],
    category: 'engineering',
    difficulty: 'easy',
    star_rating: 2,
  },
  {
    id: 'wq_phy2_ch1_4',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s1',
    topic_name: 'তাপমাত্রার পরিমাপ ও ফারেনহাইট স্কেল',
    question_number: 4,
    question_text: 'একটি বাল্বের গায়ে লেখা 220V – 60W। বাল্বটির রোধ কত?',
    explanation: `দেওয়া আছে:
বিভব পার্থক্য ($V$) = $220\\text{ V}$
ক্ষমতা ($P$) = $60\\text{ W}$
রোধ ($R$) = ?

আমরা জানি,
$$P = \\frac{V^2}{R}$$
$$\\text{বা, } R = \\frac{V^2}{P}$$
$$R = \\frac{(220)^2}{60} = \\frac{48400}{60} \\approx 806.67\\ \\Omega$$

বাল্বটির ফিলামেন্টের রোধ হবে প্রায় $806.67\\ \\Omega$ (ওহম)।`,
    explanation_latex: 'R \\approx 806.67\\,\\Omega',
    tags: ['FET 22-23'],
    category: 'varsity_a',
    difficulty: 'easy',
    star_rating: 2,
  },
  {
    id: 'wq_phy2_ch1_5',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s1',
    topic_name: 'তাপগতিবিদ্যার প্রথম সূত্র',
    question_number: 5,
    question_text: 'ফেরোচৌম্বক পদার্থের hysteresis loop বর্ণনা কর।',
    explanation: `অর্থাত্ এ অবস্থায় চৌম্বক ডোমেইনগুলো আবার আগের অবস্থায় ফিরে থাকতে থাকে। কিন্তু বাহ্যিক চৌম্বকক্ষেত্র $B_0$ শূন্য হয়ে গেলেও পদার্থের চৌম্বকায়ন সম্পূর্ণ নষ্ট হয় না। ফেরোচৌম্বক পদার্থের ডোমেইনগুলো সহজে পরিবর্তন করতে বাধ্য না হওয়ায়, বাহ্যিক ক্ষেত্র $B_0$ এর শূন্য অবস্থায় রেসিড্যুয়াল ম্যাগনেটিজম অবশিষ্ট থাকে।

হিস্টেরেসিস লুপ প্রক্রিয়ায় $B_0$ অক্ষ বরাবর ঋণাত্মক হলে $B$ এর মান হ্রাস পায়। ঋণাত্মক চৌম্বকক্ষেত্র বৃদ্ধির ফলে ডোমেইনগুলোতে বিপরীতমুখী চৌম্বকায়ন ঘটে। পরবর্তীতে $B_0$ ধনাত্মক করার পর চক্রটি পুনরায় পূর্ণ হয়। এই চক্রকেই হিস্টেরেসিস লুপ বলা হয়।`,
    tags: ['JnU A 24-25_SHIFT 1'],
    category: 'varsity_a',
    difficulty: 'medium',
    star_rating: 3,
  },
  {
    id: 'wq_phy2_ch1_6',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s1',
    topic_name: 'তাপগতিবিদ্যার প্রথম সূত্র',
    question_number: 6,
    question_text: "'জগতের তাপীয় মৃত্যু' আলোচনা কর।",
    explanation: `তাপগতিবিদ্যার দ্বিতীয় সূত্র থেকে আমরা জানতে পারি যে, শক্তির রূপান্তরের মাধ্যমে অণুসমূহের বিশৃঙ্খলা বা এনট্রপি বৃদ্ধি পায়। 

যদি এনট্রপি ক্রমাগত বৃদ্ধি পেতে থাকে এবং কোনো ব্যবস্থার তাপমাত্রা সুষম হয়ে যায়, তখন মহাবিশ্বের সকল শক্তির রূপান্তর ক্ষমতা হারিয়ে যাবে। পরিবেশ ও ব্যবস্থার মধ্যে তাপমাত্রার সমতা অর্জিত হওয়ায় কোনো তাপীয় কাজ সম্পন্ন করা সম্ভব হবে না। এই অবস্থাকেই বিজ্ঞানী কেলভিন 'মহাবিশ্বের তাপীয় মৃত্যু' (Heat Death of the Universe) নামে অভিহিত করেছেন।`,
    tags: ['JnU A 24-25_SHIFT 1'],
    category: 'varsity_a',
    difficulty: 'medium',
    star_rating: 3,
  },
  {
    id: 'wq_phy2_ch1_7',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s3',
    topic_name: 'Cp এবং Cv',
    question_number: 7,
    question_text: 'একপরমাণুক একটি গ্যাসের n₁ মোল এবং দ্বিপারমাণুক একটি গ্যাসের n₂ মোলের মিশ্রণে $\\gamma = \\frac{19}{15}$। মিশ্রণে n₁ এবং n₂ এর মধ্যে সম্পর্ক নির্ণয় কর।',
    explanation: `$$C_{p_{\\text{mix}}} = \\frac{n_1 C_{p1} + n_2 C_{p2}}{n_1 + n_2}$$
$$C_{v_{\\text{mix}}} = \\frac{n_1 C_{v1} + n_2 C_{v2}}{n_1 + n_2}$$
$$\\gamma_{\\text{mix}} = \\frac{C_{p_{\\text{mix}}}}{C_{v_{\\text{mix}}}} = \\frac{n_1 C_{p1} + n_2 C_{p2}}{n_1 C_{v1} + n_2 C_{v2}}$$

একপরমাণুক গ্যাসের ক্ষেত্রে $C_{v1} = \\frac{3}{2}R, C_{p1} = \\frac{5}{2}R$।
দ্বিপারমাণুক গ্যাসের ক্ষেত্রে $C_{v2} = \\frac{5}{2}R, C_{p2} = \\frac{7}{2}R$।

$$\\implies \\frac{19}{15} = \\frac{5n_1 + 7n_2}{3n_1 + 5n_2}$$
$$\\implies 57n_1 + 95n_2 = 75n_1 + 105n_2$$
$$\\implies 10n_1 + 14n_2 = 9n_1 + 15n_2$$
$$\\implies n_1 = n_2\\text{ (Ans.)}$$`,
    explanation_latex: 'n_1 = n_2',
    tags: ['DU A 24-25'],
    category: 'varsity_a',
    difficulty: 'hard',
    star_rating: 3,
  },
  {
    id: 'wq_phy2_ch1_8',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s1',
    topic_name: 'তাপগতিবিদ্যার প্রথম সূত্র',
    question_number: 8,
    question_text: 'এনট্রপি কাকে বলে? প্রত্যাবর্তী ও অপ্রত্যাবর্তী প্রক্রিয়ার মধ্যে পার্থক্য লেখ।',
    explanation: `এনট্রপি: কোনো সিস্টেমে শক্তি রূপান্তরের অসমর্থতা বা অপ্রাপ্যতা বা বিশৃঙ্খলার পরিমাপকে এনট্রপি বলে।

প্রত্যাবর্তী ও অপ্রত্যাবর্তী প্রক্রিয়ার পার্থক্য:
| প্রত্যাবর্তী প্রক্রিয়া | অপ্রত্যাবর্তী প্রক্রিয়া |
| :--- | :--- |
| (i) এ প্রক্রিয়া পরিবর্তনের পর বিপরীতমুখী হয়ে প্রত্যাগমন করতে পারে। | (i) এ প্রক্রিয়া পরিবর্তনের পর বিপরীতমুখী হয়ে প্রত্যাগমন করতে পারে না। |
| (ii) এ প্রক্রিয়ায় কার্যনির্বাহী বস্তু প্রাথমিক অবস্থায় ফিরে আসতে পারে। | (ii) এ প্রক্রিয়ায় কার্যনির্বাহী বস্তু প্রাথমিক অবস্থায় ফিরে আসতে পারে না। |
| (iii) এ প্রক্রিয়া অত্যন্ত ধীরগতি সম্পন্ন। | (iii) এ প্রক্রিয়া স্বতঃস্ফূর্ত। |
| (iv) এ প্রক্রিয়ায় সিস্টেমের অপচয়ীয় অপচয় সাম্যাবস্থা বজায় থাকে। | (iv) এ প্রক্রিয়ায় সিস্টেমের অপচয়ীয় সাম্যাবস্থা বজায় থাকে না। |`,
    tags: ['JnU A 24-25 (Shift-2) Written'],
    category: 'varsity_a',
    difficulty: 'medium',
    star_rating: 3,
  },
  {
    id: 'wq_phy2_ch1_9',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch3',
    chapter_name: 'চল তড়িৎ',
    topic_id: 'p2c3_s1',
    topic_name: 'কার্শফের সূত্র',
    question_number: 9,
    question_text: 'নিচে প্রদর্শিত সার্কিটে কার্শফের সূত্র ব্যবহার করে প্রতিটি শাখায় বিদ্যুৎ প্রবাহের মান নির্ণয় কর।',
    question_image_url: 'https://res.cloudinary.com/demo/image/upload/v1680000000/circuit_kirchhoff.png',
    explanation: `কার্শফের ১ম সূত্র প্রয়োগ করে, $I_1 = I_2 + I_3$ ... (i)
১ম লুপে কার্শফের ২য় সূত্র প্রয়োগ করে পাই, $-50 + 2I_1 + 2I_2 = 0$
$$\\implies -25 + I_1 + I_2 = 0$$
$$\\implies -25 + (I_2 + I_3) + I_2 = 0\\ \\text{[(i) হতে]}$$
$$\\implies 2I_2 + I_3 = 25$$ ... (ii)

২য় লুপে কার্শফের ২য় সূত্র প্রয়োগ করে পাই,
$$-20 + 2I_3 - 2I_2 = 0$$
$$\\implies -10 + I_3 - I_2 = 0$$
$$\\implies -I_2 + I_3 = 10$$ ... (iii)

(ii) হতে (iii) বিয়োগ করে পাই, $3I_2 = 15 \\implies I_2 = 5\\text{ A (Ans.)}$
(iii) হতে পাই, $-5 + I_3 = 10 \\implies I_3 = 15\\text{ A (Ans.)}$
$I_1 = I_2 + I_3 = (5 + 15)\\text{ A} = 20\\text{ A (Ans.)}$`,
    explanation_latex: 'I_1 = 20\\,\\text{A},\\; I_2 = 5\\,\\text{A},\\; I_3 = 15\\,\\text{A}',
    tags: ['DU A 24-25'],
    category: 'engineering',
    difficulty: 'hard',
    star_rating: 3,
  },
  {
    id: 'wq_phy2_ch1_10',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s1',
    topic_name: 'তাপগতিবিদ্যার প্রথম সূত্র',
    question_number: 10,
    question_text: '310 nm তরঙ্গদৈর্ঘ্যের আলো একটি ধাতু পৃষ্ঠের উপর আপতিত হতে 0 হতে সর্বোচ্চ $4 \\times 10^{-19}$ J গতিশক্তি সম্পন্ন ইলেকট্রন নির্গত হয়। সূচনা তরঙ্গদৈর্ঘ্য বের কর। [hc = 1240 eV·nm]',
    explanation: `$$E = \\varphi + E_{k_{\\text{max}}}$$
$$\\frac{hc}{\\lambda(\\text{nm})} = \\frac{hc}{\\lambda_0(\\text{nm})} + E_{k_{\\text{max}}}(\\text{eV})$$
$$E_{k_{\\text{max}}} = \\frac{4 \\times 10^{-19}}{1.6 \\times 10^{-19}}\\text{ eV} = 2.5\\text{ eV}$$
$$\\frac{1240\\text{ eV}\\cdot\\text{nm}}{310\\text{ nm}} = 4\\text{ eV}$$
$$4 = \\frac{1240}{\\lambda_0} + 2.5 \\implies \\frac{1240}{\\lambda_0} = 1.5$$
$$\\lambda_0 = \\frac{1240}{1.5} = 826.67\\text{ nm (Ans.)}$$`,
    explanation_latex: '\\lambda_0 = 826.67\\,\\text{nm}',
    tags: ['DU A 24-25'],
    category: 'varsity_a',
    difficulty: 'medium',
    star_rating: 3,
  },
  {
    id: 'wq_phy2_ch1_11',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s1',
    topic_name: 'তাপগতিবিদ্যার প্রথম সূত্র',
    question_number: 11,
    question_text: 'কত বিভব পার্থক্যের মধ্য দিয়ে একটি ইলেকট্রনকে ত্বরান্বিত করলে ইলেকট্রনটির ডি-ব্রগলি তরঙ্গদৈর্ঘ্য 0.4 Å হবে?',
    explanation: `$$\\lambda = \\frac{h}{p} = \\frac{h}{\\sqrt{2m eV}}$$
$$\\implies V = \\frac{h^2}{2m e \\lambda^2}$$
$$\\lambda = 0.4 \\text{ \xc3\x85} = 0.4 \\times 10^{-10}\\text{ m}$$
$$h = 6.63 \\times 10^{-34}\\text{ J}\\cdot\\text{s}, m = 9.1 \\times 10^{-31}\\text{ kg}, e = 1.6 \\times 10^{-19}\\text{ C}$$
$$\\therefore V = 943\\text{ V (Ans.)}$$`,
    explanation_latex: 'V = 943\\,\\text{V}',
    tags: ['FET 21-22'],
    category: 'varsity_a',
    difficulty: 'medium',
    star_rating: 3,
  },
  {
    id: 'wq_phy2_ch1_12',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s1',
    topic_name: 'তাপগতিবিদ্যার প্রথম সূত্র',
    question_number: 12,
    question_text: 'কোন একটি ফোটনের শক্তি 1 eV হলে ঐ ফোটনের তরঙ্গদৈর্ঘ্য কত?',
    explanation: `$$E = 1\\text{ eV} = 1.6 \\times 10^{-19}\\text{ J}$$
$$c = 3 \\times 10^8\\text{ m/s}$$
$$h = 6.626 \\times 10^{-34}\\text{ J}\\cdot\\text{s}$$
$$E = h\\nu = h\\frac{c}{\\lambda}$$
$$\\implies \\lambda = \\frac{hc}{E} = \\frac{6.626 \\times 10^{-34} \\times 3 \\times 10^8}{1.6 \\times 10^{-19}} = 1.242 \\times 10^{-6}\\text{ m} = 1242\\text{ nm (Ans.)}$$`,
    explanation_latex: '\\lambda = 1242\\,\\text{nm}',
    tags: ['FET 21-22'],
    category: 'varsity_a',
    difficulty: 'easy',
    star_rating: 2,
  },
  {
    id: 'wq_phy2_ch1_13',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch2',
    chapter_name: 'স্থির তড়িৎ',
    topic_id: 'p2c2_s1',
    topic_name: 'কুলাম্বের সূত্র ও বিভব',
    question_number: 13,
    question_text: 'কোনো একটি বর্গক্ষেত্রের তিনটি কৌণিক বিন্দুতে যথাক্রমে 8C, C ও -2C চার্জ আছে। চতুর্থ কৌণিক বিন্দুতে কত চার্জ স্থাপন করলে বর্গক্ষেত্রটির কেন্দ্রে বিভব শূন্য হবে?',
    explanation: `ধরি, চতুর্থ কৌণিক বিন্দুতে $q_4$ চার্জ স্থাপন করলে কেন্দ্রে বিভব শূন্য হবে।
বর্গক্ষেত্রের প্রতিটি কৌণিক বিন্দু হতে কেন্দ্রের দূরত্ব সমান ($r$)।

$$V = \\frac{1}{4\\pi\\varepsilon_0} \\left( \\frac{q_1}{r} + \\frac{q_2}{r} + \\frac{q_3}{r} + \\frac{q_4}{r} \\right)$$
$$\\implies 0 = \\frac{1}{4\\pi\\varepsilon_0 r} (q_1 + q_2 + q_3 + q_4)$$
$$\\implies q_1 + q_2 + q_3 + q_4 = 0$$
$$\\implies q_4 = -(q_1 + q_2 + q_3) = -(8 + 6 - 2) = -12\\text{C}$$

চতুর্থ কৌণিক বিন্দুতে $-12\\text{C}$ চার্জ স্থাপন করতে হবে।`,
    explanation_latex: 'q_4 = -12\\,\\text{C}',
    tags: ['JnU A 24-25_SHIFT 3'],
    category: 'engineering',
    difficulty: 'medium',
    star_rating: 3,
  },
  {
    id: 'wq_phy2_ch1_14',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s1',
    topic_name: 'তাপগতিবিদ্যার প্রথম সূত্র',
    question_number: 14,
    question_text: 'রুদ্ধতাপীয় প্রক্রিয়ায় কোনো গ্যাসের আদিচাপ 200 kPa এর আয়তন m³ থেকে 3 m³ এ পরিবর্তিত হলে, এর শেষ চাপ কত হবে? [গ্যাসটি দ্বিপারমাণুক]',
    explanation: `রুদ্ধতাপীয় প্রক্রিয়া, দ্বিপারমাণুক গ্যাসের $\\gamma = 1.4$
$$P_1 V_1^\\gamma = P_2 V_2^\\gamma$$
$$\\implies P_2 = P_1 \\times \\left(\\frac{V_1}{V_2}\\right)^\\gamma = 200 \\times \\left(\\frac{1}{3}\\right)^{1.4}$$
$$\\implies P_2 = 42.97\\text{ kPa (Ans.)}$$`,
    explanation_latex: 'P_2 = 42.97\\,\\text{kPa}',
    tags: ['JnU A 24-25_SHIFT 3'],
    category: 'varsity_a',
    difficulty: 'medium',
    star_rating: 3,
  },
  {
    id: 'wq_phy2_ch1_15',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s1',
    topic_name: 'তাপগতিবিদ্যার প্রথম সূত্র',
    question_number: 15,
    question_text: 'রেডনের অর্ধায়ু 3.8 day হলে, এর ক্ষয় ধ্রুবক নির্ণয় করো',
    explanation: `$$T_{1/2} = 3.8\\text{ days} = 3.8 \\times 86400\\text{ s} = 328320\\text{ s}$$
$$\\lambda = \\frac{0.693}{T_{1/2}} = \\frac{0.693}{328320} = 2.11 \\times 10^{-6}\\text{ s}^{-1}\\text{ (Ans.)}$$`,
    explanation_latex: '\\lambda = 2.11 \\times 10^{-6}\\,\\text{s}^{-1}',
    tags: ['JnU A 19-20'],
    category: 'varsity_a',
    difficulty: 'easy',
    star_rating: 2,
  },
  {
    id: 'wq_phy2_ch1_16',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s1',
    topic_name: 'তাপগতিবিদ্যার প্রথম সূত্র',
    question_number: 16,
    question_text: '0°C তাপমাত্রার 1g বরফকে প্রতি সেকেন্ডে 10J তাপ প্রদান করা হলে কতক্ষণ পর সম্পূর্ণ বরফ বাষ্পীভূত হবে?',
    explanation: `আগে বরফকে গালানোর জন্য প্রয়োজনীয় তাপ $Q_1 = m l_f = (10^{-3}\\text{ kg})(3.36 \\times 10^5) = 336\\text{ J}$।
পানির তাপমাত্রা $0^\circ\\text{C} \\to 100^\circ\\text{C}$ এ নিতে তাপ $Q_2 = m s \\Delta T = 10^{-3} \\times 4200 \\times 100 = 420\\text{ J}$।
পানিকে বাষ্পে পরিণত করতে তাপ $Q_3 = m l_v = 10^{-3} \\times (2.26 \\times 10^6) = 2260\\text{ J}$।

মোট প্রয়োজনীয় তাপ $Q = 336 + 420 + 2260 = 3016\\text{ J}$।
প্রতি সেকেন্ডে তাপ $10\\text{ J/s}$ হলে সময় $t = \\frac{3016}{10} = 301.6\\text{ সেকেন্ড (Ans.)}$।`,
    explanation_latex: 't = 301.6\\,\\text{sec}',
    tags: ['JnU A 19-20'],
    category: 'varsity_a',
    difficulty: 'hard',
    star_rating: 3,
  },
  {
    id: 'wq_phy2_ch1_17',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s1',
    topic_name: 'তাপগতিবিদ্যার প্রথম সূত্র',
    question_number: 17,
    question_text: '40g এর একটি বরফের টুকরোকে 100°C তাপমাত্রার পানিতে রূপান্তরিত করতে কি পরিমাণ তাপের প্রয়োজন হবে?',
    explanation: `$$m = 40\\text{ g} = 0.04\\text{ kg}$$
$$0^\circ\\text{C} \\text{ বরফ থেকে } 0^\circ\\text{C} \\text{ পানি } Q_1 = m l_f = 0.04 \\times 3.36 \\times 10^5 = 1.344 \\times 10^4\\text{ J}$$
$$0^\circ\\text{C} \\text{ পানি থেকে } 100^\circ\\text{C} \\text{ পানি } Q_2 = m s \\Delta T = 0.04 \\times 4.2 \\times 10^3 \\times (100-0) = 1.68 \\times 10^4\\text{ J}$$
$$\\text{মোট তাপ } Q = Q_1 + Q_2 = (1.344 + 1.68) \\times 10^4 = 3.024 \\times 10^4\\text{ J (Ans.)}$$`,
    explanation_latex: 'Q = 3.024 \\times 10^4\\,\\text{J}',
    tags: ['DU A 21-22'],
    category: 'varsity_a',
    difficulty: 'medium',
    star_rating: 2,
  },
  {
    id: 'wq_phy2_ch1_18',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s1',
    topic_name: 'তাপগতিবিদ্যার প্রথম সূত্র',
    question_number: 18,
    question_text: '2 kW এর একটি বৈদ্যুতিক কেটলি 1 kg ভরের পানির তাপমাত্রা 30°C থেকে 100°C এ উন্নীত করে। কেটলি থেকে পানিতে সঞ্চালিত শক্তির পরিমাণ কত এবং এ তাপমাত্রা বৃদ্ধিতে কত সময় লাগবে?',
    explanation: `$$Q = m s \\Delta \\theta = 1 \\times 4200 \\times (100 - 30) = 4200 \\times 70 = 294000\\text{ J} = 294\\text{ kJ (Ans.)}$$
$$P = \\frac{Q}{t} \\implies t = \\frac{Q}{P} = \\frac{294000}{2000} = 147\\text{ s (Ans.)}$$`,
    explanation_latex: 'Q = 294\\,\\text{kJ},\\; t = 147\\,\\text{s}',
    tags: ['DU A 21-22'],
    category: 'varsity_a',
    difficulty: 'medium',
    star_rating: 3,
  },
  {
    id: 'wq_phy2_ch1_19',
    subject_id: 'physics_2',
    subject_name: 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: '2nd',
    chapter_id: 'phy2_ch1',
    chapter_name: 'তাপগতিবিদ্যা',
    topic_id: 'p2c1_s1',
    topic_name: 'তাপগতিবিদ্যার প্রথম সূত্র',
    question_number: 19,
    question_text: 'একটি কার্নো ইঞ্জিন T₁ = 900K এবং T₂ = 300K তাপমাত্রার মধ্যে কাজ করে। ইঞ্জিনটি প্রতি চক্রে 0.25s সময়ে 1200J কাজ করে। এনট্রপির বৃদ্ধি নির্ণয় কর।',
    explanation: `উচ্চ তাপমাত্রা উৎস $T_1 = 900\\text{ K}$, নিম্ন তাপমাত্রা গ্রাহক $T_2 = 300\\text{ K}$।
কার্নো ইঞ্জিনের দক্ষতা $\\eta = 1 - \\frac{T_2}{T_1} = 1 - \\frac{300}{900} = 0.667$ (বা $66.7\\%$)।

উৎস হতে শোষিত তাপ $Q_1 = \\frac{W}{\\eta} = \\frac{1200}{0.667} = 1799.1\\text{ J}$।
এনট্রপি বৃদ্ধি:
$$\\Delta S = \\frac{Q_1}{T_1} = \\frac{1799.1}{900} = 2\\text{ J/K (Ans.)}$$`,
    explanation_latex: '\\Delta S = 2\\,\\text{J/K}',
    tags: ['DU A 20-21'],
    category: 'engineering',
    difficulty: 'hard',
    star_rating: 3,
  },
];
