import { useState, useEffect } from 'react';
import { taskService } from './services/api';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await taskService.getAll();
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await taskService.update(editingId, formData);
      } else {
        await taskService.create(formData);
      }
      setFormData({ title: '', description: '' });
      setEditingId(null);
      loadTasks();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleEdit = (task) => {
    setFormData({
      title: task.title,
      description: task.description || '',
    });
    setEditingId(task.id);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await taskService.delete(id);
        loadTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const toggleComplete = async (task) => {
    try {
      await taskService.update(task.id, {
        ...task,
        is_completed: !task.is_completed,
      });
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  return (
    <div className="container">
      <h1>Very Task Manager</h1>

      <form onSubmit={handleSubmit} className="task-form">
        <input
          type="text"
          placeholder="Task title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
        <textarea
          placeholder="Description (optional)"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        <button type="submit">
          {editingId ? 'Update' : 'Create'} Task
        </button>
        {editingId && (
          <button type="button" onClick={() => {
            setEditingId(null);
            setFormData({ title: '', description: '' });
          }}>
            Cancel
          </button>
        )}
      </form>

      <div className="tasks-list">
        {tasks.map((task) => (
          <div key={task.id} className={`task-card ${task.is_completed ? 'completed' : ''}`}>
            <div className="task-content">
              <input
                type="checkbox"
                checked={task.is_completed}
                onChange={() => toggleComplete(task)}
              />
              <div>
                <h3>{task.title}</h3>
                {task.description && <p>{task.description}</p>}
              </div>
            </div>
            <div className="task-actions">
              <button onClick={() => handleEdit(task)}>Edit</button>
              <button onClick={() => handleDelete(task.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;