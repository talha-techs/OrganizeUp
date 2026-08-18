import { Link } from 'react-router-dom';
import { IoHeart, IoMailOutline } from 'react-icons/io5';

const Footer = () => {
  return (
    <footer className="border-t border-subtle bg-surface/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <img src="/pwa-192x192.png" alt="OrganizeUp" className="w-8 h-8 rounded-lg" />
              <span className="text-base font-semibold text-primary">OrganizeUp</span>
            </div>
            <p className="text-sm text-secondary leading-relaxed max-w-sm">
              Organize books, courses, tools, sections, and playlists in one focused workspace.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-primary mb-3">Quick Links</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-secondary">
              <Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
              <Link to="/explore" className="hover:text-primary transition-colors">Explore</Link>
              <Link to="/books" className="hover:text-primary transition-colors">Books</Link>
              <Link to="/courses" className="hover:text-primary transition-colors">Courses</Link>
              <Link to="/tools" className="hover:text-primary transition-colors">Tools</Link>
              <Link to="/youtube-playlists" className="hover:text-primary transition-colors">Playlists</Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-primary mb-3">Contact</h4>
            <a
              href="mailto:support@organizeup.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors"
            >
              <IoMailOutline size={15} /> support@organizeup.app
            </a>
            <p className="text-xs text-muted mt-3">
              Built for students and self-learners.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
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
