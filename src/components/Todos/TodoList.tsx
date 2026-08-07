import React, { useMemo, useState } from 'react';
import { CheckSquare, Circle, ListTodo, Plus, Square, Trash2 } from 'lucide-react';
import { TodoItem } from '../../types';

interface TodoListProps {
  todos: TodoItem[];
  onAdd: (title: string) => Promise<void> | void;
  onToggle: (id: string, done: boolean) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export const TodoList: React.FC<TodoListProps> = ({ todos, onAdd, onToggle, onDelete }) => {
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const open = todos.filter((t) => !t.done).length;
    const done = todos.length - open;
    return { open, done, total: todos.length };
  }, [todos]);

  const visible = useMemo(() => {
    if (filter === 'open') return todos.filter((t) => !t.done);
    if (filter === 'done') return todos.filter((t) => t.done);
    return todos;
  }, [todos, filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title || saving) return;
    setSaving(true);
    try {
      await onAdd(title);
      setDraft('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card p-5">
        <div>
          <p className="page-kicker mb-1.5">
            <ListTodo className="w-3 h-3" />
            Organisation
          </p>
          <h2 className="text-xl font-extrabold text-slate-900 font-display tracking-tight">
            Todolist ({stats.total})
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {stats.open} à faire · {stats.done} terminée{stats.done > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="glass-card p-4 sm:p-5 flex flex-col sm:flex-row gap-3"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ajouter une tâche… (ex. Relancer client Diallo)"
          className="glass-input flex-1 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400"
          maxLength={200}
        />
        <button
          type="submit"
          disabled={!draft.trim() || saving}
          className="hover-press app-btn-primary px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </form>

      <div className="glass-segment">
        {(
          [
            { id: 'all', label: 'Toutes' },
            { id: 'open', label: 'À faire' },
            { id: 'done', label: 'Terminées' },
          ] as const
        ).map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={`glass-segment-btn ${filter === chip.id ? 'is-active' : ''}`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="glass-card border border-dashed border-white/40 px-6 py-14 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-mist text-brand-mid flex items-center justify-center mb-3">
            <CheckSquare className="w-6 h-6" />
          </div>
          <p className="font-display font-bold text-slate-800">
            {filter === 'done'
              ? 'Aucune tâche terminée'
              : filter === 'open'
                ? 'Rien à faire pour le moment'
                : 'Votre liste est vide'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Ajoutez vos relances clients, devis à envoyer ou paiements à suivre.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((todo) => (
            <li
              key={todo.id}
              className="hover-lift group glass-card px-3 sm:px-4 py-3 flex items-center gap-3"
            >
              <button
                type="button"
                onClick={() => void onToggle(todo.id, !todo.done)}
                className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
                  todo.done
                    ? 'bg-brand-mid/15 text-brand-mid'
                    : 'bg-slate-50 text-slate-400 hover:text-brand-mid hover:bg-brand-mist'
                }`}
                title={todo.done ? 'Marquer à faire' : 'Marquer terminée'}
                aria-label={todo.done ? 'Marquer à faire' : 'Marquer terminée'}
              >
                {todo.done ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold leading-snug ${
                    todo.done ? 'text-slate-400 line-through' : 'text-slate-800'
                  }`}
                >
                  {todo.title}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                  {todo.done ? (
                    <>
                      <Circle className="w-2.5 h-2.5 fill-brand-mid text-brand-mid" />
                      Terminée
                    </>
                  ) : (
                    'À faire'
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void onDelete(todo.id)}
                className="hover-press shrink-0 p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                title="Supprimer"
                aria-label="Supprimer la tâche"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
