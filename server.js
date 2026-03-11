const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

// Security Middleware
app.use(helmet()); 
app.use(cors());
app.use(express.json());

// 1. Basic Health Check
app.get('/api/status', (req, res) => {
    res.json({ system: "Global Wakili", status: "Active", compliance: "LSK/KRA Ready" });
});

// 2. M-Pesa STK Push Endpoint (Integration Bridge)
app.post('/api/payments/stk-push', async (req, res) => {
    const { amount, phoneNumber, matterId } = req.body;
    try {
        // Logic for Daraja API integration would go here
        console.log(`Initiating KES ${amount} payment for Matter: ${matterId}`);
        res.status(200).json({ message: "STK Push Initiated Successfully" });
    } catch (error) {
        res.status(500).json({ error: "Payment Gateway Error" });
    }
});

// 3. Client Portal: Fetch Matter Status
app.get('/api/portal/matter/:id', async (req, res) => {
    const { id } = req.params;
    const matter = await prisma.matter.findUnique({
        where: { id: id },
        include: { events: true, documents: true }
    });
    res.json(matter);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Global Wakili Server running on port ${PORT}`);
});