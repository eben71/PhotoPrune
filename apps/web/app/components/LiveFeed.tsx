'use client';

export type FeedEvent = {
  id: string;
  timestamp: string;
  label: string;
};

export function LiveFeed({
  title,
  events
}: {
  title: string;
  events: FeedEvent[];
}) {
  return (
    <section>
      <h2>{title}</h2>
      <p aria-live="polite">Updates refresh automatically.</p>
      <ul>
        {events.length === 0 ? <li>No activity yet.</li> : null}
        {events.map((event) => (
          <li key={event.id}>
            <strong>{new Date(event.timestamp).toLocaleTimeString()}</strong> —{' '}
            {event.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
