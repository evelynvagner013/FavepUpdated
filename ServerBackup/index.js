require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const authRoutes = require('./src/routes/routeAuth');
const propertyRoutes = require('./src/routes/routeProperty');
const productionsRoutes = require('./src/routes/routeProduction');
const financesRoutes = require('./src/routes/routeFinance');
const mercadoPagoRoutes = require('./src/routes/routeMercadoPago');
const contactRoutes = require('./src/routes/routeContact');


app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/property', propertyRoutes);
app.use('/production', productionsRoutes);
app.use('/finance', financesRoutes);
app.use('/mercado-pago', mercadoPagoRoutes);
app.use('/contato', contactRoutes);


app.get('/', (req, res) => {
  res.send('O Servidor está funcionando!');
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});