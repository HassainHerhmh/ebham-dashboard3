import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({ captains: 0, users: 0, shifts: 0, messages: 0, sent: 0 });

  useEffect(() => {
    Promise.all([
      api.getCaptains(),
      api.getUsers(),
      api.getShifts(),
      api.getMessages(),
      api.getSmsLog(100)
    ]).then(([captains, users, shifts, messages, logs]) => {
      setStats({
        captains: captains.length,
        users: users.length,
        shifts: shifts.filter(s => s.is_active).length,
        messages: messages.filter(m => m.is_active).length,
        sent: logs.length
      });
    });
  }, []);

  return (
    <>
      <div className="page-header">
        <h2>لوحة التحكم</h2>
        <p>مرحباً بك في منصة إبهام</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="number">{stats.users}</div>
          <div className="label">مستخدم</div>
        </div>
        <div className="stat-card">
          <div className="number">{stats.captains}</div>
          <div className="label">كابتن مسجل</div>
        </div>
        <div className="stat-card">
          <div className="number">{stats.shifts}</div>
          <div className="label">دوام نشط</div>
        </div>
        <div className="stat-card">
          <div className="number">{stats.messages}</div>
          <div className="label">رسالة مجدولة</div>
        </div>
        <div className="stat-card">
          <div className="number">{stats.sent}</div>
          <div className="label">رسالة مُرسلة</div>
        </div>
      </div>

    </>
  );
}
