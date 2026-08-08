import React, { useMemo } from 'react';
import { ArrowRight, CheckSquare, ListTodo, Square } from 'lucide-react';
import { TodoItem } from '../../types';

const MAX_VISIBLE = 5;

interface UpcomingTodosCardProps {
  todos: TodoItem[];
  onOpenTodos: () => void;
  onToggle?: (id: string, done: boolean) => Promise<void> | void;
}

export const UpcomingTodosCard: React.FC<UpcomingTodosCardProps> = ({
  todos,
  onOpenTodos,
  onToggle,
}) => {
  const upcoming = useMemo(
    () =>
      todos
        .filter((t) => !t.done)
        .sort((a, b) => {
          if (a.position !== b.position) return a.position - b.position;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        })
        .slice(0, MAX_VISIBLE),
    [todos],
  );

  const openCount = todos.filter((t) => !t.done).length;
  const remaining = Math.max(0, openCount - upcoming.length);

  return (
    <section className="hover-glow glass-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-white/10">
        <div className="min-w-0">
          <p className="page-kicker mb-1">
            <ListTodo className="w-3 h-3" />
            Todolist
          </p>
          <h3 className="font-display text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
            Prochaines tâches
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {openCount === 0
              ? 'Aucune tâche en attente'
              : `${openCount} à faire${remaining > 0 ? ` · ${remaining} de plus dans Todolist` : ''}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenTodos}
          className="hover-press shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-brand-ink/80 hover:bg-brand-deep text-brand-sand border border-white/10 cursor-pointer"
        >
          Voir tout
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {upcoming.length === 0 ? (
        <button
          type="button"
          onClick={onOpenTodos}
          className="w-full text-left px-4 sm:px-5 py-6 cursor-pointer hover:bg-white/[0.03] transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="icon-well shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Rien à faire pour le moment</p>
              <p className="text-xs text-slate-500 mt-1">
                Ajoutez une tâche dans Todolist — elle apparaîtra ici.
              </p>
            </div>
          </div>
        </button>
      ) : (
        <ul className="divide-y divide-white/10">
          {upcoming.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center gap-2.5 px-4 sm:px-5 py-2.5 hover:bg-white/[0.03] transition-colors"
            >
              {onToggle ? (
                <button
                  type="button"
                  onClick={() => void onToggle(todo.id, true)}
                  className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 text-slate-400 hover:text-brand-glow hover:bg-brand-mist/20 cursor-pointer touch-manipulation"
                  title="Marquer terminée"
                  aria-label={`Terminer : ${todo.title}`}
                >
                  <Square className="w-4 h-4" />
                </button>
              ) : (
                <span className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 text-slate-400">
                  <Square className="w-4 h-4" />
                </span>
              )}
              <p className="min-w-0 flex-1 text-sm font-semibold text-slate-800 truncate">
                {todo.title}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
