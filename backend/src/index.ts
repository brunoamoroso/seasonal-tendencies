import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dataRoutes from './routes/data-routes';

dotenv.config({path: '.env.local'});

const app = express();

app.use(cors({credentials: true, origin: process.env.FRONTEND_URL}));

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use("/data", dataRoutes);

app.use((_, res) => {
    res.status(404);
    res.send('Deu 404 aqui');
});

app.listen(process.env.PORT, () => {
    console.log('Server running on port: ' + process.env.PORT);
}) 

export default app;
