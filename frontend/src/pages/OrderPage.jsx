import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import ProductList from '../components/order/ProductList';
import Cart from '../components/order/Cart';

export default function OrderPage() {
  const { uid } = useParams();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/products'),
      api.get(`/nfc/${uid}/orders`),
    ])
      .then(([p, o]) => { setProducts(p); setOrders(o); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [uid]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) =>
      prev
        .map((item) => item.product_id === productId ? { ...item, quantity: item.quantity - 1 } : item)
        .filter((item) => item.quantity > 0)
    );
  };

  const submitOrder = async () => {
    try {
      for (const item of cart) {
        await api.post('/orders', {
          guest_uid: uid,
          product_id: item.product_id,
          quantity: item.quantity,
        });
      }
      setCart([]);
      const updatedOrders = await api.get(`/nfc/${uid}/orders`);
      setOrders(updatedOrders);
    } catch (err) {
      alert(err.message || 'Fehler beim Bestellen');
    }
  };

  if (loading) return <div className="p-4 text-center" style={{ color: 'var(--pe-text-sub)' }}>Lade...</div>;

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto pb-48">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-2xl no-underline" style={{ color: 'var(--pe-text-sub)' }}>&larr;</Link>
        <img src="/logo.jpeg" alt="DartEvent" className="h-10" />
      </div>

      <h1
        className="text-xl font-bold mb-6"
        style={{ background: 'var(--pe-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
      >
        Bestellungen
      </h1>

      {orders.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--pe-cyan-bright)' }}>Deine Bestellungen</h2>
          <div className="space-y-2">
            {orders.map((o) => (
              <div
                key={o.id}
                className="flex justify-between items-center p-3 rounded-lg"
                style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}
              >
                <span>{o.product_name} x{o.quantity}</span>
                <span
                  className="text-xs px-2 py-1 rounded-full font-bold"
                  style={{
                    color: o.status === 'paid' ? 'var(--pe-success)' : 'var(--pe-warning)',
                    border: `1px solid ${o.status === 'paid' ? 'var(--pe-success)' : 'var(--pe-warning)'}`,
                  }}
                >
                  {o.status === 'paid' ? 'Bezahlt' : 'Offen'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <ProductList products={products} onAdd={addToCart} />

      {cart.length > 0 && (
        <Cart items={cart} onRemove={removeFromCart} onSubmit={submitOrder} />
      )}
    </div>
  );
}
