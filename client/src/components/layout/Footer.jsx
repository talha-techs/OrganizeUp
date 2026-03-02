import { Link } from 'react-router-dom';
import { IoHeart, IoMailOutline } from 'react-icons/io5';

const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <img src="/organizeup-logo.svg" alt="OrganizeUp" className="w-8 h-8 rounded-lg" />
              <span className="text-base font-semibold text-white">OrganizeUp</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Organize books, courses, tools, sections, and playlists in one focused workspace.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Quick Links</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-400">
              <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              <Link to="/explore" className="hover:text-white transition-colors">Explore</Link>
              <Link to="/books" className="hover:text-white transition-colors">Books</Link>
              <Link to="/courses" className="hover:text-white transition-colors">Courses</Link>
              <Link to="/tools" className="hover:text-white transition-colors">Tools</Link>
              <Link to="/youtube-playlists" className="hover:text-white transition-colors">Playlists</Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Contact</h4>
            <a
              href="mailto:support@organizeup.app"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <IoMailOutline size={15} /> support@organizeup.app
            </a>
            <p className="text-xs text-slate-500 mt-3">
              Built for students and self-learners.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} OrganizeUp. All rights reserved.</span>
          <span className="inline-flex items-center gap-1.5">
            Made with <IoHeart className="text-red-500" size={12} /> for learners
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
