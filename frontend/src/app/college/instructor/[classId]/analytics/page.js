'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bar, Doughnut } from 'react-chartjs-2';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import Link from 'next/link';
import { Activity, Users, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react';

// Register ChartJS modules
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function AnalyticsDashboard() {
  const { classId } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'instructor')) {
      router.push('/dashboard');
    }

    const fetchAnalytics = async () => {
      try {
        const [analyticsRes, classroomRes] = await Promise.all([
          api.get(`/classroom/${classId}/analytics`),
          api.get(`/classroom/${classId}`)
        ]);

        if (analyticsRes.data.success) {
          setAnalytics(analyticsRes.data.analytics);
        }
        if (classroomRes.data.success) {
          setClassroom(classroomRes.data.classroom);
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('FAILED TO RETRIEVE TELEMETRY DATA.');
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === 'instructor') {
      fetchAnalytics();
    }
  }, [classId, user, authLoading, router]);

  if (loading || authLoading) return (
    <div style={{ textAlign: 'center', marginTop: '10rem', fontFamily: 'var(--font-data)' }}>
      <div className="animate-pulse" style={{ color: 'var(--cyan)', fontSize: '1.5rem', letterSpacing: '0.2em' }}>QUERYING NODE DATA...</div>
    </div>
  );

  if (error) return <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--rose)', fontFamily: 'var(--font-data)' }}>{error}</div>;

  const hasData = analytics && (analytics.totalStudents > 0 || analytics.totalQuizzes > 0);

  const barChartData = {
    labels: analytics?.quizAverages?.map(q => q.label) || ['No Data'],
    datasets: [
      {
        label: 'Average Score (%)',
        data: analytics?.quizAverages?.map(q => q.avg) || [0],
        backgroundColor: 'rgba(0, 200, 220, 0.4)',
        borderColor: 'var(--cyan)',
        borderWidth: 1,
        borderRadius: 2
      }
    ]
  };

  const doughnutData = {
    labels: ['Completed', 'Pending'],
    datasets: [
      {
        data: [analytics?.completionRate || 0, 100 - (analytics?.completionRate || 0)],
        backgroundColor: ['rgba(16, 185, 129, 0.6)', 'rgba(55, 65, 81, 0.3)'],
        borderColor: ['var(--emerald)', 'transparent'],
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: 'var(--text-secondary)', font: { family: 'var(--font-data)', size: 10 } } }
    },
    scales: {
      y: { ticks: { color: 'var(--text-muted)', font: { family: 'var(--font-data)' } }, grid: { color: 'rgba(255, 255, 255, 0.03)' }, max: 100 },
      x: { ticks: { color: 'var(--text-muted)', font: { family: 'var(--font-data)' } }, grid: { display: false } }
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '5rem' }}>
      
      <div style={{ marginBottom: '3rem', borderLeft: '4px solid var(--cyan)', paddingLeft: '1.5rem' }}>
        <Link href={`/college/instructor/${classId}`} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
          &larr; BACK TO HUB
        </Link>
        <h1 className="t-h2" style={{ fontSize: '2.5rem', letterSpacing: '-0.02em' }}>TELEMETRY: {classroom?.name}</h1>
        <p className="t-small" style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Real-time evaluation of student nodes and learning efficiency.</p>
      </div>

      {!hasData ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '5rem 2rem', border: '1px solid var(--stroke-2)', borderRadius: 'var(--radius-lg)' }}>
           <Activity size={48} color="var(--text-muted)" style={{ margin: '0 auto 1.5rem', opacity: 0.3 }} />
           <h3 className="t-h4" style={{ marginBottom: '1rem' }}>NO TELEMETRY RECORED</h3>
           <p className="t-small" style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
             Deploy evaluation matrices (quizzes) to begin synthesizing performance data. Currently, there are no recorded attempts for this classroom.
           </p>
        </div>
      ) : (
        <>
          {/* Top Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--emerald)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <TrendingUp size={20} className="text-success" />
                <span className="t-label" style={{ fontSize: '10px' }}>AVG PERFORMANCE</span>
              </div>
              <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)', fontFamily: 'var(--font-data)' }}>{analytics.averageClassScore}%</h3>
            </div>
            
            <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <Users size={20} className="text-accent" />
                <span className="t-label" style={{ fontSize: '10px' }}>ACTIVE NODES</span>
              </div>
              <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)', fontFamily: 'var(--font-data)' }}>{analytics.totalStudents}</h3>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <BookOpen size={20} style={{ color: 'var(--cyan)' }} />
                <span className="t-label" style={{ fontSize: '10px' }}>DEPLOYED MATRICES</span>
              </div>
              <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)', fontFamily: 'var(--font-data)' }}>{analytics.totalQuizzes}</h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
            {/* Main Trend */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
               <h3 className="t-label" style={{ marginBottom: '2rem', color: 'var(--cyan)' }}>EVALUATION TRENDS</h3>
               <div style={{ height: '300px' }}>
                  <Bar data={barChartData} options={chartOptions} />
               </div>
            </div>

            {/* Distribution */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column' }}>
               <h3 className="t-label" style={{ marginBottom: '2rem', color: 'var(--emerald)', textAlign: 'center' }}>COMPLETION MATRIX</h3>
               <div style={{ flex: 1, position: 'relative' }}>
                  <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: 'var(--text-muted)', font: { family: 'var(--font-data)', size: 9 } } } } }} />
               </div>
            </div>
          </div>

          {/* Student Breakdown */}
          <div className="glass-panel" style={{ padding: '0', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--stroke-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="t-label" style={{ color: 'var(--text-primary)' }}>NODE PERFORMANCE BREAKDOWN</h3>
              <div className="badge badge-cyan" style={{ fontSize: '10px' }}>{analytics.studentPerformance?.length || 0} RECORDS</div>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--stroke-1)' }}>
                  <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>NODE IDENTIFIER</th>
                  <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>EXECUTIONS</th>
                  <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>AVG SCORE</th>
                  <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {analytics.studentPerformance?.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>NO PERFORMANCE LOGS DETECTED.</td>
                  </tr>
                ) : (
                  analytics.studentPerformance.map((student, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--stroke-1)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                           <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: 'var(--cyan)' }}>
                             {student.name.charAt(0)}
                           </div>
                           <span style={{ fontWeight: '500' }}>{student.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', fontFamily: 'var(--font-data)', color: 'var(--text-secondary)' }}>
                        {student.completedQuizzes} / {analytics.totalQuizzes}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', fontFamily: 'var(--font-data)', fontWeight: 'bold', color: student.avgScore >= 70 ? 'var(--emerald)' : student.avgScore >= 40 ? 'var(--coin-gold)' : 'var(--rose)' }}>
                        {student.avgScore}%
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        {student.avgScore < 50 ? (
                           <span className="badge badge-red" style={{ fontSize: '10px' }}>REMEDIATION REQUIRED</span>
                        ) : (
                           <span className="badge badge-green" style={{ fontSize: '10px' }}>NOMINAL</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  );
}

