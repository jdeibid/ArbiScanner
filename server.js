const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Helper: fetch a single Binance P2P price
async function fetchBinanceP2P(asset) {
    const payload = {
        fiat: asset === 'VES' ? 'VES' : 'USD',
        page: 1,
        rows: 5,
        tradeType: 'BUY',
        asset: 'USDT',
        countries: [],
        proMerchantAds: false,
        shieldMerchantAds: false,
        publisherType: 'merchant',
        payTypes: asset === 'VES' ? [] : [asset],
        classifies: ['mass', 'profession', 'user'],
    };

    const response = await axios.post(
        'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search',
        payload,
        { headers: { 'Content-Type': 'application/json' } }
    );

    const data = response.data;
    if (data.data && data.data.length > 0) {
        return parseFloat(data.data[0].adv.price);
    }
    return 0;
}

// Single aggregated GET endpoint — cached by Vercel's CDN for 20 minutes
app.get('/api/rates', async (req, res) => {
    try {
        // Fetch all sources in parallel
        const [dolarRes, binanceVes, binanceWally, binanceZinli] = await Promise.all([
            axios.get('https://ve.dolarapi.com/v1/dolares/oficial'),
            fetchBinanceP2P('VES'),
            fetchBinanceP2P('WallyTech'),
            fetchBinanceP2P('Zinli'),
        ]);

        const rates = {
            bcv: dolarRes.data.promedio,
            binanceVes,
            binanceWally,
            binanceZinli,
            fetchedAt: new Date().toISOString(),
        };

        // Cache at Vercel's CDN edge for 20 min; serve stale for up to 10 more min while revalidating
        res.setHeader('Cache-Control', 'public, s-maxage=1200, stale-while-revalidate=600');
        res.json(rates);
    } catch (error) {
        console.error('Error fetching rates:', error.message);
        res.status(500).json({ error: 'Failed to fetch rates' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
