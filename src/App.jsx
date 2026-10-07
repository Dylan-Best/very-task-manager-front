import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { taskService } from './services/api';
import './App.css';

/* ---------- Icônes (SVG inline, aucune dépendance) ---------- */
const Icon = ({ name, size = 18 }) => {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    edit: <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />,
    trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />,
    check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
    search: <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />,
    layers: <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" />,
    clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" />,
    done: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l3 3 5-6" />,
    close: <path d="M6 6l12 12M18 6L6 18" />,
    alert: <path d="M12 9v4M12 17h.01M10.3 4l-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0z" />,
    calendar: <path d="M4 8h16M7 3v3M17 3v3M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
};

const Logo = () => (
  <div className="logo">
    <span className="logo-mark" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
    <span className="logo-text">
      Very<strong>Task</strong>
    </span>
  </div>
);

const EMPTY_FORM = { title: '', description: '' };

const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [toasts, setToasts] = useState([]);
  const titleRef = useRef(null);

  /* ---------- Notifications ---------- */
  const notify = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  /* ---------- Données ---------- */
  const loadTasks = useCallback(async () => {
    try {
      const response = await taskService.getAll();
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
      notify('Impossible de charger les tâches. Vérifiez que le serveur est lancé.', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  /* ---------- Modale du formulaire ---------- */
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const handleEdit = (task) => {
    setFormData({ title: task.title, description: task.description || '' });
    setEditingId(task.id);
    setIsFormOpen(true);
  };

  useEffect(() => {
    if (isFormOpen) setTimeout(() => titleRef.current?.focus(), 50);
  }, [isFormOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (taskToDelete) setTaskToDelete(null);
      else if (isFormOpen) closeForm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFormOpen, taskToDelete]);

  /* ---------- Actions ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await taskService.update(editingId, formData);
        notify('Tâche mise à jour avec succès');
      } else {
        await taskService.create(formData);
        notify('Tâche ajoutée avec succès');
      }
      closeForm();
      loadTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      notify("Échec de l'enregistrement. Réessayez.", 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await taskService.delete(taskToDelete.id);
      notify('Tâche supprimée');
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      notify('Échec de la suppression. Réessayez.', 'error');
    } finally {
      setTaskToDelete(null);
    }
  };

  const toggleComplete = async (task) => {
    try {
      await taskService.update(task.id, { ...task, is_completed: !task.is_completed });
      notify(task.is_completed ? 'Tâche remise à faire' : 'Tâche terminée');
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      notify('Échec de la mise à jour. Réessayez.', 'error');
    }
  };

  /* ---------- Dérivés ---------- */
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.is_completed).length;
    const todayStr = new Date().toDateString();
    const doneToday = tasks.filter(
      (t) => t.completed_at && new Date(t.completed_at).toDateString() === todayStr
    ).length;

    return {
      total,
      done,
      doneToday,
      todo: total - done,
      rate: total ? Math.round((done / total) * 100) : 0,
    };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (filter === 'todo' && t.is_completed) return false;
      if (filter === 'done' && !t.is_completed) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    });
  }, [tasks, filter, search]);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const navItems = [
    { key: 'all', label: 'Toutes les tâches', icon: 'layers', count: stats.total },
    { key: 'todo', label: 'À faire', icon: 'clock', count: stats.todo },
    { key: 'done', label: 'Terminées', icon: 'done', count: stats.done },
  ];

  const emptyMessage = () => {
    if (search) return { title: 'Aucun résultat', text: `Rien ne correspond à « ${search} ».` };
    if (filter === 'done') return { title: 'Aucune tâche terminée', text: 'Terminez une tâche pour la voir apparaître ici.' };
    if (filter === 'todo') return { title: 'Tout est fait', text: 'Vous n’avez plus rien à faire. Profitez-en !' };
    return { title: 'Aucune tâche pour le moment', text: 'Créez votre première tâche pour démarrer.' };
  };

  return (
    <div className="app">
      {/* ---------- Header ---------- */}
      <header className="topbar">
        <Logo />
        <div className="search">
          <Icon name="search" size={16} />
          <input
            type="search"
            placeholder="Rechercher une tâche…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher une tâche"
          />
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Icon name="plus" size={16} />
          <span>Nouvelle tâche</span>
        </button>
      </header>

      <div className="layout">
        {/* ---------- Sidebar ---------- */}
        <aside className="sidebar">
          <nav aria-label="Filtres">
            <p className="sidebar-title">Mes tâches</p>
            <ul>
              {navItems.map((item) => (
                <li key={item.key}>
                  <button
                    className={`nav-item ${filter === item.key ? 'active' : ''}`}
                    onClick={() => setFilter(item.key)}
                    aria-current={filter === item.key ? 'page' : undefined}
                  >
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                    <span className="nav-count">{item.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="sidebar-progress">
            <div className="progress-head">
              <span>Progression</span>
              <strong>{stats.rate}%</strong>
            </div>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${stats.rate}%` }} />
            </div>
            <p>
              {stats.done} sur {stats.total} tâche{stats.total > 1 ? 's' : ''} terminée
              {stats.done > 1 ? 's' : ''}
            </p>
          </div>
        </aside>

        {/* ---------- Zone principale ---------- */}
        <main className="main">
          <section className="hero">
            <p className="hero-date">{today}</p>
            <h1>Organisez votre journée, avancez sans friction.</h1>
            <p className="hero-sub">
              Suivez vos tâches, repérez ce qui reste à faire et gardez le cap.
            </p>
          </section>

          <section className="stats" aria-label="Statistiques">
            <article className="stat-card">
              <span className="stat-label">Total</span>
              <span className="stat-value">{stats.total}</span>
            </article>
            <article className="stat-card">
              <span className="stat-label">À faire</span>
              <span className="stat-value">{stats.todo}</span>
            </article>
            <article className="stat-card">
                <span className="stat-label">Terminées aujourd'hui</span>
                <span className="stat-value stat-success">{stats.doneToday}</span>
            </article>
            <article className="stat-card stat-dark">
              <span className="stat-label">Taux de complétion</span>
              <span className="stat-value">{stats.rate}%</span>
            </article>
          </section>

          <section className="tasks-section">
            <div className="section-head">
              <h2>
                {filter === 'all' ? 'Toutes les tâches' : filter === 'todo' ? 'À faire' : 'Terminées'}
              </h2>
              <span className="section-count">
                {visibleTasks.length} résultat{visibleTasks.length > 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="tasks-list">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="task-card skeleton" />
                ))}
              </div>
            ) : visibleTasks.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">
                  <Icon name="check" size={26} />
                </div>
                <h3>{emptyMessage().title}</h3>
                <p>{emptyMessage().text}</p>
                {!search && filter === 'all' && (
                  <button className="btn btn-primary" onClick={openCreate}>
                    <Icon name="plus" size={16} />
                    <span>Créer une tâche</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="tasks-list">
                {visibleTasks.map((task) => {
                  const date = formatDate(task.created_at || task.createdAt);
                  return (
                    <article
                      key={task.id}
                      className={`task-card ${task.is_completed ? 'completed' : ''}`}
                    >
                      <button
                        className={`check ${task.is_completed ? 'checked' : ''}`}
                        onClick={() => toggleComplete(task)}
                        aria-label={
                          task.is_completed ? 'Marquer comme à faire' : 'Marquer comme terminée'
                        }
                        aria-pressed={task.is_completed}
                      >
                        {task.is_completed && <Icon name="check" size={14} />}
                      </button>

                      <div className="task-body">
                        <div className="task-top">
                          <h3>{task.title}</h3>
                          <span className={`badge ${task.is_completed ? 'badge-done' : 'badge-todo'}`}>
                            {task.is_completed ? 'Terminée' : 'À faire'}
                          </span>
                        </div>
                        {task.description && <p className="task-desc">{task.description}</p>}
                        {date && (
                          <span className="task-date">
                            <Icon name="calendar" size={14} />
                            {date}
                          </span>
                        )}
                      </div>

                      <div className="task-actions">
                        <button
                          className="icon-btn"
                          onClick={() => handleEdit(task)}
                          aria-label={`Modifier ${task.title}`}
                          title="Modifier"
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          className="icon-btn danger"
                          onClick={() => setTaskToDelete(task)}
                          aria-label={`Supprimer ${task.title}`}
                          title="Supprimer"
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ---------- Modale formulaire ---------- */}
      {isFormOpen && (
        <div className="overlay" onMouseDown={closeForm}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2 id="form-title">{editingId ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2>
                <p>
                  {editingId
                    ? 'Mettez à jour les informations de cette tâche.'
                    : 'Décrivez ce que vous voulez accomplir.'}
                </p>
              </div>
              <button className="icon-btn" onClick={closeForm} aria-label="Fermer">
                <Icon name="close" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="task-form">
              <label className="field">
                <span>Titre</span>
                <input
                  ref={titleRef}
                  type="text"
                  placeholder="Ex. Préparer la soutenance"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span>
                  Description <em>(optionnelle)</em>
                </span>
                <textarea
                  placeholder="Ajoutez des détails utiles…"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeForm}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Créer la tâche'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Modale de confirmation de suppression ---------- */}
      {taskToDelete && (
        <div className="overlay" onMouseDown={() => setTaskToDelete(null)}>
          <div
            className="modal modal-sm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="confirm-icon">
              <Icon name="alert" size={24} />
            </div>
            <h2 id="delete-title">Supprimer cette tâche ?</h2>
            <p className="confirm-text">
              « {taskToDelete.title} » sera définitivement supprimée. Cette action est irréversible.
            </p>
            <div className="modal-actions modal-actions-center">
              <button className="btn btn-ghost" onClick={() => setTaskToDelete(null)}>
                Annuler
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Notifications (haut droite) ---------- */}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="status">
            <span className="toast-icon">
              <Icon name={t.type === 'error' ? 'alert' : 'check'} size={16} />
            </span>
            <span className="toast-msg">{t.message}</span>
            <button className="toast-close" onClick={() => dismissToast(t.id)} aria-label="Fermer">
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;