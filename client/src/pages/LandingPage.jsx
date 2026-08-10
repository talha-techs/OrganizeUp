import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { 
  IoBookOutline, 
  IoSchoolOutline, 
  IoConstructOutline, 
  IoArrowForward, 
  IoLogoGooglePlaystore,
  IoPhonePortraitOutline,
  IoDesktopOutline
} from 'react-icons/io5';
import useDocumentTitle from '../hooks/useDocumentTitle';

// -- Animation Variants --
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.1, delayChildren: 0.2 } 
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: 'spring', stiffness: 120, damping: 20 }
  },
};

// -- Components --
const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <img src="/pwa-192x192.png" alt="OrganizeUp" className="w-9 h-9 rounded-xl shadow-lg shadow-indigo-500/20" />
          <span className="text-lg font-bold font-display">
            <span className="text-white">Organize</span>
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Up</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to="/login" 
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block"
          >
            Log in
          </Link>
          <Link 
            to="/signup" 
            className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  </nav>
);

const HeroSection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Parallax effect on the screenshot
  const yImage = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacityImage = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={containerRef} className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden min-h-screen flex flex-col justify-center">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.2, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] bg-cyan-500/20 rounded-full blur-[100px]" 
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            Your All-in-One Learning Hub
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight font-display">
            All your resources. <br className="hidden lg:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 animate-gradient-x">
              Organized. Always with you.
            </span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-lg lg:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Import from Google Drive, Telegram, and more. Organize smartly, track your progress, and access everything anytime, anywhere.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-lg font-semibold transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_35px_rgba(99,102,241,0.6)] flex items-center justify-center gap-2">
              Start Organizing <IoArrowForward />
            </Link>
            <a href="#features" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white text-lg font-medium transition-all backdrop-blur-sm border border-white/10 flex items-center justify-center gap-2">
              Explore Features
            </a>
          </motion.div>
        </motion.div>

        {/* 3D Desktop Mockup */}
        <motion.div 
          style={{ y: yImage, opacity: opacityImage }}
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, type: 'spring' }}
          className="mt-20 relative mx-auto max-w-5xl group perspective-1000"
        >
          {/* Subtle Glow Behind Image */}
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/30 to-cyan-500/30 blur-3xl rounded-[2rem] transform group-hover:scale-105 transition-transform duration-700" />
          
          <motion.div 
            whileHover={{ y: -10, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative rounded-xl border border-white/10 overflow-hidden shadow-2xl shadow-black/50 bg-slate-900"
          >
            <div className="bg-slate-900 px-4 py-3 flex items-center gap-2 border-b border-white/5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <img 
              src="/screenshot-desktop.png" 
              alt="OrganizeUp Dashboard" 
              className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

const FeaturesSection = () => {
  const features = [
    {
      icon: <IoBookOutline size={32} />,
      title: 'Unified Library',
      desc: 'Access your PDFs, video courses, and books directly. No more hunting through scattered folders.',
      color: 'indigo'
    },
    {
      icon: <IoSchoolOutline size={32} />,
      title: 'Course Management',
      desc: 'Track your progress through complex courses. We remember exactly where you left off.',
      color: 'cyan'
    },
    {
      icon: <IoConstructOutline size={32} />,
      title: 'Tools & Snippets',
      desc: 'Save your best hacks, software tools, and web links for instant access.',
      color: 'emerald'
    }
  ];

  return (
    <section id="features" className="py-24 bg-slate-950 relative border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Everything in its right place</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">We've built dedicated tools for every type of learning resource you own.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: i * 0.2 }}
              whileHover={{ y: -10 }}
              className="glass-card p-8 group relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-${feature.color}-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
              <div className={`w-14 h-14 rounded-2xl bg-${feature.color}-500/10 text-${feature.color}-400 flex items-center justify-center mb-6`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const MobileShowcaseSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-indigo-950/20" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Take your knowledge <br/>
              <span className="text-indigo-400">everywhere.</span>
            </h2>
            <p className="text-lg text-slate-400 mb-8 leading-relaxed">
              OrganizeUp is built as a blazing-fast Progressive Web App. Install it directly on your phone or desktop and access your entire library instantly.
            </p>
            
            <ul className="space-y-4 mb-8">
              {[
                { icon: <IoPhonePortraitOutline />, text: 'Installable on iOS & Android' },
                { icon: <IoDesktopOutline />, text: 'Standalone Desktop App' },
                { icon: <IoLogoGooglePlaystore />, text: 'Native App Feel & Performance' }
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-300">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    {item.icon}
                  </div>
                  <span className="font-medium">{item.text}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2 flex justify-center"
          >
            {/* Phone Mockup */}
            <div className="relative w-[300px] h-[600px] rounded-[3rem] border-[8px] border-slate-800 bg-slate-950 shadow-2xl overflow-hidden flex-shrink-0">
              <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-3xl w-40 mx-auto z-20" />
              <img 
                src="/screenshot-mobile.png" 
                alt="Mobile App" 
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

const CTASection = () => (
  <section className="py-24 relative overflow-hidden">
    <div className="absolute inset-0 bg-indigo-600">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
    </div>
    
    <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-4xl md:text-5xl font-bold text-white mb-6"
      >
        Ready to declutter your mind?
      </motion.h2>
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto"
      >
        Join users who have taken control of their scattered PDFs, scattered course links, and endless bookmarks.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
      >
        <Link to="/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-indigo-600 text-lg font-bold hover:bg-indigo-50 transition-colors shadow-xl">
          Create Free Account <IoArrowForward />
        </Link>
      </motion.div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-slate-950 border-t border-white/5 py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-3">
        <img src="/pwa-192x192.png" alt="OrganizeUp" className="w-8 h-8 rounded-lg grayscale opacity-70" />
        <span className="text-slate-400 font-semibold font-display">OrganizeUp</span>
      </div>
      <p className="text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} OrganizeUp. All rights reserved.
      </p>
    </div>
  </footer>
);

const LandingPage = () => {
  useDocumentTitle('Welcome to OrganizeUp');
  const { user } = useSelector((state) => state.auth);

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-slate-950 selection:bg-indigo-500/30">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <MobileShowcaseSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default LandingPage;
