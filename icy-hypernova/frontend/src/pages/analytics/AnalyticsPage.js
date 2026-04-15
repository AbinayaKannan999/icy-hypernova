import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend
);

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [timeData, setTimeData] = useState(null);
  const [catData, setCatData] = useState(null);
  const [boardData, setBoardData] = useState({ topDonors: [], topVolunteers: [] });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [timeRes, catRes, boardRes] = await Promise.all([
          analyticsAPI.getDonationsOverTime({ period: 30 }),
          analyticsAPI.getFoodByCategory(),
          analyticsAPI.getLeaderboard()
        ]);

        const tData = timeRes.data.data.chart;
        setTimeData({
          labels: tData.map(d => new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
          datasets: [
            {
              label: 'Donations Over Time',
              data: tData.map(d => d.donations),
              borderColor: '#7c3aed',
              backgroundColor: 'rgba(124, 58, 237, 0.1)',
              tension: 0.4,
              fill: true,
            }
          ]
        });

        const cData = catRes.data.data.chart;
        setCatData({
          labels: cData.map(d => d.food_type.replace('_', ' ').toUpperCase()),
          datasets: [{
            data: cData.map(d => parseInt(d.count)),
            backgroundColor: ['#7c3aed', '#f59e0b', '#10b981', '#0ea5e9', '#ec4899', '#f97316', '#64748b']
          }]
        });

        setBoardData(boardRes.data.data);
      } catch (err) {
        toast.error('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Impact Analytics</h1>
          <p className="page-subtitle">Track the platform's food saving impact over time</p>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gap: '24px', marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Donations Trend (Last 30 Days)</h3>
          </div>
          <div style={{ height: 300 }}>
            {timeData && <Line data={timeData} options={{ responsive: true, maintainAspectRatio: false }} />}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Donations by Category</h3>
          </div>
          <div style={{ height: 300, display: 'flex', justifyContent: 'center' }}>
            {catData && <Doughnut data={catData} options={{ responsive: true, maintainAspectRatio: false, cutout: '65%' }} />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gap: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🏆 Top Donors</h3>
          </div>
          <div className="table-container border-0 line-none">
            <table className="table">
              <thead><tr><th>Name</th><th>Donations</th><th>City</th></tr></thead>
              <tbody>
                {boardData.topDonors.map((d, i) => (
                  <tr key={d.id}>
                    <td className="font-semibold flex items-center gap-2">
                      <span className="text-xl">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
                      {d.name}
                    </td>
                    <td className="text-primary font-bold">{d.donations_count}</td>
                    <td className="text-gray-500">{d.city}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🚚 Top Volunteers</h3>
          </div>
          <div className="table-container border-0 line-none">
            <table className="table">
              <thead><tr><th>Name</th><th>Deliveries</th><th>Rating</th></tr></thead>
              <tbody>
                {boardData.topVolunteers.map((v, i) => (
                  <tr key={v.id}>
                    <td className="font-semibold flex items-center gap-2">
                      <span className="text-xl">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
                      {v.name}
                    </td>
                    <td className="text-success font-bold">{v.deliveries_count}</td>
                    <td className="text-warning">⭐ {parseFloat(v.avg_rating).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
