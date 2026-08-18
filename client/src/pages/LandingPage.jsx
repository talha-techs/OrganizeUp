import { useState, useRef, Suspense, lazy } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, useScroll, useTransform } from 'framer-motion';
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
import Footer from '../components/layout/Footer';
import TiltCard from '../components/ui/TiltCard';

const LandingHero3D = lazy(() => import('../components/landing/LandingHero3D'));

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
  <nav className="fixed top-0 left-0 right-0 z-50 border-b border-subtle bg-canvas/80 backdrop-blur-xl">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <img src="/pwa-192x192.png" alt="OrganizeUp" className="w-9 h-9 rounded-xl shadow-lg shadow-accent/20" />
          <span className="text-lg font-bold font-display">
            <span className="text-primary">Organize</span>
            <span className="gradient-text">Up</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to="/login" 
            className="text-sm font-medium text-secondary hover:text-primary transition-colors hidden sm:block"
          >
            Log in
          </Link>
          <Link 
            to="/signup" 
            className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-accent/25"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  </nav>
);

const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-24 lg:pt-44 lg:pb-36 overflow-hidden min-h-screen flex flex-col justify-center">
      {/* 3D Fiber Floating Scene */}
      <Suspense fallback={null}>
        <LandingHero3D />
      </Suspense>

      {/* Dynamic Ambient Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.22, 0.12, 0.22] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] bg-amber-500/15 rounded-full blur-[100px]" 
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-subtle border border-accent/25 text-accent text-sm font-medium mb-6 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Your All-in-One Learning Hub
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-5xl lg:text-7xl font-bold text-primary mb-6 leading-tight tracking-tight font-display">
            All your resources. <br className="hidden lg:block" />
            <span className="gradient-text">
              Organized. Always with you.
            </span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-lg lg:text-xl text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
            Import from Google Drive, Telegram, and more. Organize smartly, track your progress, and access everything anytime, anywhere.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="btn-primary w-full sm:w-auto px-8 py-4 rounded-xl text-lg font-semibold shadow-xl shadow-accent/30 flex items-center justify-center gap-2">
              Start Organizing <IoArrowForward />
            </Link>
            <a href="#features" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-surface hover:bg-surface-raised text-primary text-lg font-medium transition-all backdrop-blur-sm border border-subtle flex items-center justify-center gap-2">
              Explore Features
            </a>
          </motion.div>
        </motion.div>

        {/* 3D Desktop Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, type: 'spring' }}
          className="mt-28 mb-12 relative mx-auto max-w-5xl group perspective-1000 z-10"
        >
          {/* Subtle Glow Behind Image */}
          <div className="absolute -inset-2 bg-gradient-to-t from-accent/30 to-amber-500/20 blur-3xl rounded-[2.5rem] transform group-hover:scale-105 transition-transform duration-700 pointer-events-none" />
          
          <motion.div 
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="relative rounded-2xl border border-subtle overflow-hidden shadow-2xl shadow-black/50 bg-surface-raised"
          >
            <div className="bg-surface px-4 py-3 flex items-center justify-between border-b border-subtle">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="text-[11px] font-mono text-muted tracking-tight">app.organizeup.com</div>
              <div className="w-12" />
            </div>
            <img 
              src="/screenshot-desktop.png" 
              alt="OrganizeUp Dashboard" 
              className="w-full h-auto object-cover opacity-100 block"
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
      colorClass: 'bg-accent-subtle text-accent',
      glowClass: 'bg-accent/10',
      glowRgba: 'rgba(255, 87, 34, 0.2)',
    },
    {
      icon: <IoSchoolOutline size={32} />,
      title: 'Course Management',
      desc: 'Track your progress through complex courses. We remember exactly where you left off.',
      colorClass: 'bg-purple-500/10 text-purple-400',
      glowClass: 'bg-purple-500/10',
      glowRgba: 'rgba(168, 85, 247, 0.2)',
    },
    {
      icon: <IoConstructOutline size={32} />,
      title: 'Tools & Snippets',
      desc: 'Save your best hacks, software tools, and web links for instant access.',
      colorClass: 'bg-emerald-500/10 text-emerald-400',
      glowClass: 'bg-emerald-500/10',
      glowRgba: 'rgba(16, 185, 129, 0.2)',
    }
  ];

  return (
    <section id="features" className="py-24 bg-canvas relative border-t border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-primary mb-4">Everything in its right place</h2>
          <p className="text-secondary text-lg max-w-2xl mx-auto">We've built dedicated tools for every type of learning resource you own.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: i * 0.2 }}
            >
              <TiltCard glowColor={feature.glowRgba} className="h-full">
                <div className="glass-card p-8 group relative overflow-hidden border border-subtle h-full">
                  <div className={`absolute top-0 right-0 w-32 h-32 ${feature.glowClass} rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
                  <div className={`w-14 h-14 rounded-2xl ${feature.colorClass} flex items-center justify-center mb-6`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-3">{feature.title}</h3>
                  <p className="text-secondary leading-relaxed">{feature.desc}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const MobileShowcaseSection = () => {
  return (
    <section className="py-24 relative overflow-hidden bg-canvas">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-canvas to-surface-raised/40" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-primary mb-6 leading-tight">
              Take your knowledge <br/>
              <span className="text-accent">everywhere.</span>
            </h2>
            <p className="text-lg text-secondary mb-8 leading-relaxed">
              OrganizeUp is built as a blazing-fast Progressive Web App. Install it directly on your phone or desktop and access your entire library instantly.
            </p>
            
            <ul className="space-y-4 mb-8">
              {[
                { icon: <IoPhonePortraitOutline />, text: 'Installable on iOS & Android' },
                { icon: <IoDesktopOutline />, text: 'Standalone Desktop App' },
                { icon: <IoLogoGooglePlaystore />, text: 'Native App Feel & Performance' }
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-secondary">
                  <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center text-accent">
                    {item.icon}
                  </div>
                  <span className="font-medium text-primary">{item.text}</span>
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
            <div className="relative w-[300px] h-[600px] rounded-[3rem] border-[8px] border-surface-raised bg-canvas shadow-2xl overflow-hidden flex-shrink-0">
              <div className="absolute top-0 inset-x-0 h-6 bg-surface-raised rounded-b-3xl w-40 mx-auto z-20" />
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
    <div className="absolute inset-0 bg-gradient-to-br from-[#ff5722] to-[#e64a19]">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
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
        className="text-xl text-white/90 mb-10 max-w-2xl mx-auto"
      >
        Join users who have taken control of their scattered PDFs, scattered course links, and endless bookmarks.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
      >
        <Link to="/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-[#d84315] text-lg font-bold hover:bg-neutral-100 transition-colors shadow-2xl">
          Create Free Account <IoArrowForward />
        </Link>
      </motion.div>
    </div>
  </section>
);

const LandingPage = () => {
  useDocumentTitle('Welcome to OrganizeUp');
  const { user } = useSelector((state) => state.auth);

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-canvas selection:bg-accent-subtle selection:text-accent">
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
