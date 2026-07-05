import express from 'express';
import { getSymbolData } from '../controllers/data-controller';

const dataRoutes = express.Router();

dataRoutes.get('/:symbol', getSymbolData);

export default dataRoutes;