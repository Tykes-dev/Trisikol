import Button from '../../components/common/Button';

export default function NotificationInbox({ result }) {
  const { inbox, busy, error, mark } = result;
  return <section aria-label="Saved notifications">
    <p><small>Saved in-app alerts refresh while this app is open. Background push and SMS are not connected.</small></p>
    {error && <p role="alert">{error} <button onClick={result.refresh}>Retry notifications</button></p>}
    {!inbox && !error && <p role="status">Loading notifications…</p>}
    {inbox && <><p role="status">{inbox.unreadCount} unread notifications</p>
      <Button disabled={busy || !inbox.unreadCount} onClick={() => mark()}>Mark all as read</Button>
      {inbox.items.length === 0 && <p>No notifications yet. New trip events will appear here.</p>}
      {inbox.items.map(item => <article className="workspace-card" key={item.id} style={{ marginTop: 16 }}>
        <div className="section-title"><h3>{item.title}</h3><span className="status-badge">{item.readAt ? 'Read' : 'Unread'}</span></div>
        <p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString()}</small>
        {!item.readAt && <Button disabled={busy} onClick={() => mark(item.id)}>Mark notification #{item.id} as read</Button>}
      </article>)}</>}
  </section>;
}
