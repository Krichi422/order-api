const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors package
const { QuickDB } = require('quick.db'); // Import QuickDB
const app = express();
const port = process.env.PORT || 8000; // API will run on port 8000 by default

// Initialize quick.db specifically for shared order data
// This will connect to the shared 'orders.sqlite' file
const ordersDb = new QuickDB();

// --- CORS Middleware ---
// Allow all origins for development. For production, you should restrict this
// to specific domains where your frontend is hosted, e.g., { origin: 'https://your-framer-site.framer.app' }
app.use(cors());

// Middleware to parse JSON request bodies
app.use(bodyParser.json());
app.use(express.json()); // For Express 4.16+

// --- Database Initialization (for orders, if needed) ---
// This function ensures the 'ordersList' key exists in the shared DB
// It's a safety check; the bot is the primary manager for this list.
async function initializeDatabase() {
    if (!(await ordersDb.has('ordersList'))) {
        await ordersDb.set('ordersList', []);
        console.log('API: Initial ordersList created in shared quick.db (if it didn\'t exist).');
    }
}

// --- API Endpoints ---

// Root endpoint
app.get('/', async (req, res) => {
    /**
     * Root endpoint: Returns a simple welcome message for the Orders API.
     */
    res.json({"status": "Node.js Orders API is running!"});
});

// Get a specific order by ID from the shared orders database
app.get('/orders/:orderId', async (req, res) => {
    /**
     * Returns details of a specific order by its ID from the shared orders.sqlite.
     */
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

// Get all orders from the shared orders database
app.get('/orders', async (req, res) => {
    /**
     * Returns a list of all orders from the shared orders.sqlite.
     */
    try {
        const orders = await ordersDb.get('ordersList');
        res.json(orders || []);
    } catch (error) {
        console.error('API: Error fetching all orders from shared DB:', error);
        res.status(500).json({ error: "Internal server error while fetching orders." });
    }
});


// Echo endpoint (kept for general utility, not tied to specific data)
app.post('/echo', async (req, res) => {
    /**
     * Echoes back the JSON data sent in the request body.
     */
    if (req.body) {
        return res.json(req.body);
    }
    res.status(400).json({"error": "Request must be JSON"});
});

// Start the server after initializing the orders database
initializeDatabase().then(() => {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Node.js Orders API listening at http://0.0.0.0:${port}`);
    });
}).catch(err => {
    console.error('Failed to initialize Orders database:', err);
    process.exit(1); // Exit if database initialization fails
});
