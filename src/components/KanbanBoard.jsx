import { useState, useEffect } from 'react';
import { Columns3, Plus, Trash2, GripVertical, X, Clock } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import '../styles/Tools.css';

const defaultColumns = [
  { id: 'todo', title: 'To Do', color: '#60A5FA' },
  { id: 'doing', title: 'In Progress', color: '#F59E0B' },
  { id: 'done', title: 'Done', color: '#10B981' },
];

export default function KanbanBoard() {
  const [tasks, setTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kroma_kanban') || '[]'); } catch { return []; }
  });
  const [newTask, setNewTask] = useState('');
  const [newColumn, setNewColumn] = useState('todo');
  const [newPriority, setNewPriority] = useState('medium');
  const [draggedTask, setDraggedTask] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    localStorage.setItem('kroma_kanban', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks(prev => [...prev, {
      id: Date.now().toString(),
      title: newTask.trim(),
      column: newColumn,
      priority: newPriority,
      createdAt: new Date().toISOString(),
    }]);
    setNewTask('');
  };

  const moveTask = (taskId, targetColumn) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, column: targetColumn } : t
    ));
  };

  const deleteTask = (taskId) => {
    setConfirmState({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task?',
      onConfirm: () => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setConfirmState(null);
      }
    });
  };

  const handleDragStart = (task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (columnId) => {
    if (draggedTask) {
      moveTask(draggedTask.id, columnId);
      setDraggedTask(null);
    }
  };

  const priorityColors = {
    critical: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444', label: 'Critical' },
    high: { bg: 'rgba(249,115,22,0.12)', color: '#F97316', label: 'High' },
    medium: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: 'Medium' },
    low: { bg: 'rgba(16,185,129,0.12)', color: '#10B981', label: 'Low' },
  };

  return (
    <div className="tool-page page-enter">
      <div className="tool-header">
        <div className="tool-header-left">
          <Columns3 size={28} />
          <div>
            <h1 className="tool-title">Bug Kanban</h1>
            <p className="tool-subtitle">Track your testing progress with drag and drop</p>
          </div>
        </div>
      </div>

      {/* Add Task Form */}
      <div className="kanban-add-form">
        <input
          className="tool-input"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="e.g., Check for IDOR on /api/users/:id"
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          style={{ flex: 1 }}
        />
        <select className="settings-select" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="settings-select" value={newColumn} onChange={(e) => setNewColumn(e.target.value)}>
          {defaultColumns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <button className="btn btn-primary" onClick={addTask}>
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Kanban Columns */}
      <div className="kanban-board">
        {defaultColumns.map(col => {
          const colTasks = tasks.filter(t => t.column === col.id);
          return (
            <div
              key={col.id}
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.id)}
            >
              <div className="kanban-column-header" style={{ borderBottomColor: col.color }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.color }} />
                  <span>{col.title}</span>
                </div>
                <span className="kanban-count">{colTasks.length}</span>
              </div>
              <div className="kanban-cards">
                {colTasks.length === 0 && (
                  <div className="kanban-empty">Drop tasks here</div>
                )}
                {colTasks.map(task => {
                  const p = priorityColors[task.priority] || priorityColors.medium;
                  return (
                    <div
                      key={task.id}
                      className="kanban-card"
                      draggable
                      onDragStart={() => handleDragStart(task)}
                    >
                      <div className="kanban-card-top">
                        <GripVertical size={14} style={{ color: 'var(--text-muted)', cursor: 'grab', flexShrink: 0 }} />
                        <span className="kanban-card-title">{task.title}</span>
                        <button className="kanban-card-delete" onClick={() => deleteTask(task.id)}>
                          <X size={14} />
                        </button>
                      </div>
                      <div className="kanban-card-bottom">
                        <span className="analyzer-badge" style={{ background: p.bg, color: p.color, border: `1px solid ${p.color}30`, fontSize: '10px' }}>
                          {p.label}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={10} />
                          {new Date(task.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
