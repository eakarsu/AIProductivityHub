import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  FolderOpen, Plus, Sparkles, Trash2, Edit2, Search, File,
  FolderInput, Database, Upload, GripVertical, X, CheckCircle
} from 'lucide-react';
import Modal from '../components/Modal';
import AIResponseDisplay from '../components/AIResponseDisplay';
import Toast from '../components/Toast';
import {
  getFiles, createFile, updateFile, deleteFile,
  suggestFileOrganization, applyFileSuggestion, uploadFile
} from '../services/api';

function FileOrganizer() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    filename: '', filepath: '', extension: '', size_bytes: 0, current_folder: ''
  });

  useEffect(() => { fetchFiles(); }, []);

  const fetchFiles = async () => {
    try {
      const response = await getFiles();
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedFile(null);
    setFormData({ filename: '', filepath: '', extension: '', size_bytes: 0, current_folder: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (file) => {
    setSelectedFile(file);
    setFormData({
      filename: file.filename, filepath: file.filepath,
      extension: file.extension || '', size_bytes: file.size_bytes || 0,
      current_folder: file.current_folder || ''
    });
    setIsDetailOpen(false);
    setIsModalOpen(true);
  };

  const handleRowClick = (file) => {
    setSelectedFile(file);
    setAiResponse(null);
    setIsDetailOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, extension: formData.filename.split('.').pop() };
      if (selectedFile) {
        await updateFile(selectedFile.id, data);
      } else {
        await createFile(data);
      }
      setIsModalOpen(false);
      fetchFiles();
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this file entry?')) {
      try {
        await deleteFile(id);
        setIsDetailOpen(false);
        fetchFiles();
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  };

  const handleAISuggest = async (file) => {
    setAiLoading(true);
    try {
      const response = await suggestFileOrganization(file.id);
      setAiResponse(response.data.aiAnalysis);
      fetchFiles();
    } catch (error) {
      console.error('Error suggesting:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplySuggestion = async (file) => {
    try {
      await applyFileSuggestion(file.id);
      setIsDetailOpen(false);
      fetchFiles();
    } catch (error) {
      console.error('Error applying suggestion:', error);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // File Upload via drag & drop or file input
  const handleFileUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    let successCount = 0;
    for (const file of fileList) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        await uploadFile(fd);
        // Also create a file organizer entry
        await createFile({
          filename: file.name,
          filepath: `/uploads/${file.name}`,
          extension: file.name.split('.').pop(),
          size_bytes: file.size,
          current_folder: '/uploads'
        });
        successCount++;
      } catch (error) {
        console.error('Error uploading file:', file.name, error);
      }
    }
    setUploading(false);
    if (successCount > 0) {
      setToast({ message: `${successCount} file(s) uploaded successfully`, type: 'success' });
      fetchFiles();
    } else {
      setToast({ message: 'Upload failed', type: 'error' });
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileInput = (e) => {
    handleFileUpload(e.target.files);
    e.target.value = '';
  };

  // Drag & Drop reorder
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(filteredFiles);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setFiles(items);
  };

  const handleLoadSampleData = async () => {
    const sampleFiles = [
      { filename: 'quarterly_report.pdf', filepath: '/Users/demo/Downloads/quarterly_report.pdf', extension: 'pdf', size_bytes: 2450000, current_folder: '/Users/demo/Downloads' },
      { filename: 'vacation_photo.jpg', filepath: '/Users/demo/Desktop/vacation_photo.jpg', extension: 'jpg', size_bytes: 5200000, current_folder: '/Users/demo/Desktop' },
      { filename: 'budget_2025.xlsx', filepath: '/Users/demo/Downloads/budget_2025.xlsx', extension: 'xlsx', size_bytes: 180000, current_folder: '/Users/demo/Downloads' },
      { filename: 'app_component.tsx', filepath: '/Users/demo/Desktop/app_component.tsx', extension: 'tsx', size_bytes: 12000, current_folder: '/Users/demo/Desktop' },
      { filename: 'meeting_notes.docx', filepath: '/Users/demo/Documents/meeting_notes.docx', extension: 'docx', size_bytes: 45000, current_folder: '/Users/demo/Documents' },
      { filename: 'backup_data.zip', filepath: '/Users/demo/Downloads/backup_data.zip', extension: 'zip', size_bytes: 95000000, current_folder: '/Users/demo/Downloads' },
    ];
    try {
      for (const file of sampleFiles) { await createFile(file); }
      fetchFiles();
    } catch (error) {
      console.error('Error loading sample data:', error);
    }
  };

  const filteredFiles = files.filter(f =>
    f.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.current_folder?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FolderOpen size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            File Organizer
          </h1>
          <p className="page-subtitle">Smart folder suggestions powered by AI</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleLoadSampleData}>
            <Database size={18} /> Load Sample Data
          </button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={18} /> Upload Files
            <input type="file" multiple onChange={handleFileInput} style={{ display: 'none' }} />
          </label>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} /> Add File
          </button>
        </div>
      </div>

      {/* Upload Drop Zone */}
      <div
        className={`drop-zone ${dragOver ? 'active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: '0.75rem',
          padding: '2rem',
          textAlign: 'center',
          marginBottom: '1.5rem',
          background: dragOver ? 'rgba(99, 102, 241, 0.1)' : 'var(--card-bg)',
          transition: 'all 0.2s',
          cursor: 'pointer'
        }}
        onClick={() => document.getElementById('file-upload-input').click()}
      >
        <input id="file-upload-input" type="file" multiple onChange={handleFileInput} style={{ display: 'none' }} />
        {uploading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <div className="spinner" style={{ width: 20, height: 20 }}></div>
            <span>Uploading...</span>
          </div>
        ) : (
          <>
            <Upload size={32} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Drag & drop files here, or click to browse
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
              Max 10MB per file
            </p>
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={20} color="var(--text-muted)" />
          <input type="text" className="form-input" placeholder="Search files..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent' }} />
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : (
        <div className="card">
          <div className="table-container">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="files">
                {(provided) => (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 30 }}></th>
                        <th>Filename</th>
                        <th>Extension</th>
                        <th>Size</th>
                        <th>Current Folder</th>
                        <th>Suggested Folder</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody ref={provided.innerRef} {...provided.droppableProps}>
                      {filteredFiles.map((file, index) => (
                        <Draggable key={file.id} draggableId={String(file.id)} index={index}>
                          {(provided, snapshot) => (
                            <tr
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              onClick={() => handleRowClick(file)}
                              style={{
                                ...provided.draggableProps.style,
                                background: snapshot.isDragging ? 'var(--dark-lighter)' : undefined
                              }}
                            >
                              <td {...provided.dragHandleProps} onClick={(e) => e.stopPropagation()}
                                style={{ cursor: 'grab', padding: '0.5rem' }}>
                                <GripVertical size={16} color="var(--text-muted)" />
                              </td>
                              <td style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <File size={16} color="var(--primary)" />
                                {file.filename}
                              </td>
                              <td><span className="tag tag-primary">{file.extension || 'N/A'}</span></td>
                              <td style={{ color: 'var(--text-muted)' }}>{formatBytes(file.size_bytes)}</td>
                              <td style={{ color: 'var(--text-muted)' }}>{file.current_folder}</td>
                              <td>
                                {file.suggested_folder
                                  ? <span style={{ color: 'var(--success)' }}>{file.suggested_folder}</span>
                                  : <span style={{ color: 'var(--text-muted)' }}>Not analyzed</span>}
                              </td>
                              <td>
                                <span className={`tag ${file.status === 'organized' ? 'tag-success' : 'tag-warning'}`}>
                                  {file.status || 'pending'}
                                </span>
                              </td>
                            </tr>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </tbody>
                  </table>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={selectedFile ? 'Edit File' : 'Add File'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>{selectedFile ? 'Update' : 'Create'}</button>
        </>}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Filename</label>
            <input type="text" className="form-input" value={formData.filename}
              onChange={(e) => setFormData({ ...formData, filename: e.target.value })}
              placeholder="document.pdf" required />
          </div>
          <div className="form-group">
            <label className="form-label">File Path</label>
            <input type="text" className="form-input" value={formData.filepath}
              onChange={(e) => setFormData({ ...formData, filepath: e.target.value })}
              placeholder="/Users/name/Downloads/document.pdf" required />
          </div>
          <div className="form-group">
            <label className="form-label">Current Folder</label>
            <input type="text" className="form-input" value={formData.current_folder}
              onChange={(e) => setFormData({ ...formData, current_folder: e.target.value })}
              placeholder="/Users/name/Downloads" />
          </div>
          <div className="form-group">
            <label className="form-label">Size (bytes)</label>
            <input type="number" className="form-input" value={formData.size_bytes}
              onChange={(e) => setFormData({ ...formData, size_bytes: parseInt(e.target.value) || 0 })} />
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="File Details"
        footer={<>
          <button className="btn btn-danger" onClick={() => handleDelete(selectedFile?.id)}>
            <Trash2 size={16} /> Delete
          </button>
          <button className="btn btn-secondary" onClick={() => handleEdit(selectedFile)}>
            <Edit2 size={16} /> Edit
          </button>
          {selectedFile?.suggested_folder && selectedFile?.status !== 'organized' && (
            <button className="btn btn-success" onClick={() => handleApplySuggestion(selectedFile)}>
              <FolderInput size={16} /> Apply Suggestion
            </button>
          )}
          <button className="btn btn-primary" onClick={() => handleAISuggest(selectedFile)} disabled={aiLoading}>
            <Sparkles size={16} /> {aiLoading ? 'Analyzing...' : 'AI Suggest'}
          </button>
        </>}>
        {selectedFile && (
          <div>
            <div className="detail-panel">
              <div className="detail-row">
                <span className="detail-label">Filename</span>
                <span className="detail-value">{selectedFile.filename}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Extension</span>
                <span className="detail-value"><span className="tag tag-primary">{selectedFile.extension || 'N/A'}</span></span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Size</span>
                <span className="detail-value">{formatBytes(selectedFile.size_bytes)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Current Folder</span>
                <span className="detail-value">{selectedFile.current_folder}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Suggested Folder</span>
                <span className="detail-value" style={{ color: selectedFile.suggested_folder ? 'var(--success)' : 'var(--text-muted)' }}>
                  {selectedFile.suggested_folder || 'Not analyzed'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">AI Category</span>
                <span className="detail-value">
                  {selectedFile.ai_category ? <span className="tag tag-success">{selectedFile.ai_category}</span> : 'Not analyzed'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">AI Suggestion</span>
                <span className="detail-value">{selectedFile.ai_suggestion || 'Not analyzed'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value">
                  <span className={`tag ${selectedFile.status === 'organized' ? 'tag-success' : 'tag-warning'}`}>
                    {selectedFile.status || 'pending'}
                  </span>
                </span>
              </div>
            </div>
            {aiResponse && <AIResponseDisplay response={aiResponse} title="File Organization Suggestion" />}
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default FileOrganizer;
