const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const { router: eventRoutes } = require('./routes/event.routes');
const bookingRoutes = require('./routes/booking.routes');
const { errorHandler } = require('./utils/http');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.get('/api/openapi.yaml', (req, res) => res.sendFile(path.join(__dirname, '..', 'docs', 'openapi.yaml')));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(YAML.load(path.join(__dirname, '..', 'docs', 'openapi.yaml'))));
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', bookingRoutes);
app.use((req, res) => res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' } }));
app.use(errorHandler);

module.exports = app;
