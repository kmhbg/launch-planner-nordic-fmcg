import React from 'react';
import { Activity, User, TaskStatus } from '../types';
import { formatDate, formatWeekYear } from '../utils/timeline';
import './TaskList.css';

interface TaskListProps {
  activities: Activity[];
  users: User[];
  selectedActivityId: string | null;
  onSelectActivity: (id: string | null) => void;
  onStatusChange: (activityId: string, status: TaskStatus) => void;
  onAssigneeChange: (activityId: string, assigneeId: string) => void;
  onExportICS: (activityId: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  activities,
  users,
  selectedActivityId,
  onSelectActivity,
  onStatusChange,
  onAssigneeChange,
  onExportICS,
}) => {
  const sortedActivities = [...activities].sort((a, b) => a.deadlineWeek - b.deadlineWeek);

  const statusColors = {
    not_started: 'var(--color-text-tertiary)',
    in_progress: 'var(--color-warning)',
    completed: 'var(--color-success)',
  };

  return (
    <div className="task-list">
      {sortedActivities.map((activity) => {
        const isSelected = selectedActivityId === activity.id;
        const isOverdue = new Date(activity.deadline) < new Date() && activity.status !== 'completed';

        return (
          <div
            key={activity.id}
            className={`task-item ${isSelected ? 'selected' : ''} ${isOverdue ? 'overdue' : ''}`}
            onClick={() => onSelectActivity(isSelected ? null : activity.id)}
          >
            <div className="task-header">
              <div className="task-main">
                <div className="task-title-row">
                  <h4 className="task-title">{activity.name}</h4>
                  <select
                    className="task-status-select"
                    value={activity.status}
                    onChange={(e) => {
                      e.stopPropagation();
                      onStatusChange(activity.id, e.target.value as TaskStatus);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      backgroundColor: statusColors[activity.status] + '20',
                      color: statusColors[activity.status],
                      border: `1px solid ${statusColors[activity.status]}`,
                    }}
                  >
                    <option value="not_started">Ej påbörjad</option>
                    <option value="in_progress">Pågående</option>
                    <option value="completed">Klart</option>
                  </select>
                </div>
                {activity.description && (
                  <p className="task-description">{activity.description}</p>
                )}
              </div>
            </div>

            <div className="task-details">
              <div className="task-meta">
                <div className="task-meta-item">
                  <span className="meta-label">Deadline:</span>
                  <span className="meta-value">
                    {formatDate(activity.deadline)} ({formatWeekYear(activity.deadline.getFullYear(), activity.deadlineWeek)})
                  </span>
                </div>
                <div className="task-meta-item">
                  <span className="meta-label">Kategori:</span>
                  <span className="meta-value">{activity.category}</span>
                </div>
                {activity.assigneeName && (
                  <div className="task-meta-item">
                    <span className="meta-label">Ansvarig:</span>
                    <span className="meta-value">{activity.assigneeName}</span>
                  </div>
                )}
              </div>

              {isSelected && (
                <div className="task-expanded">
                  <div className="task-assignee">
                    <label>Tilldela ansvarig:</label>
                    <select
                      value={activity.assigneeId || ''}
                      onChange={(e) => onAssigneeChange(activity.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">Välj ansvarig</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {activity.comments.length > 0 && (
                    <div className="task-comments">
                      <h5>Kommentarer</h5>
                      {activity.comments.map((comment) => (
                        <div key={comment.id} className="comment">
                          <div className="comment-header">
                            <span className="comment-author">{comment.userName}</span>
                            <span className="comment-time">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <p className="comment-text">{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="task-actions">
                    <button
                      className="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExportICS(activity.id);
                      }}
                    >
                      Exportera till kalender
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

