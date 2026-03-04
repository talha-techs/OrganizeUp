import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { IoBookOutline, IoSchoolOutline, IoConstructOutline, IoArrowForward, IoSparkles } from 'react-icons/io5';
import { fetchBooks } from '../redux/slices/bookSlice';
import { fetchCourses } from '../redux/slices/courseSlice';
import { fetchTools } from '../redux/slices/toolSlice';
import useDocumentTitle from '../hooks/useDocumentTitle';

const Dashboard = () => {
  useDocumentTitle('Dashboard');
  const { user } = useSelector((state) => state.auth);
  const { books } = useSelector((state) => state.books);
  const { courses } = useSelector((state) => state.courses);
  const { tools } = useSelector((state) => state.tools);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchBooks());
    dispatch(fetchCourses());
    dispatch(fetchTools());
  }, [dispatch]);

  const sections = [
    {
      title: 'Books',
      desc: 'Video & Text books with progress tracking',
      icon: <IoBookOutline size={28} />,
      count: books.length,
      to: '/books',
      gradient: 'from-indigo-500 to-purple-600',
      bgGlow: 'bg-indigo-500/8',
    },
    {
      title: 'Courses',
      desc: 'Organized by categories with drive links',
      icon: <IoSchoolOutline size={28} />,
      count: courses.length,
      to: '/courses',
      gradient: 'from-cyan-500 to-blue-600',
      bgGlow: 'bg-cyan-500/8',
    },
    {
      title: 'Tools & Tricks',
      desc: 'Hacks, free trials, and useful resources',
      icon: <IoConstructOutline size={28} />,
      count: tools.length,
      to: '/tools',
      gradient: 'from-emerald-500 to-teal-600',
      bgGlow: 'bg-emerald-500/8',
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium mb-2">
          <IoSparkles size={14} />
          {getGreeting()}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white font-display">
          Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p className="text-slate-400 mt-2">
          Pick up where you left off or explore something new
        </p>
      </motion.div>

      {/* Section Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link to={section.to} className="block group">
              <div className="glass-card p-6 relative overflow-hidden h-full">
                {/* Background glow */}
                <div className={`absolute top-0 right-0 w-32 h-32 ${section.bgGlow} rounded-full blur-2xl -translate-y-1/2 translate-x-1/2`} />

                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${section.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-white">{section.icon}</span>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white font-display mb-1">{section.title}</h3>
                      <p className="text-sm text-slate-400">{section.desc}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-bold gradient-text">{section.count}</span>
                      <p className="text-xs text-slate-500">items</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-5 text-sm text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    <span>View All</span>
                    <IoArrowForward size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity / Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-xl font-bold text-white font-display mb-4">Quick Access</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Recent books */}
          {books.slice(0, 2).map((book) => (
            <Link key={book._id} to={`/books/${book._id}`} className="glass-card p-4 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <IoBookOutline className="text-indigo-400" size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">{book.title}</p>
                  <p className="text-xs text-slate-500">{book.type} book</p>
                </div>
              </div>
            </Link>
          ))}

          {/* Recent courses */}
          {courses.slice(0, 2).map((course) => (
            <a key={course._id} href={course.driveLink} target="_blank" rel="noopener noreferrer" className="glass-card p-4 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <IoSchoolOutline className="text-cyan-400" size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-cyan-300 transition-colors">{course.title}</p>
                  <p className="text-xs text-slate-500">{course.category?.name || 'Course'}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
