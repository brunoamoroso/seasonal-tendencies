import express from 'express';
import { getSymbolData, searchSymbol } from '../controllers/data-controller';

const dataRoutes = express.Router();

dataRoutes.get('/:symbol', getSymbolData);
dataRoutes.get('/search/:symbol', searchSymbol);

export default dataRoutes;