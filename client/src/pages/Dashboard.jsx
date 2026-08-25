import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { IoBookOutline, IoSchoolOutline, IoConstructOutline, IoArrowForward, IoSparkles } from 'react-icons/io5';
import { fetchBooks } from '../redux/slices/bookSlice';
import { fetchCourses } from '../redux/slices/courseSlice';
import { fetchTools } from '../redux/slices/toolSlice';
import AnimatedCounter from '../components/ui/AnimatedCounter';
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
      desc: 'Video, audio & text books with progress tracking',
      icon: <IoBookOutline size={28} />,
      count: books.length,
      to: '/books',
      gradient: 'from-[#ff5722] to-[#f4511e]',
      bgGlow: 'bg-accent-subtle',
    },
    {
      title: 'Courses',
      desc: 'Organized by categories with drive links',
      icon: <IoSchoolOutline size={28} />,
      count: courses.length,
      to: '/courses',
      gradient: 'from-purple-500 to-pink-600',
      bgGlow: 'bg-purple-500/10',
    },
    {
      title: 'Tools & Tricks',
      desc: 'Hacks, free trials, and useful resources',
      icon: <IoConstructOutline size={28} />,
      count: tools.length,
      to: '/tools',
      gradient: 'from-amber-500 to-orange-600',
      bgGlow: 'bg-amber-500/10',
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
        <div className="flex items-center gap-2 text-accent text-sm font-medium mb-2">
          <IoSparkles size={14} />
          {getGreeting()}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-primary font-display">
          Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p className="text-secondary mt-2">
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
              <div className="glass-card p-6 relative overflow-hidden h-full border border-subtle hover:border-strong transition-all">
                {/* Background glow */}
                <div className={`absolute top-0 right-0 w-32 h-32 ${section.bgGlow} rounded-full blur-2xl -translate-y-1/2 translate-x-1/2`} />

                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${section.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-white">{section.icon}</span>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-primary font-display mb-1">{section.title}</h3>
                      <p className="text-sm text-secondary">{section.desc}</p>
                    </div>
                    <div className="text-right">
                      <AnimatedCounter
                        value={section.count}
                        duration={0.8}
                        delay={i * 0.08}
                        className="text-3xl font-bold gradient-text block"
                      />
                      <p className="text-xs text-muted">items</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-5 text-sm text-accent group-hover:underline transition-colors">
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
        <h2 className="text-xl font-bold text-primary font-display mb-4">Quick Access</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Recent books */}
          {books.slice(0, 2).map((book) => (
            <Link key={book._id} to={`/books/${book._id}`} className="glass-card p-4 group border border-subtle hover:border-strong transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-subtle flex items-center justify-center flex-shrink-0">
                  <IoBookOutline className="text-accent" size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary truncate group-hover:text-accent transition-colors">{book.title}</p>
                  <p className="text-xs text-muted">{book.type} book</p>
                </div>
              </div>
            </Link>
          ))}

          {/* Recent courses */}
          {courses.slice(0, 2).map((course) => (
            <a key={course._id} href={course.driveLink} target="_blank" rel="noopener noreferrer" className="glass-card p-4 group border border-subtle hover:border-strong transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <IoSchoolOutline className="text-purple-400" size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary truncate group-hover:text-purple-300 transition-colors">{course.title}</p>
                  <p className="text-xs text-muted">{course.category?.name || 'Course'}</p>
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
