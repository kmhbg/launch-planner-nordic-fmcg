import React from 'react';
import { useStore } from '../store/store';
import { formatDate, formatWeekYear } from '../utils/timeline';
import './TimelineView.css';

export const TimelineView: React.FC = () => {
  const { products, setSelectedProduct, setViewMode, updateActivity } = useStore();

  // Samla alla aktiviteter från alla produkter
  const allActivities = products.flatMap((product) =>
    product.activities.map((activity) => ({
      ...activity,
      productName: product.name,
      productId: product.id,
      launchWeek: product.launchWeek,
      launchYear: product.launchYear,
    }))
  );

  // Gruppera efter vecka
  const activitiesByWeek = allActivities.reduce((acc, activity) => {
    const weekKey = `${activity.deadline.getFullYear()}-W${activity.deadlineWeek}`;
    if (!acc[weekKey]) {
      acc[weekKey] = [];
    }
    acc[weekKey].push(activity);
    return acc;
  }, {} as Record<string, typeof allActivities>);

  const sortedWeeks = Object.keys(activitiesByWeek).sort();

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
        <h2>Tidslinje</h2>
        <p className="subtitle">Översikt över alla aktiviteter över tid</p>
      </div>

      <div className="timeline-container">
        {sortedWeeks.length === 0 ? (
          <div className="empty-state">
            <p>Inga aktiviteter att visa. Skapa en produkt för att se tidslinjen.</p>
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

