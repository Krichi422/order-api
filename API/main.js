const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { QuickDB } = require('quick.db');
const app = express();
const port = process.env.PORT || 8000;

const ordersDb = new QuickDB();

const corsOptions = {
  origin: 'https://krichi.xyz',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
    const referer = req.headers.referer;

    console.log(`Incoming Referer: ${referer || 'None'}`);

    if (!referer) {
        if (req.method === 'OPTIONS') {
            return next();
        }
        console.warn('Referer header missing for non-OPTIONS request.');
        return res.status(403).json({ message: 'Forbidden: Referer header missing.' });
    }

    try {
        const refererUrl = new URL(referer);
        if (refererUrl.hostname === 'krichi.xyz') {
            next();
        } else {
            // Referer is not from the allowed domain, block
            console.warn(`Blocked request from disallowed referer: ${referer}`);
            res.status(403).json({ message: 'Forbidden: Invalid Referer.' });
        }
    } catch (e) {
        // Handle cases where the referer header might not be a valid URL
        console.error(`Error parsing Referer header: ${referer}`, e);
        res.status(403).json({ message: 'Forbidden: Malformed Referer.' });
    }
});

app.use(bodyParser.json());
app.use(express.json());

async function initializeDatabase() {
    if (!(await ordersDb.has('ordersList'))) {
        await ordersDb.set('ordersList', []);
        console.log('API: Initial ordersList created in shared quick.db (if it didn\'t exist).');
    }
}

app.get('/', async (req, res) => {
    res.json({"status": "Hi!"});
});

app.get('/orders/:orderId', async (req, res) => {
    const orderId = req.params.orderId;
    try {
        const allOrders = await ordersDb.get('ordersList');
        if (!allOrders || allOrders.length === 0) {
            return res.status(404).json({ error: "No orders found in the database." });
        }

        const foundOrder = allOrders.find(order => order.orderId === orderId);

        if (!foundOrder) {
            return res.status(404).json({ error: `Order with ID '${orderId}' not found.` });
        }
        res.json(foundOrder);
    } catch (error) {
        console.error(`API: Error fetching order ${orderId} from shared DB:`, error);
        res.status(500).json({ error: "Internal server error while fetching order." });
    }
});

app.get('/orders', async (req, res) => {
    try {
        const orders = await ordersDb.get('ordersList');
        res.json(orders || []);
    } catch (error) {
        console.error('API: Error fetching all orders from shared DB:', error);
        res.status(500).json({ error: "Internal server error while fetching orders." });
    }
});

app.post('/echo', async (req, res) => {
    if (req.body) {
        return res.json(req.body);
    }
    res.status(400).json({"error": "Request must be JSON"});
});


initializeDatabase().then(() => {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Node.js Orders API listening at http://0.0.0.0:${port}`);
    });
}).catch(err => {
    console.error('Failed to initialize Orders database:', err);
    process.exit(1);
});
