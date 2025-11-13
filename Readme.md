# MavPrep - Intelligent Exam Preparation Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Your intelligent companion for academic success and exam preparation.**

MavPrep is a comprehensive educational platform designed to help students excel in their academic journey. Initially targeting University of Texas at Arlington (UTA) students, with plans to expand to universities nationwide.

---

## 🎯 Project Vision

**Problem Statement:** Students often struggle with exam preparation due to lack of structured study materials, personalized learning paths, and tools to track their progress effectively.

**Target Users:**

- University students preparing for midterms and finals
- Initially focusing on UTA students
- Expanding to students at universities nationwide

**Success Metrics:**

- Student engagement and retention rates
- Improvement in exam performance
- User satisfaction scores
- Community growth and participation

---

## ✨ Features

### Core Features

1. **Practice Tests** 📝

   - Hundreds of practice tests covering various subjects
   - Detailed explanations for each question
   - Instant feedback and scoring
   - Adaptive difficulty based on performance

2. **Custom Study Plans** 📅

   - Personalized study schedules tailored to individual goals
   - Timeline-based planning for exam preparation
   - Learning style adaptation
   - Progress tracking and milestones

3. **Progress Analytics** 📊

   - Detailed performance insights and visualizations
   - Strength and weakness identification
   - Historical progress tracking
   - Comparative analytics

4. **Video Lessons** 🎥

   - Expert instructors covering key topics and concepts
   - On-demand video content library
   - Topic-specific tutorials
   - Visual learning support

5. **Smart Flashcards** 🎴

   - AI-powered flashcard system
   - Spaced repetition algorithm
   - Adaptive learning based on retention
   - Custom flashcard creation

6. **Community Support** 👥
   - Connect with peers and study groups
   - Discussion forums for collaborative learning
   - Q&A platform for subject-specific questions
   - Peer-to-peer support network

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ installed
- npm or yarn package manager
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/zaineel/Cloud_Migration.git
cd Cloud_Migration/mavprep-landing
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### Build for Production

```bash
npm run build
npm start
```

### Run Linting

```bash
npm run lint
```

---

## 🛠 Tech Stack

### Frontend

- **Framework:** Next.js 16.0 (App Router)
- **UI Library:** React 19.2
- **Language:** TypeScript 5.0
- **Styling:** Tailwind CSS v4
- **PostCSS:** Tailwind PostCSS v4

### Development Tools

- **Linting:** ESLint with Next.js config
- **Type Checking:** TypeScript strict mode
- **Package Manager:** npm

### Design System

- **Theme:** Dark mode with neon blue accents
- **Color Palette:**
  - Primary: `#00d9ff` (Neon cyan/blue)
  - Secondary: `#0099cc` (Darker neon blue)
  - Accent: `#00ffff` (Bright cyan)
- **Typography:** Modern sans-serif with Inter font family
- **Components:** Custom reusable React components with accessibility in mind

---

## 📁 Project Structure

```
mavprep-landing/
├── app/                    # Next.js App Router directory
│   ├── favicon.ico        # App favicon
│   ├── globals.css        # Global styles and Tailwind config
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Landing page
│   ├── page-clean.tsx     # Alternative clean page layout
│   └── login/             # Login page route
│       └── page.tsx       # Login/signup page
├── public/                # Static assets
│   ├── *.svg             # SVG icons and images
│   └── ...
├── .next/                 # Next.js build output (generated)
├── node_modules/          # Dependencies (generated)
├── .gitignore            # Git ignore rules
├── eslint.config.mjs     # ESLint configuration
├── next.config.ts        # Next.js configuration
├── package.json          # Project dependencies and scripts
├── postcss.config.mjs    # PostCSS configuration
├── tsconfig.json         # TypeScript configuration
└── README.md             # Project documentation
```

---

## 🎨 Design & UX

### Landing Page Sections

1. **Hero Section**

   - Prominent MavPrep branding with neon glow effects
   - Clear call-to-action button
   - Key statistics (10K+ Active Students, 500+ Practice Tests, 95% Success Rate)

2. **Features Section**

   - Grid layout showcasing six core features
   - Icon-based visual representation
   - Hover effects with neon border glow
   - Detailed feature descriptions

3. **Footer**
   - Brand information
   - Contact details
   - Social media links (Twitter, LinkedIn, Facebook, Instagram)
   - Copyright information

### Login/Signup Page

- Split-screen design with branding on the left
- Compact form layout with clean inputs
- Multiple authentication options:
  - Traditional username/email and password
  - Google OAuth
  - Microsoft OAuth
  - Apple Sign In
  - Guest mode
- Toggle between login and signup forms

---

## 👥 Team

### Maintainers

- **Zaineel Mithani** ([@zaineel](https://github.com/zaineel))
- **Aroudra** ([@aroudrasthakur](https://github.com/aroudrasthakur)) - Project Creator
- **Tanzid Noor Azad** ([@TanzidAzad](https://github.com/TanzidAzad))
- **Soumik Sen** ([@soumiksen](https://github.com/soumiksen))
- **Hani Markos** ([@hm-22](https://github.com/hm-22))
- **Rachelle Centeno Azurdia** ([@rachelle9026](https://github.com/rachelle9026))

### Project Leadership

- **Directors:** Tobi and Prajit Viswanadha
- **Contact:** DM on Discord

---

## 🤝 Contributing

We welcome contributions from developers, designers, educators, and students! Here's how you can help:

### Getting Involved

1. **Report Issues:** Found a bug or have a feature request? Open an issue with detailed information
2. **Submit Pull Requests:** Fix bugs, add features, or improve documentation
3. **Design Contributions:** Help improve UI/UX, create mockups, or design assets
4. **Content Creation:** Contribute study materials, practice questions, or video content
5. **Community Support:** Help other users in discussions and forums

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Make your changes and commit: `git commit -m "feat: add your feature"`
4. Push to your fork: `git push origin feat/your-feature-name`
5. Open a Pull Request with a clear description

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

---

## 📋 Roadmap

### Phase 1: Foundation (Current)

- [x] Landing page design and development
- [x] User authentication UI
- [ ] Backend API development
- [ ] Database schema design
- [ ] User authentication implementation

### Phase 2: Core Features

- [ ] Practice test engine
- [ ] Question bank and categorization
- [ ] Progress tracking system
- [ ] Basic analytics dashboard
- [ ] User profile management

### Phase 3: Enhanced Learning

- [ ] Custom study plan generator
- [ ] AI-powered flashcard system
- [ ] Video content integration
- [ ] Spaced repetition algorithm
- [ ] Performance recommendations

### Phase 4: Community & Social

- [ ] Discussion forums
- [ ] Study groups
- [ ] Peer-to-peer messaging
- [ ] Leaderboards and achievements
- [ ] Social sharing features

### Phase 5: Scale & Expansion

- [ ] Mobile application (React Native/Flutter)
- [ ] Multi-university support
- [ ] Content marketplace for educators
- [ ] Advanced analytics and AI insights
- [ ] Integration with university LMS systems

---

## 📊 Current Status

- **Phase:** Active Development
- **Current Focus:** Landing page and authentication UI
- **Communication:** Discord #{{project-channel}}
- **Project Board:** {{PROJECT_BOARD_URL}}

### Recent Updates

- Landing page with responsive design ✅
- Login/signup page with social authentication UI ✅
- Dark theme with neon blue design system ✅
- Tailwind CSS v4 integration ✅

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Contact & Support

- **Email:** support@mavprep.com
- **Discord:** ACM Projects Discord
- **GitHub Issues:** [Report issues](https://github.com/zaineel/Cloud_Migration/issues)
- **Discussions:** [Join conversations](https://github.com/zaineel/Cloud_Migration/discussions)

---

## 🙏 Acknowledgments

- UTA ACM Chapter for project support and collaboration
- All contributors and maintainers
- Open-source community for the amazing tools and libraries
- UTA students for feedback and feature suggestions

---

<div align="center">

[Website](https://mavprep.com) • [Documentation](docs/) • [Discord](https://discord.gg/acm)

</div>
