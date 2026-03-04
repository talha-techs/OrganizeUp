import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { IoBookOutline, IoSchoolOutline, IoConstructOutline, IoArrowForward, IoRocketOutline, IoShieldCheckmarkOutline, IoCloudOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';
import useDocumentTitle from '../hooks/useDocumentTitle';

const LandingPage = () => {
  useDocumentTitle('Welcome');
  const { user } = useSelector((state) => state.auth);

  if (user) return <Navigate to="/dashboard" replace />;

  const features = [
    {
      icon: <IoBookOutline size={28} />,
      title: 'Books Library',
      desc: 'Organize your video and text books with embedded players and PDF readers. Track your reading and watching progress.',
      gradient: 'from-indigo-500 to-purple-500',
    },
    {
      icon: <IoSchoolOutline size={28} />,
      title: 'Course Organizer',
      desc: 'Categorize and manage all your course links from Google Drive, Telegram, and more in one centralized hub.',
      gradient: 'from-cyan-500 to-blue-500',
    },
    {
      icon: <IoConstructOutline size={28} />,
      title: 'Tools & Tricks',
      desc: 'Save your best hacks, free trial tricks, and useful tools with clear descriptions and quick access links.',
      gradient: 'from-emerald-500 to-teal-500',
    },
  ];

  const stats = [
    { label: 'Resource Types', value: '5+' },
    { label: 'Unified Workspace', value: '1' },
    { label: 'Clutter Reduced', value: '100%' },
  ];

  const trustPoints = [
    'Owner-first access control for your resources',
    'Centralized learning library with progress tracking',
    'Modern performance-focused MERN architecture',
  ];

  const floatingElements = [
    { key: 'book', icon: <IoBookOutline size={24} />, className: 'top-[16%] left-[8%] text-indigo-300/30', duration: 8 },
    { key: 'course', icon: <IoSchoolOutline size={26} />, className: 'top-[24%] right-[10%] text-cyan-300/30', duration: 10 },
    { key: 'tool', icon: <IoConstructOutline size={24} />, className: 'bottom-[26%] left-[12%] text-emerald-300/30', duration: 9 },
    { key: 'char-o', icon: <span className="font-display font-bold text-3xl">O</span>, className: 'top-[42%] left-[4%] text-indigo-400/20', duration: 11 },
    { key: 'char-u', icon: <span className="font-display font-bold text-3xl">U</span>, className: 'bottom-[20%] right-[8%] text-cyan-400/20', duration: 12 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 overflow-hidden">
      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/organizeup-logo.svg" alt="OrganizeUp" className="w-9 h-9 rounded-xl shadow-lg shadow-indigo-500/20" />
              <span className="text-lg font-bold font-display">
                <span className="text-white">Organize</span>
                <span className="gradient-text">Up</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Login
              </Link>
              <Link to="/signup" className="btn-primary text-sm">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
        {floatingElements.map((item, index) => (
          <motion.div
            key={item.key}
            className={`absolute ${item.className}`}
            animate={{
              y: [0, -22, 0, 18, 0],
              x: [0, 10, -8, 12, 0],
              rotate: [0, 5, -5, 3, 0],
            }}
            transition={{
              duration: item.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 0.5,
            }}
          >
            {item.icon}
          </motion.div>
        ))}
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8">
              <IoRocketOutline size={14} />
              Your Personal Learning Resource Hub
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black font-display leading-tight mb-6">
              <span className="text-white">Stop Scrolling,</span>
              <br />
              <span className="gradient-text">Start Learning Fast</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Bring scattered resources from Drive, Telegram, WhatsApp, and links into one structured hub built for consistent learning.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="btn-primary text-base px-8 py-3.5 text-lg">
                Get Started Free <IoArrowForward size={18} />
              </Link>
              <Link to="/login" className="btn-secondary text-base px-8 py-3.5">
                Login to Account
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center justify-center gap-12 mt-16"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-10 grid sm:grid-cols-3 gap-3 max-w-4xl mx-auto"
          >
            {trustPoints.map((point) => (
              <div key={point} className="flex items-center gap-2 justify-center sm:justify-start text-sm text-slate-300 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <IoCheckmarkCircleOutline className="text-emerald-400" size={16} />
                <span>{point}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 pb-32 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 font-display">
              Everything You Need
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Built for learners who collect resources from everywhere — Telegram, WhatsApp, Google Drive — and need one place to organize them all.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass-card p-6 group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  <span className="text-white">{feature.icon}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 font-display">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="glass-card p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5" />
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-4 mb-6">
                <IoShieldCheckmarkOutline className="text-indigo-400" size={24} />
                <IoCloudOutline className="text-cyan-400" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 font-display">Ready to Organize?</h3>
              <p className="text-slate-400 mb-6">Start managing your learning resources today. It's free and always will be.</p>
              <Link to="/signup" className="btn-primary text-base px-8 py-3">
                Create Free Account <IoArrowForward size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-600">
        &copy; {new Date().getFullYear()} OrganizeUp. Professional workspace for modern learners.
      </footer>
    </div>
  );
};

export default LandingPage;
