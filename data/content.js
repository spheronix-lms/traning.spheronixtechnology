// ─────────────────────────────────────────────────────────────────────────────
// Spheronix Technology — site content
//
// Everything the website shows (programs, timeline, students, companies,
// stats) lives in this one file. The server exposes it at GET /api/content
// and the frontend renders from it, so edits here update the whole site.
//
// ─────────────────────────────────────────────────────────────────────────────

export const company = {
  name: 'Spheronix Technology Pvt. Ltd.',
  short: 'SPHERONIX',
  tagline: 'Corporate training, engineered.',
  email: 'support@spheronixtechnology.in',
  phone: '+91 73864 61671, +91 95159 06062',
  address: '5th Floor, No 8 & 9, Shantipura Main Rd, Phase II, Electronic City, Konappana Agrahara, Karnataka 560100',
};

export const stats = [
  { value: 6, suffix: ' mo', label: 'Training + company projects' },
  { value: 1240, suffix: '+', label: 'Students trained (sample)' },
  { value: 180, suffix: '+', label: 'Hiring companies (sample)' },
  { value: 92, suffix: '%', label: 'Placement assistance rate (sample)' },
];

export const programs = [
  {
    id: 'fullstack',
    no: '01',
    icon: 'code',
    title: 'AI-Integrated Full Stack Development',
    short: 'Full Stack + AI',
    summary:
      'Build production web apps end to end — React front ends, Node.js APIs, databases — and wire LLM features into them the way product teams do.',
    tags: ['REACT', 'NODE.JS', 'SQL + NOSQL', 'LLM APIS', 'RAG', 'CI/CD'],
    months: [
      'HTML, CSS, JavaScript, Git and team workflows',
      'React, TypeScript, state, component systems',
      'Node.js, REST/GraphQL, auth, PostgreSQL + MongoDB',
      'LLM APIs, RAG search, AI features, deployment',
    ],
    capstone: 'An AI-assisted SaaS product, shipped with tests, CI and a live URL.',
  },
  {
    id: 'embedded',
    no: '02',
    icon: 'chip',
    title: 'Embedded Systems and IoT',
    short: 'Embedded + IoT',
    summary:
      'From Embedded C on bare-metal microcontrollers to connected devices on the cloud. Every week on real boards, sensors and protocols.',
    tags: ['EMBEDDED C', 'ARM CORTEX-M', 'RTOS', 'MQTT', 'SENSORS', 'EDGE AI'],
    months: [
      'Embedded C, electronics basics, GPIO, timers, interrupts',
      'ARM Cortex-M, UART/SPI/I2C, sensor interfacing',
      'FreeRTOS, low-power design, debugging with probes',
      'IoT stacks, MQTT, cloud dashboards, TinyML at the edge',
    ],
    capstone: 'A connected device with firmware, telemetry and a live dashboard.',
  },
  {
    id: 'genai',
    no: '03',
    icon: 'spark',
    title: 'Generative AI',
    short: 'Generative AI',
    summary:
      'Python, transformers and the tooling behind modern AI products: prompting, retrieval, fine-tuning, agents and evaluation.',
    tags: ['PYTHON', 'TRANSFORMERS', 'PROMPTING', 'RAG', 'FINE-TUNING', 'AGENTS'],
    months: [
      'Python, NumPy, ML foundations, model evaluation',
      'Deep learning, transformers, embeddings',
      'Prompt design, RAG pipelines, vector databases',
      'Fine-tuning, AI agents, LLMOps, guardrails',
    ],
    capstone: 'A domain AI assistant with retrieval, evaluation and a deployed UI.',
  },
  {
    id: 'data',
    no: '04',
    icon: 'chart',
    title: 'Data Analysis',
    short: 'Data Analysis',
    summary:
      'Turn raw business data into decisions: Excel, SQL, Python and dashboards, taught through real company datasets and case discussions.',
    tags: ['EXCEL', 'SQL', 'PYTHON', 'PANDAS', 'POWER BI', 'STATISTICS'],
    months: [
      'Advanced Excel, business metrics, data cleaning',
      'SQL for analysis, joins, window functions',
      'Python, pandas, statistics, visualisation',
      'Power BI / Tableau dashboards, data storytelling',
    ],
    capstone: 'An end-to-end analytics case presented to a business panel.',
  },
];

// The 6-month corporate training journey
export const journey = [
  { phase: 'MONTH 01', title: 'Foundations', text: 'Orientation, tooling, daily labs and the first case discussions in the B-School format.' },
  { phase: 'MONTH 02', title: 'Core skills', text: 'Day-to-day practicals on the core stack, weekly reviews and peer presentations.' },
  { phase: 'MONTH 03', title: 'Advanced build', text: 'Team sprints, code and design reviews, mock client briefs and group discussions.' },
  { phase: 'MONTH 04', title: 'Capstone', text: 'A capstone built and defended in front of a panel, B-School style.' },
  { phase: 'MONTH 05–06', title: 'Company projects', text: 'Work inside Spheronix teams on live company projects, with standups and sprint demos.' },
  { phase: 'OUTCOME', title: 'Experience + jobs', text: 'Letter of experience, portfolio review, interview preparation and job assistance.' },
];

// How Spheronix training differs from typical institute training
export const comparison = [
  { topic: 'Learning format', them: 'Lectures and notes', us: 'B-School case method, daily practicals' },
  { topic: 'Hands-on time', them: 'A few lab hours a week', us: 'Practical work every single day' },
  { topic: 'Projects', them: 'Copied mini projects', us: '2 months on real company projects' },
  { topic: 'Certificate', them: 'Course completion only', us: 'Letter of experience from the company' },
  { topic: 'After training', them: 'A list of job links', us: 'Mock interviews, referrals, job assistance' },
];

// ⚠️ SAMPLE — fictional students. Replace with real, consented records.
export const placements = [
  { name: 'Aarav Sharma', program: 'fullstack', role: 'Software Engineer', company: 'Veltrix Global', tier: 'MNC', pkg: '8.4 LPA', batch: '2025', quote: 'The company projects felt exactly like my first month at work.' },
  { name: 'Diya Reddy', program: 'genai', role: 'AI Engineer', company: 'Quantara Systems', tier: 'MNC', pkg: '11.2 LPA', batch: '2025', quote: 'Building a real RAG product got me through every technical round.' },
  { name: 'Karthik Nair', program: 'embedded', role: 'Embedded Firmware Engineer', company: 'Pinnacle Embedded', tier: 'Mid-level', pkg: '6.8 LPA', batch: '2025', quote: 'I debugged real boards daily. Interviews were easy after that.' },
  { name: 'Sneha Iyer', program: 'data', role: 'Data Analyst', company: 'Sunrise Hospitals', tier: 'Non-tech', pkg: '5.6 LPA', batch: '2025', quote: 'The case discussions taught me to talk to managers, not just to SQL.' },
  { name: 'Rohan Verma', program: 'fullstack', role: 'Full Stack Developer', company: 'Fluxbit AI', tier: 'Startup', pkg: '9.0 LPA', batch: '2025', quote: 'I shipped features in week one at my startup. That came from here.' },
  { name: 'Ananya Gupta', program: 'genai', role: 'ML Engineer', company: 'Meridian Data Labs', tier: 'MNC', pkg: '10.5 LPA', batch: '2024', quote: 'The fine-tuning and evaluation work was my strongest portfolio piece.' },
  { name: 'Vikram Patel', program: 'embedded', role: 'IoT Developer', company: 'Voltrack IoT', tier: 'Startup', pkg: '7.2 LPA', batch: '2024', quote: 'From MQTT to the dashboard, I had built the whole stack once already.' },
  { name: 'Meera Krishnan', program: 'data', role: 'Business Analyst', company: 'Metro Finance Co.', tier: 'Non-tech', pkg: '6.0 LPA', batch: '2024', quote: 'Presenting every week made the final interview feel normal.' },
  { name: 'Arjun Menon', program: 'fullstack', role: 'Associate Engineer', company: 'Orbisys Technologies', tier: 'MNC', pkg: '7.6 LPA', batch: '2024', quote: 'The letter of experience made recruiters treat me as experienced.' },
  { name: 'Ishita Bose', program: 'genai', role: 'Prompt & AI Product Engineer', company: 'Kovalent Software', tier: 'Mid-level', pkg: '8.8 LPA', batch: '2024', quote: 'Agents, evals, guardrails — all things I had actually built.' },
  { name: 'Nikhil Rao', program: 'embedded', role: 'Hardware Validation Engineer', company: 'Helix Digital Services', tier: 'MNC', pkg: '7.9 LPA', batch: '2024', quote: 'Daily lab work gave me hands-on answers for every question.' },
  { name: 'Pooja Desai', program: 'data', role: 'Analytics Associate', company: 'Kalyan Retail Group', tier: 'Non-tech', pkg: '5.4 LPA', batch: '2024', quote: 'My Power BI capstone was the thing they asked about first.' },
  { name: 'Siddharth Joshi', program: 'fullstack', role: 'Frontend Engineer', company: 'Brightpath Solutions', tier: 'Mid-level', pkg: '6.9 LPA', batch: '2023', quote: 'Code reviews every week trained me the way a team lead would.' },
  { name: 'Kavya Menon', program: 'genai', role: 'Data Scientist', company: 'Datafin', tier: 'Startup', pkg: '9.6 LPA', batch: '2023', quote: 'Two months on a company project beat any certificate.' },
  { name: 'Rahul Singh', program: 'embedded', role: 'Embedded Software Engineer', company: 'Arcwave Systems', tier: 'Mid-level', pkg: '6.5 LPA', batch: '2023', quote: 'RTOS was scary until we built three projects on it.' },
  { name: 'Neha Kulkarni', program: 'data', role: 'Operations Analyst', company: 'Apex Logistics', tier: 'Non-tech', pkg: '5.2 LPA', batch: '2023', quote: 'I learned to find the story in the numbers, not just the numbers.' },
  { name: 'Aditya Kumar', program: 'fullstack', role: 'Backend Developer', company: 'Kartwise', tier: 'Startup', pkg: '8.0 LPA', batch: '2023', quote: 'Real deployments, real bugs, real fixes. That is the difference.' },
  { name: 'Tanvi Shah', program: 'genai', role: 'AI Solutions Associate', company: 'Northwind Consulting', tier: 'MNC', pkg: '9.8 LPA', batch: '2023', quote: 'The B-School style made me confident in client conversations.' },
];

// ⚠️ SAMPLE — fictional company names grouped by hiring category.
export const companies = {
  MNC: ['Veltrix Global', 'Quantara Systems', 'Meridian Data Labs', 'Orbisys Technologies', 'Helix Digital Services', 'Northwind Consulting', 'Bluegate Infotech', 'Tessaract Global'],
  'Mid-level': ['Pinnacle Embedded', 'Kovalent Software', 'Brightpath Solutions', 'Arcwave Systems', 'Nimbus Logic', 'Corelink IT'],
  Startup: ['Fluxbit AI', 'Voltrack IoT', 'Datafin', 'Kartwise', 'Lumen Robotics', 'Zestly'],
  'Non-tech': ['Sunrise Hospitals', 'Metro Finance Co.', 'Kalyan Retail Group', 'Apex Logistics', 'Greenfield Agro Exports', 'Urban Textiles'],
};

export const studio = [
  { title: 'Daily practicals', text: 'Every day has lab hours on real tools — not slides about them.' },
  { title: 'B-School case method', text: 'Case studies, group discussions and presentations every week.' },
  { title: 'Industry mentors', text: 'Engineers from Spheronix project teams review your work.' },
  { title: 'Live company projects', text: 'Two months inside real project teams, with sprints and demos.' },
  { title: 'Letter of experience', text: 'Six months that count as work experience on your résumé.' },
  { title: 'Job assistance', text: 'Résumé reviews, mock interviews and referrals to hiring partners.' },
];

// ⚠️ SAMPLE — the six placement stories shown as 3D "exhibits" in the
// Placements chapter. `name` must match an entry in `placements`.
export const featured = [
  { name: 'Diya Reddy', story: 'Built a retrieval-augmented support assistant during her company project — evaluated, guarded and deployed. It became the centrepiece of every interview.' },
  { name: 'Karthik Nair', story: 'Spent four months on real boards — ARM Cortex-M, RTOS, sensor buses — then shipped firmware for a live IoT telemetry project in months five and six.' },
  { name: 'Rohan Verma', story: 'Shipped a full-stack SaaS module with an LLM feature, CI and a live URL. Joined a funded AI startup straight after the experience letter.' },
  { name: 'Sneha Iyer', story: 'Turned a hospital network’s raw operations data into a Power BI dashboard and defended it in a B-School style panel review.' },
  { name: 'Arjun Menon', story: 'Two months inside a Spheronix delivery team — standups, code reviews and sprint demos. Recruiters read his letter of experience as real work.' },
  { name: 'Vikram Patel', story: 'Designed a connected device from sensor to dashboard over MQTT, with edge inference. Hired by an IoT startup building the same stack.' },
];

// The three steps of the training process (Process chapter).
export const steps = [
  {
    tag: 'LEARN', title: 'Practice every day.', body: 'Four months of B-School style learning: a case, a discussion, a concept — then hands-on lab time the same day.',
    lines: ['> LEARN — CASE, CONCEPT, LAB. EVERY DAY.', 'MONTHS 01 → 04. OUT — SKILLS THAT RUN'],
  },
  {
    tag: 'BUILD', title: 'Real company projects.', body: 'Two months inside Spheronix project teams: sprints, standups, code reviews and demos on live work.',
    lines: ['> BUILD — LIVE PROJECTS, REAL TEAMS.', 'SPRINT → REVIEW → DEMO. OUT — WORK EXPERIENCE'],
  },
  {
    tag: 'LAUNCH', title: 'Experience, then a job.', body: 'A letter of experience after six months, then mock interviews, referrals and job assistance until you land.',
    lines: ['> LAUNCH — LETTER OF EXPERIENCE.', 'PREPARE → REFER → PLACE. OUT — A CAREER'],
  },
];

// Studio chapter: three layers and six capability rows.
export const layers = [
  { no: '01', label: 'SKILLS', sub: 'B-SCHOOL PRACTICALS' },
  { no: '02', label: 'PROJECTS', sub: 'COMPANY WORK' },
  { no: '03', label: 'CAREER', sub: 'EXPERIENCE + JOBS' },
];
export const capabilities = [
  { icon: 'code', title: 'Daily practicals', text: 'Every day has lab hours on real tools — not slides about them.' },
  { icon: 'users', title: 'B-School case method', text: 'Case studies, group discussions and presentations every week.' },
  { icon: 'eye', title: 'Industry mentors', text: 'Engineers from Spheronix project teams review your work.' },
  { icon: 'briefcase', title: 'Live company projects', text: 'Two months inside real project teams, with sprints and demos.' },
  { icon: 'cap', title: 'Letter of experience', text: 'Six months that count as work experience on your résumé.' },
  { icon: 'arrow', title: 'Job assistance', text: 'Résumé reviews, mock interviews and referrals to hiring companies.' },
];

// "A day at Spheronix" chapter: one training day, 09:00 → 18:00.
// `icon` must be one of the tile icons in public/js/icons.js.
export const day = [
  { time: '09:00', title: 'Standup', text: 'The day starts like a company day: a 15-minute standup with your batch and mentor.', icon: 'nodes' },
  { time: '09:30', title: 'Case discussion', text: 'A real business problem, B-School style. Teams debate it before anyone writes code.', icon: 'chat' },
  { time: '11:00', title: 'Concept session', text: 'The concept that solves the case — taught in context, never in isolation.', icon: 'cap' },
  { time: '12:30', title: 'Lunch + peer review', text: 'Swap yesterday’s work with a teammate and review each other over lunch.', icon: 'layers' },
  { time: '13:30', title: 'Hands-on lab', text: 'Build it on real tools and real boards. The longest block of the day.', icon: 'code' },
  { time: '15:30', title: 'Mentor review', text: 'Engineers from Spheronix project teams review your work line by line.', icon: 'eye' },
  { time: '16:30', title: 'Presentation', text: 'Present what you built and why. Every day, a little more confident.', icon: 'chart' },
  { time: '17:30', title: 'Wrap-up', text: 'Log what you learned and plan tomorrow. Then go home on time.', icon: 'grid' },
];

// Shows a small "sample data" footnote under placements. Set to false once
// `stats`, `placements` and `companies` hold your real records.
export const sampleNotice = true;

export const content = {
  company, sampleNotice, stats, programs, journey, comparison, placements, companies, studio,
  featured, steps, layers, capabilities, day,
};
