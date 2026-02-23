document.addEventListener('DOMContentLoaded', () => {
    fetchRates();

    document.getElementById('calculate-btn').addEventListener('click', calculate);
    document.getElementById('platform').addEventListener('change', updateBinanceMargin);
});

function updateBinanceMargin() {
    const platform = document.getElementById('platform').value;
    const marginInput = document.getElementById('binance-margin');
    if (marginInput) {
        if (platform === 'zinli') {
            marginInput.textContent = `$${rates.binanceZinli}`;
        } else {
            marginInput.textContent = `$${rates.binanceWally}`;
        }
    }
}

let rates = {
    bcv: 0,
    binanceVes: 0,
    binanceWally: 0,
    binanceZinli: 0
};

async function fetchRates() {
    try {
        const res = await fetch('/api/rates');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        rates.bcv = data.bcv;
        rates.binanceVes = data.binanceVes;
        rates.binanceWally = data.binanceWally;
        rates.binanceZinli = data.binanceZinli;

        document.getElementById('bcv-rate').textContent = `Bs. ${rates.bcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('binance-ves-rate').textContent = `Bs. ${rates.binanceVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('binance-wallytech-rate').textContent = `$${rates.binanceWally.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
        document.getElementById('binance-zinli-rate').textContent = `$${rates.binanceZinli.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

        // Show when rates were last fetched (may be from CDN cache)
        if (data.fetchedAt) {
            const fetchedDate = new Date(data.fetchedAt);
            const timeStr = fetchedDate.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
            const el = document.getElementById('last-updated');
            if (el) el.textContent = `Actualizado: ${timeStr}`;
        }

        updateBinanceMargin();
    } catch (err) {
        console.error('Error fetching rates', err);
    }
}

function calculate() {
    updateBinanceMargin();
    const amount = parseFloat(document.getElementById('amount').value);
    const platform = document.getElementById('platform').value;
    const margin = platform === 'zinli' ? rates.binanceZinli : rates.binanceWally;

    let platformCommRate = platform === 'zinli' ? 0.0375 : 0.0299; // 3.75% or 2.99%
    let cardCommRate = 0.028; // 2.8%
    let taxRate = 0.07; // 7% of platform commission

    // Calculate Platform Commission
    const platformComm = amount * platformCommRate;
    document.getElementById('result-platform-comm').textContent = `$${platformComm.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Calculate Tax
    const tax = platformComm * taxRate;
    document.getElementById('result-tax').textContent = `$${tax.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Calculate Card Commission
    const cardComm = (amount + platformComm + tax) * cardCommRate;
    document.getElementById('result-card-comm').textContent = `$${cardComm.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Total Value
    const totalValue = amount + platformComm + tax + cardComm;
    document.getElementById('result-total-value').textContent = `$${totalValue.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Total Amount in Binance = Total Value - difference of the pair in Binance
    const totalAmountBinance = (amount / margin) - 0.05;
    document.getElementById('result-amount-binance').textContent = `$${totalAmountBinance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Real Amount
    let realAmount = 0;
    if (totalValue > 0) {
        realAmount = totalAmountBinance / totalValue;
    }
    document.getElementById('result-real-amount').textContent = `${(realAmount * 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

    // Spread (VES rate in Binance - Official Rate)
    const spread = (rates.binanceVes * realAmount) - rates.bcv;
    document.getElementById('result-spread').textContent = `Bs. ${spread.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    console.log(realAmount);

    // Total in VES at Binance
    const totalProfit = (totalAmountBinance * rates.binanceVes.toFixed(2)) - 0.05;
    document.getElementById('result-profit').textContent = `Bs. ${totalProfit.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Bcv Equivalent
    const bcvEquivalent = totalProfit / rates.bcv;
    document.getElementById('bcv-equivalent').textContent = `$${bcvEquivalent.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Update comparison rates
    const bcvTotal = amount * rates.bcv;
    document.getElementById('bcv-total').textContent = `Bs. ${bcvTotal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('binance-ves-total').textContent = `$${(bcvTotal / (totalProfit / amount)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
