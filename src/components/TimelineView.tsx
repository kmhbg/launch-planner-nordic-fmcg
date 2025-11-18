import React, { useState, useMemo } from 'react';
import { useStore } from '../store/store';
import { formatDate, formatWeekYear } from '../utils/timeline';
import './TimelineView.css';

export const TimelineView: React.FC = () => {
  const { products, setSelectedProduct, setViewMode, updateActivity, users } = useStore();
  
  const [filterWeek, setFilterWeek] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'week' | 'date' | 'assignee'>('week');

  // Samla alla aktiviteter från alla produkter
  const allActivities = useMemo(() => {
    return products.flatMap((product) =>
      product.activities.map((activity) => ({
        ...activity,
        productName: product.name,
        productId: product.id,
        launchWeek: product.launchWeek,
        launchYear: product.launchYear,
      }))
    );
  }, [products]);

  // Filtrera aktiviteter
  const filteredActivities = useMemo(() => {
    let filtered = [...allActivities];

    // Filtrera på vecka
    if (filterWeek !== 'all') {
      const [year, week] = filterWeek.split('-W');
      filtered = filtered.filter(activity => {
        const activityYear = activity.deadline.getFullYear();
        const activityWeek = activity.deadlineWeek;
        return activityYear === parseInt(year) && activityWeek === parseInt(week);
      });
    }

    // Filtrera på datum
    if (filterDate) {
      const filterDateObj = new Date(filterDate);
      filtered = filtered.filter(activity => {
        const activityDate = new Date(activity.deadline);
        return activityDate.toDateString() === filterDateObj.toDateString();
      });
    }

    // Filtrera på ansvarig
    if (filterAssignee !== 'all') {
      if (filterAssignee === 'unassigned') {
        filtered = filtered.filter(activity => !activity.assigneeId);
      } else {
        filtered = filtered.filter(activity => activity.assigneeId === filterAssignee);
      }
    }

    return filtered;
  }, [allActivities, filterWeek, filterDate, filterAssignee]);

  // Sortera aktiviteter
  const sortedActivities = useMemo(() => {
    const sorted = [...filteredActivities];

    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
        break;
      case 'assignee':
        sorted.sort((a, b) => {
          const aName = a.assigneeName || 'Ej tilldelad';
          const bName = b.assigneeName || 'Ej tilldelad';
          return aName.localeCompare(bName);
        });
        break;
      case 'week':
      default:
        sorted.sort((a, b) => {
          const aYear = a.deadline.getFullYear();
          const bYear = b.deadline.getFullYear();
          if (aYear !== bYear) return aYear - bYear;
          return a.deadlineWeek - b.deadlineWeek;
        });
        break;
    }

    return sorted;
  }, [filteredActivities, sortBy]);

  // Gruppera efter vecka (efter sortering)
  const activitiesByWeek = useMemo(() => {
    return sortedActivities.reduce((acc, activity) => {
      const weekKey = `${activity.deadline.getFullYear()}-W${activity.deadlineWeek}`;
      if (!acc[weekKey]) {
        acc[weekKey] = [];
      }
      acc[weekKey].push(activity);
      return acc;
    }, {} as Record<string, typeof sortedActivities>);
  }, [sortedActivities]);

  const sortedWeeks = Object.keys(activitiesByWeek).sort();

  // Hämta unika veckor för filter
  const availableWeeks = useMemo(() => {
    const weeks = new Set<string>();
    allActivities.forEach(activity => {
      const year = activity.deadline.getFullYear();
      const week = activity.deadlineWeek;
      weeks.add(`${year}-W${week}`);
    });
    return Array.from(weeks).sort();
  }, [allActivities]);

  const statusColors = {
    not_started: 'var(--color-text-tertiary)',
    in_progress: 'var(--color-warning)',
    completed: 'var(--color-success)',
  };

  const handleActivityClick = (productId: string) => {
    setSelectedProduct(productId);
    setViewMode('product');
  };

  return (
    <div className="timeline-view">
      <div className="timeline-header">
        <div>
          <h2>Tidslinje</h2>
          <p className="subtitle">Översikt över alla aktiviteter över tid</p>
        </div>
      </div>

      <div className="timeline-filters">
        <div className="filter-group">
          <label htmlFor="filter-week">Filtrera på vecka:</label>
          <select
            id="filter-week"
            value={filterWeek}
            onChange={(e) => setFilterWeek(e.target.value)}
          >
            <option value="all">Alla veckor</option>
            {availableWeeks.map(weekKey => {
              const [year, week] = weekKey.split('-W');
              return (
                <option key={weekKey} value={weekKey}>
                  {formatWeekYear(parseInt(year), parseInt(week))}
                </option>
              );
            })}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-date">Filtrera på datum:</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              id="filter-date"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{ flex: 1 }}
            />
            {filterDate && (
              <button
                type="button"
                className="clear-filter"
                onClick={() => setFilterDate('')}
                title="Rensa datumfilter"
                style={{ position: 'absolute', right: 'var(--spacing-xs)' }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-assignee">Filtrera på ansvarig:</label>
          <select
            id="filter-assignee"
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
          >
            <option value="all">Alla ansvariga</option>
            <option value="unassigned">Ej tilldelad</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="sort-by">Sortera på:</label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'week' | 'date' | 'assignee')}
          >
            <option value="week">Vecka</option>
            <option value="date">Datum</option>
            <option value="assignee">Ansvarig</option>
          </select>
        </div>

        {(filterWeek !== 'all' || filterDate || filterAssignee !== 'all') && (
          <button
            className="clear-filters"
            onClick={() => {
              setFilterWeek('all');
              setFilterDate('');
              setFilterAssignee('all');
            }}
          >
            Rensa filter
          </button>
        )}
      </div>

      <div className="timeline-stats">
        <span>
          Visar {sortedActivities.length} av {allActivities.length} aktiviteter
        </span>
      </div>

      <div className="timeline-container">
        {sortedWeeks.length === 0 ? (
          <div className="empty-state">
            <p>
              {allActivities.length === 0
                ? 'Inga aktiviteter att visa. Skapa en produkt för att se tidslinjen.'
                : 'Inga aktiviteter matchar de valda filtren. Prova att ändra filterinställningar.'}
            </p>
          </div>
        ) : (
          sortedWeeks.map((weekKey) => {
            const [year, week] = weekKey.split('-W');
            const activities = activitiesByWeek[weekKey];
            const weekDate = new Date(parseInt(year), 0, 1);
            weekDate.setDate(weekDate.getDate() + (parseInt(week) - 1) * 7);

            return (
              <div key={weekKey} className="timeline-week">
                <div className="timeline-week-header">
                  <h3>{formatWeekYear(parseInt(year), parseInt(week))}</h3>
                  <span className="week-date">{formatDate(weekDate)}</span>
                </div>
                <div className="timeline-activities">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="timeline-activity"
                      onClick={() => handleActivityClick(activity.productId)}
                    >
                      <div
                        className="activity-indicator"
                        style={{ backgroundColor: statusColors[activity.status] }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const statuses: Array<'not_started' | 'in_progress' | 'completed'> = 
                            ['not_started', 'in_progress', 'completed'];
                          const currentIndex = statuses.indexOf(activity.status);
                          const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                          updateActivity(activity.productId, activity.id, { status: nextStatus });
                        }}
                        title="Klicka för att ändra status"
                      />
                      <div className="activity-content">
                        <div className="activity-header">
                          <span className="activity-name">{activity.name}</span>
                          <span className="activity-product">{activity.productName}</span>
                        </div>
                        <div className="activity-meta">
                          <span className="activity-category">{activity.category}</span>
                          {activity.assigneeName && (
                            <>
                              <span>•</span>
                              <span>{activity.assigneeName}</span>
                            </>
                          )}
                          <span>•</span>
                          <span
                            className="activity-status"
                            style={{ color: statusColors[activity.status] }}
                          >
                            {activity.status === 'not_started' ? 'Ej påbörjad' :
                             activity.status === 'in_progress' ? 'Pågående' : 'Klart'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

