import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { IoBookOutline, IoVideocamOutline, IoDocumentTextOutline, IoMusicalNotesOutline, IoAdd, IoCloudDownloadOutline, IoGlobeOutline } from 'react-icons/io5';
import { fetchBooks, deleteBook } from '../redux/slices/bookSlice';
import { requestPublish } from '../redux/slices/exploreSlice';
import { toggleVisibility } from '../redux/slices/adminSlice';
import api from '../utils/api';
import ResourceCard from '../components/ui/ResourceCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import CommentsModal from '../components/ui/CommentsModal';
import InlineComments from '../components/ui/InlineComments';
import BookForm from '../components/forms/BookForm';
import ImportBookModal from '../components/forms/ImportBookModal';
import toast from 'react-hot-toast';

const BooksPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [deleteBookId, setDeleteBookId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { books, isLoading } = useSelector((state) => state.books);
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    dispatch(fetchBooks());
  }, [dispatch]);

  const tabs = [
    { key: 'all', label: 'All', icon: <IoBookOutline size={16} /> },
    { key: 'video', label: 'Video Books', icon: <IoVideocamOutline size={16} /> },
    { key: 'text', label: 'Text Books', icon: <IoDocumentTextOutline size={16} /> },
    { key: 'audio', label: 'Audio Books', icon: <IoMusicalNotesOutline size={16} /> },
  ];

  const filteredBooks = activeTab === 'all' ? books : books.filter((b) => b.type === activeTab);

  const handleDelete = (bookId) => {
    setDeleteBookId(bookId);
  };

  const confirmDeleteBook = async () => {
    if (!deleteBookId) return;
    setIsDeleting(true);
    const result = await dispatch(deleteBook(deleteBookId));
    setIsDeleting(false);
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Book deleted');
      setDeleteBookId(null);
    } else {
      toast.error(result.payload || 'Failed to delete book');
    }
  };

  const handleEdit = (book) => {
    setEditBook(book);
    setShowForm(true);
  };

  const openComments = (book) => {
    setActiveCommentId((prev) => (prev === book._id ? null : book._id));
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditBook(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Books</h1>
          <p className="text-slate-400 text-sm mt-1">Your video and text book library</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-2">
            <IoCloudDownloadOutline size={18} /> Import from Drive
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <IoAdd size={18} /> Add Book
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-indigo-500/15 text-indigo-400 shadow-lg shadow-indigo-500/5'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Books Grid */}
      {isLoading ? (
        <LoadingSpinner text="Loading books..." />
      ) : filteredBooks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <IoBookOutline className="mx-auto text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-400 mb-2">No books yet</h3>
          <p className="text-sm text-slate-500">
            {activeTab === 'audio'
              ? 'Audio books section coming soon!'
              : isAdmin
              ? 'Click "Add New Book" to get started'
              : 'Check back soon for new content'}
          </p>
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredBooks.map((book) => (
              <ResourceCard
                key={book._id}
                title={book.title}
                subtitle={book.author}
                image={book.coverImage}
                description={book.type === 'video' ? `${book.videos?.length || 0} videos` : book.type === 'text' ? 'PDF Book' : 'Audio'}
                isAdmin={isAdmin}
                ownerId={book.addedBy}
                visibility={book.visibility}
                onEdit={() => handleEdit(book)}
                onDelete={() => handleDelete(book._id)}
                onClick={() => navigate(`/books/${book._id}`)}
                onComment={() => openComments(book)}
                commentCount={book.commentCount}
                commentSection={
                  activeCommentId === book._id ? (
                    <InlineComments
                      contentType="book"
                      contentId={book._id}
                      onClose={() => setActiveCommentId(null)}
                    />
                  ) : null
                }
                onRequestPublish={async () => {
                  const result = await dispatch(requestPublish({ contentType: 'book', contentId: book._id }));
                  if (result.meta.requestStatus === 'fulfilled') {
                    toast.success('Publish request sent!');
                    dispatch(fetchBooks());
                  } else {
                    toast.error(result.payload || 'Failed to request publish');
                  }
                }}
                onToggleVisibility={isAdmin ? async () => {
                  const newVis = book.visibility === 'public' ? 'private' : 'public';
                  const result = await dispatch(toggleVisibility({ contentType: 'book', contentId: book._id, visibility: newVis }));
                  if (result.meta.requestStatus === 'fulfilled') {
                    toast.success(`Book set to ${newVis}`);
                    dispatch(fetchBooks());
                  }
                } : undefined}
                onMakePrivate={async () => {
                  try {
                    await api.put('/content/toggle-visibility', { contentType: 'book', contentId: book._id, visibility: 'private' });
                    toast.success('Book set to private');
                    dispatch(fetchBooks());
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to update');
                  }
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Book Modal */}
      <Modal
        isOpen={showForm}
        onClose={handleFormClose}
        title={editBook ? 'Edit Book' : 'Add New Book'}
        maxWidth="max-w-2xl"
      >
        <BookForm book={editBook} onClose={handleFormClose} />
      </Modal>

      {/* Import from Drive Modal */}
      <ImportBookModal isOpen={showImport} onClose={() => setShowImport(false)} />

      <ConfirmDialog
        isOpen={!!deleteBookId}
        title="Delete Book"
        message="Are you sure you want to delete this book? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDeleteBook}
        onCancel={() => setDeleteBookId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default BooksPage;
