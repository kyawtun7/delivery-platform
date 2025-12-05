import React, { useEffect, useState } from 'react';
import { api, API_BASE } from '../api';

export default function CourierDashboard({ user }) {
  const [available, setAvailable] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [withdrawTHB, setWithdrawTHB] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    const [a, m, e] = await Promise.all([
      api.get('/courier/jobs/available'),
      api.get('/courier/jobs/my'),
      api.get('/courier/earnings')
    ]);
    setAvailable(a.data || []);
    setMyJobs(m.data || []);
    setEarnings(e.data || null);
  };

  useEffect(() => {
    loadAll().catch(console.error);
  }, []);

  const acceptJob = async (id) => {
    try {
      setLoading(true);
      setMsg('');
      const res = await api.post(`/courier/jobs/${id}/accept`);
      setMsg(`Job accepted. Earned ${res.data.earnedTHB} THB.`);
      await loadAll();
    } catch (err) {
      console.error(err);
      setMsg(err.response?.data?.message || 'Failed to accept job');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      setLoading(true);
      setMsg('');
      await api.patch(`/courier/jobs/${id}/status`, { status });
      await loadAll();
    } catch (err) {
      console.error(err);
      setMsg('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const deliverWithProof = async (id) => {
    if (!proofFile) {
      alert('Please choose a proof image first.');
      return;
    }
    try {
      setLoading(true);
      setMsg('');
      const formData = new FormData();
      formData.append('proof', proofFile);
      const res = await api.post(`/courier/jobs/${id}/deliver`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMsg(res.data.message || 'Successfully delivered');
      setProofFile(null);
      await loadAll();
    } catch (err) {
      console.error(err);
      setMsg(err.response?.data?.message || 'Failed to mark delivered');
    } finally {
      setLoading(false);
    }
  };

  const withdraw = async () => {
    const amountTHB = Number(withdrawTHB);
    if (!amountTHB || amountTHB <= 0) {
      alert('Enter withdraw amount in THB.');
      return;
    }
    try {
      setLoading(true);
      setMsg('');
      const res = await api.post('/courier/withdraw', { amountTHB });
      setMsg(`Withdrawal successful: ${res.data.withdrawnTHB} THB`);
      setWithdrawTHB('');
      await loadAll();
    } catch (err) {
      console.error(err);
      setMsg(err.response?.data?.message || 'Withdraw failed');
    } finally {
      setLoading(false);
    }
  };

  const balanceTHB = earnings?.balanceTHB ?? 0;

  return (
    <div className="layout-two-col" style={{ width: '100%', maxWidth: 1080 }}>
      {/* LEFT: available jobs */}
      <div className="card">
        <div className="badge">Courier Dashboard</div>
        <h2 style={{ marginTop: 10 }}>Available jobs</h2>
        <p style={{ fontSize: 13, opacity: 0.8 }}>
          Paid delivery requests waiting for a courier.
        </p>

        <div className="list">
          {available.map((job) => (
            <div className="list-item" key={job.id}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4
                }}
              >
                <span style={{ fontWeight: 600 }}>#{job.id}</span>
                <span className="status">{job.status}</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {job.pickup_city} → {job.drop_city}
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Payout:{' '}
                <strong>
                  {Math.round(job.price * 0.8 * 35)} THB
                </strong>
              </div>
              {job.status === 'pending' && (
                <button
                  className="btn"
                  style={{ marginTop: 6 }}
                  disabled={loading}
                  onClick={() => acceptJob(job.id)}
                >
                  Accept job
                </button>
              )}
            </div>
          ))}
          {available.length === 0 && (
            <p style={{ fontSize: 13, opacity: 0.8 }}>
              No open jobs right now.
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: my jobs + earnings */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 10
          }}
        >
          <div>
            <div className="badge">Jobs & earnings</div>
            <h2 style={{ marginTop: 10 }}>My jobs</h2>
          </div>
          <div
            style={{
              textAlign: 'right',
              padding: 10,
              borderRadius: 12,
              border: '1px solid rgba(148,163,184,0.5)',
              minWidth: 150
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.7 }}>Balance</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {balanceTHB.toFixed(0)} THB
            </div>
          </div>
        </div>

        {msg && (
          <div style={{ fontSize: 13, marginBottom: 8, minHeight: 18 }}>
            {msg}
          </div>
        )}

        <div className="list">
          {myJobs.map((job) => (
            <div className="list-item" key={job.id}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4
                }}
              >
                <span style={{ fontWeight: 600 }}>#{job.id}</span>
                <span className="status">{job.status}</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {job.pickup_city} → {job.drop_city}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Contact: {job.contact_phone}
              </div>

              {/* 3-step flow */}
              {job.status !== 'delivered' && (
                <div
                  style={{
                    marginTop: 6,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6
                  }}
                >
                  {job.status === 'accepted' && (
                    <button
                      className="btn secondary"
                      disabled={loading}
                      onClick={() => updateStatus(job.id, 'picked_up')}
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      Pick up
                    </button>
                  )}

                  {job.status === 'picked_up' && (
                    <button
                      className="btn secondary"
                      disabled={loading}
                      onClick={() => updateStatus(job.id, 'in_transit')}
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      In transit
                    </button>
                  )}

                  {job.status === 'in_transit' && (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProofFile(e.target.files[0])}
                        style={{ fontSize: 11 }}
                      />
                      <button
                        className="btn"
                        disabled={loading}
                        onClick={() => deliverWithProof(job.id)}
                        style={{ fontSize: 11, padding: '4px 10px' }}
                      >
                        Delivered + proof
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Proof display when delivered */}
              {job.status === 'delivered' && job.proof_of_delivery && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    Proof of delivery
                  </div>
                  <img
                    src={`${API_BASE}${job.proof_of_delivery}`}
                    alt="Proof of delivery"
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 8,
                      objectFit: 'cover',
                      border: '1px solid rgba(148,163,184,0.6)',
                      marginTop: 4
                    }}
                  />
                </div>
              )}
            </div>
          ))}

          {myJobs.length === 0 && (
            <p style={{ fontSize: 13, opacity: 0.8 }}>
              You haven&apos;t accepted any jobs yet.
            </p>
          )}
        </div>

        {/* Withdraw */}
        <div style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 6 }}>Withdraw earnings</h3>
          <p style={{ fontSize: 12, opacity: 0.8 }}>
            Enter the amount you want to withdraw in THB.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Amount THB"
              value={withdrawTHB}
              onChange={(e) => setWithdrawTHB(e.target.value)}
              style={{ maxWidth: 160 }}
            />
            <button
              className="btn"
              onClick={withdraw}
              disabled={loading || balanceTHB <= 0}
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
