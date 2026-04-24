import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Plus,
  Sparkles,
  Trash2,
  Edit2,
  ExternalLink,
  X,
  Search,
  Database
} from 'lucide-react';
import Modal from '../components/Modal';
import AIResponseDisplay from '../components/AIResponseDisplay';
import {
  getBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
  categorizeBookmark
} from '../services/api';

function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookmark, setSelectedBookmark] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    category: '',
    tags: []
  });

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const response = await getBookmarks();
      setBookmarks(response.data);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedBookmark(null);
    setFormData({ title: '', url: '', description: '', category: '', tags: [] });
    setIsModalOpen(true);
  };

  const handleEdit = (bookmark) => {
    setSelectedBookmark(bookmark);
    setFormData({
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description || '',
      category: bookmark.category || '',
      tags: bookmark.tags || []
    });
    setIsDetailOpen(false);
    setIsModalOpen(true);
  };

  const handleRowClick = (bookmark) => {
    setSelectedBookmark(bookmark);
    setAiResponse(null);
    setIsDetailOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedBookmark) {
        await updateBookmark(selectedBookmark.id, formData);
      } else {
        await createBookmark(formData);
      }
      setIsModalOpen(false);
      fetchBookmarks();
    } catch (error) {
      console.error('Error saving bookmark:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this bookmark?')) {
      try {
        await deleteBookmark(id);
        setIsDetailOpen(false);
        fetchBookmarks();
      } catch (error) {
        console.error('Error deleting bookmark:', error);
      }
    }
  };

  const handleAICategorize = async (bookmark) => {
    setAiLoading(true);
    try {
      const response = await categorizeBookmark(bookmark.id);
      setAiResponse(response.data.aiAnalysis);
      fetchBookmarks();
    } catch (error) {
      console.error('Error categorizing:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleLoadSampleData = async () => {
    const sampleBookmarks = [
      { title: 'React Documentation', url: 'https://react.dev', description: 'Official React documentation and tutorials', category: 'Technology', tags: ['react', 'javascript', 'frontend'] },
      { title: 'GitHub', url: 'https://github.com', description: 'Code hosting platform for version control', category: 'Technology', tags: ['git', 'code', 'opensource'] },
      { title: 'CNN News', url: 'https://cnn.com', description: 'Latest news and breaking stories', category: 'News', tags: ['news', 'media', 'current-events'] },
      { title: 'Spotify', url: 'https://spotify.com', description: 'Music streaming service', category: 'Entertainment', tags: ['music', 'streaming', 'playlist'] },
      { title: 'Khan Academy', url: 'https://khanacademy.org', description: 'Free online courses and lessons', category: 'Education', tags: ['learning', 'courses', 'free'] },
      { title: 'Amazon', url: 'https://amazon.com', description: 'Online shopping marketplace', category: 'Shopping', tags: ['shopping', 'ecommerce', 'delivery'] },
    ];
    try {
      for (const bookmark of sampleBookmarks) {
        await createBookmark(bookmark);
      }
      fetchBookmarks();
    } catch (error) {
      console.error('Error loading sample data:', error);
    }
  };

  const filteredBookmarks = bookmarks.filter(b =>
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.category && b.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const categories = ['Technology', 'News', 'Social', 'Entertainment', 'Shopping', 'Education', 'Finance', 'Health', 'Travel', 'Food', 'Sports', 'Business', 'Other'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Bookmark size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Bookmark Organizer
          </h1>
          <p className="page-subtitle">Auto-categorize and organize your bookmarks with AI</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleLoadSampleData}>
            <Database size={18} />
            Load Sample Data
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} />
            Add Bookmark
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={20} color="var(--text-muted)" />
          <input
            type="text"
            className="form-input"
            placeholder="Search bookmarks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>URL</th>
                  <th>Category</th>
                  <th>AI Category</th>
                  <th>Tags</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookmarks.map((bookmark) => (
                  <tr key={bookmark.id} onClick={() => handleRowClick(bookmark)}>
                    <td style={{ fontWeight: 500 }}>{bookmark.title}</td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {bookmark.url}
                    </td>
                    <td>
                      {bookmark.category && (
                        <span className="tag tag-primary">{bookmark.category}</span>
                      )}
                    </td>
                    <td>
                      {bookmark.ai_category && (
                        <span className="tag tag-success">{bookmark.ai_category}</span>
                      )}
                    </td>
                    <td>
                      {bookmark.tags?.slice(0, 2).map((tag, i) => (
                        <span key={i} className="tag tag-primary">{tag}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedBookmark ? 'Edit Bookmark' : 'Add Bookmark'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              {selectedBookmark ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">URL</label>
            <input
              type="url"
              className="form-input"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-input"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Bookmark Details"
        footer={
          <>
            <button className="btn btn-danger" onClick={() => handleDelete(selectedBookmark?.id)}>
              <Trash2 size={16} />
              Delete
            </button>
            <button className="btn btn-secondary" onClick={() => handleEdit(selectedBookmark)}>
              <Edit2 size={16} />
              Edit
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleAICategorize(selectedBookmark)}
              disabled={aiLoading}
            >
              <Sparkles size={16} />
              {aiLoading ? 'Analyzing...' : 'AI Categorize'}
            </button>
          </>
        }
      >
        {selectedBookmark && (
          <div>
            <div className="detail-panel">
              <div className="detail-row">
                <span className="detail-label">Title</span>
                <span className="detail-value">{selectedBookmark.title}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">URL</span>
                <a
                  href={selectedBookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  {selectedBookmark.url.substring(0, 40)}...
                  <ExternalLink size={14} />
                </a>
              </div>
              <div className="detail-row">
                <span className="detail-label">Description</span>
                <span className="detail-value">{selectedBookmark.description || 'No description'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Category</span>
                <span className="detail-value">
                  {selectedBookmark.category ? (
                    <span className="tag tag-primary">{selectedBookmark.category}</span>
                  ) : 'Not set'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">AI Category</span>
                <span className="detail-value">
                  {selectedBookmark.ai_category ? (
                    <span className="tag tag-success">{selectedBookmark.ai_category}</span>
                  ) : 'Not analyzed'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">AI Summary</span>
                <span className="detail-value">{selectedBookmark.ai_summary || 'Not analyzed'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tags</span>
                <span className="detail-value">
                  {selectedBookmark.tags?.map((tag, i) => (
                    <span key={i} className="tag tag-primary">{tag}</span>
                  )) || 'No tags'}
                </span>
              </div>
            </div>

            {aiResponse && (
              <AIResponseDisplay response={aiResponse} title="Bookmark Categorization" />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Bookmarks;
