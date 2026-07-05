import { Request, Response } from "express";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export async function getSymbolData(req: Request, res: Response) {
  const { symbol } = req.params;

  try {
    const results = await yahooFinance.chart(symbol as string, {
      period1: 0,
      interval: "1d",
      return: "array",
    });
    return res.status(200).json(results);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
