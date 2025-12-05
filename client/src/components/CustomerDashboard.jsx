import React, { useEffect, useState } from 'react';
import { api, API_BASE } from '../api';

const CITIES = ['Tokyo', 'Osaka', 'Nagoya'];
const USD_TO_THB = 35;

export default function CustomerDashboard({ user }) {
    const [form, setForm] = useState({
        recipient_name: '',
        pickup_city: 'Tokyo',
        pickup_address: '',
        drop_city: 'Tokyo',
        drop_address: '',
        contact_phone: ''
    });
    const [quoteTHB, setQuoteTHB] = useState(null);
    const [loadingQuote, setLoadingQuote] = useState(false);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const fetchDeliveries = async () => {
        const res = await api.get('/customer/deliveries');
        setDeliveries(res.data || []);
    };

    useEffect(() => {
        fetchDeliveries().catch(console.error);
    }, []);

    const updateQuote = async (overrides = {}) => {
        const pickup_city = overrides.pickup_city ?? form.pickup_city;
        const drop_city = overrides.drop_city ?? form.drop_city;
        setLoadingQuote(true);
        try {
            const res = await api.get('/customer/pricing', {
                params: { pickup_city, drop_city }
            });
            const thb = res.data.priceTHB ?? Math.round(res.data.priceUSD * USD_TO_THB);
            setQuoteTHB(thb);
        } catch (err) {
            console.error(err);
            setQuoteTHB(null);
        } finally {
            setLoadingQuote(false);
        }
    };

    useEffect(() => {
        updateQuote().catch(console.error);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const next = { ...form, [name]: value };
        setForm(next);

        if (name === 'pickup_city' || name === 'drop_city') {
            updateQuote({ [name]: value }).catch(console.error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const res = await api.post('/customer/deliveries', form);
            const deliveryId = res.data.id;

            // demo auto-pay
            await api.post(`/customer/deliveries/${deliveryId}/pay`);

            setMessage(
                `Delivery created & paid. Order #${deliveryId}, price ${res.data.priceTHB} THB`
            );
            setForm((prev) => ({
                ...prev,
                recipient_name: '',
                pickup_address: '',
                drop_address: '',
                contact_phone: ''
            }));
            await fetchDeliveries();
        } catch (err) {
            console.error(err);
            setMessage('Failed to create delivery');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="layout-two-col" style={{ width: '100%', maxWidth: 1080 }}>
            {/* Create request */}
            <div className="card">
                <div className="badge">Customer Dashboard</div>
                <h2 style={{ marginTop: 10 }}>Create delivery request</h2>

                <form onSubmit={handleCreate} style={{ marginTop: 12 }}>
                    <div className="field">
                        <label>Recipient name</label>
                        <input
                            name="recipient_name"
                            value={form.recipient_name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="field">
                        <label>Pickup city</label>
                        <select
                            name="pickup_city"
                            value={form.pickup_city}
                            onChange={handleChange}
                        >
                            {CITIES.map((c) => (
                                <option key={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div className="field">
                        <label>Pickup address</label>
                        <input
                            name="pickup_address"
                            value={form.pickup_address}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="field">
                        <label>Drop city</label>
                        <select
                            name="drop_city"
                            value={form.drop_city}
                            onChange={handleChange}
                        >
                            {CITIES.map((c) => (
                                <option key={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div className="field">
                        <label>Drop address</label>
                        <input
                            name="drop_address"
                            value={form.drop_address}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="field">
                        <label>Contact phone</label>
                        <input
                            name="contact_phone"
                            value={form.contact_phone}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div
                        style={{
                            marginBottom: 14,
                            padding: 10,
                            borderRadius: 12,
                            border: '1px dashed rgba(148,163,184,0.7)',
                            background: 'rgba(15,23,42,0.7)'
                        }}
                    >
                        <div style={{ fontSize: 12, opacity: 0.8 }}>Estimated price</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>
                            {loadingQuote
                                ? 'Calculating...'
                                : quoteTHB !== null
                                    ? `${quoteTHB} THB`
                                    : 'N/A'}
                        </div>
                    </div>

                    {message && (
                        <div style={{ fontSize: 13, marginBottom: 8 }}>{message}</div>
                    )}

                    <button className="btn" type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create & pay'}
                    </button>
                </form>
            </div>

            {/* Track deliveries */}
            <div className="card">
                <div className="badge">Track deliveries</div>
                <h3 style={{ marginTop: 10 }}>Your recent orders</h3>
                <div className="list">
                    {deliveries.map((d) => (
                        <div key={d.id} className="list-item">
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: 4
                                }}
                            >
                                <span style={{ fontWeight: 600 }}>#{d.id}</span>
                                <span className="status">{d.status}</span>
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.8 }}>
                                To: {d.recipient_name}
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.8 }}>
                                {d.pickup_city} → {d.drop_city}
                            </div>
                            <div style={{ fontSize: 12, marginTop: 4 }}>
                                Price:{' '}
                                <strong>
                                    {Math.round(d.price * USD_TO_THB)} THB
                                </strong>{' '}
                                · Payment: {d.payment_status}
                            </div>

                            {d.proof_of_delivery && (
                                <div
                                    style={{
                                        marginTop: 6,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 4
                                    }}
                                >
                                    <div style={{ fontSize: 11, opacity: 0.7 }}>
                                        Proof of delivery:
                                    </div>
                                    <img
                                        src={d.proof_of_delivery}
                                        alt="Proof of delivery"
                                        style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: 8,
                                            objectFit: 'cover',
                                            border: '1px solid rgba(148,163,184,0.6)'
                                        }}
                                    />
                                </div>
                            )}

                        </div>
                    ))}
                    {deliveries.length === 0 && (
                        <p style={{ fontSize: 13, opacity: 0.8 }}>
                            You don&apos;t have any deliveries yet.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
